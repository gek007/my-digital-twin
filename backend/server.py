import json
import logging
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional

import boto3
from botocore.exceptions import ClientError
from context import prompt
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)
if not logging.getLogger().handlers:
    logging.basicConfig(level=logging.INFO)

app = FastAPI()

# Configure CORS — API Gateway handles CORS in production,
# so use permissive origins on Lambda to avoid double-validation.
_is_lambda = bool(os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
_cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
origins = (
    ["*"] if _is_lambda else [o.strip() for o in _cors_raw.split(",") if o.strip()]
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def _bedrock_region() -> str:
    """Region for bedrock-runtime client.

    Order: BEDROCK_REGION (explicit) → AWS_REGION (Lambda / CLI) → DEFAULT_AWS_REGION → us-east-1.

    Important: ``eu.*`` inference profiles must be called from an EU Bedrock endpoint (e.g. eu-west-1).
    If ``DEFAULT_AWS_REGION=us-east-1`` was set on Lambda while using ``eu.amazon.*``, Bedrock returns
    "The provided model identifier is invalid." Prefer leaving ``DEFAULT_AWS_REGION`` unset on Lambda
    so ``AWS_REGION`` matches your function region.
    """
    explicit = (os.getenv("BEDROCK_REGION") or "").strip()
    if explicit:
        return explicit
    return (
        (os.getenv("AWS_REGION") or "").strip()
        or (os.getenv("DEFAULT_AWS_REGION") or "").strip()
        or "us-east-1"
    )


bedrock_runtime = boto3.client("bedrock-runtime", region_name=_bedrock_region())

# Inference profile ID (must match AWS exactly — see Bedrock console / inference profiles).
# Invalid combo: global.amazon.nova-lite-v1:0 (no such global profile for Nova Lite v1).
# Examples: global.amazon.nova-2-lite-v1:0 | eu.amazon.nova-lite-v1:0 (EU) | us.amazon.nova-lite-v1:0
BEDROCK_MODEL_ID = (os.getenv("BEDROCK_MODEL_ID") or "global.amazon.nova-2-lite-v1:0").strip()

logger.info(
    "Bedrock client: region=%s model_id=%s",
    _bedrock_region(),
    BEDROCK_MODEL_ID,
)

# Memory storage configuration
USE_S3 = os.getenv("USE_S3", "false").lower() == "true"
S3_BUCKET = os.getenv("S3_BUCKET", "")
MEMORY_DIR = os.getenv("MEMORY_DIR", "../memory")

# Initialize S3 client if needed
if USE_S3:
    s3_client = boto3.client("s3")


# Request/Response models
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


class Message(BaseModel):
    role: str
    content: str
    timestamp: str


# Memory management functions
def get_memory_path(session_id: str) -> str:
    return f"{session_id}.json"


def load_conversation(session_id: str) -> List[Dict]:
    """Load conversation history from storage"""
    if USE_S3:
        try:
            response = s3_client.get_object(
                Bucket=S3_BUCKET, Key=get_memory_path(session_id)
            )
            return json.loads(response["Body"].read().decode("utf-8"))
        except ClientError as e:
            if e.response["Error"]["Code"] == "NoSuchKey":
                return []
            raise
    else:
        # Local file storage
        file_path = os.path.join(MEMORY_DIR, get_memory_path(session_id))
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                return json.load(f)
        return []


def save_conversation(session_id: str, messages: List[Dict]):
    """Save conversation history to storage"""
    if USE_S3:
        s3_client.put_object(
            Bucket=S3_BUCKET,
            Key=get_memory_path(session_id),
            Body=json.dumps(messages, indent=2),
            ContentType="application/json",
        )
    else:
        # Local file storage
        os.makedirs(MEMORY_DIR, exist_ok=True)
        file_path = os.path.join(MEMORY_DIR, get_memory_path(session_id))
        with open(file_path, "w") as f:
            json.dump(messages, f, indent=2)


def _extract_assistant_text(response: Dict) -> str:
    """Collect plain text from Converse output (handles multiple content blocks)."""
    blocks = response.get("output", {}).get("message", {}).get("content", [])
    parts: List[str] = []
    for block in blocks:
        if isinstance(block, dict) and "text" in block:
            parts.append(block["text"])
    if not parts:
        logger.error(
            "Unexpected Bedrock response shape: %s", json.dumps(response)[:4000]
        )
        raise ValueError("Bedrock returned no text content")
    return "\n".join(parts)


def call_bedrock(conversation: List[Dict], user_message: str) -> str:
    """Call Bedrock Converse API with system prompt and recent history."""
    messages: List[Dict] = []
    for msg in conversation[-10:]:
        messages.append(
            {
                "role": msg["role"],
                "content": [{"text": msg["content"]}],
            }
        )
    messages.append(
        {"role": "user", "content": [{"text": user_message}]},
    )

    try:
        response = bedrock_runtime.converse(
            modelId=BEDROCK_MODEL_ID,
            messages=messages,
            system=[{"text": prompt()}],
            inferenceConfig={
                "maxTokens": 2000,
                "temperature": 0.7,
                "topP": 0.9,
            },
        )
        return _extract_assistant_text(response)
    except ClientError as e:
        err = e.response.get("Error", {})
        error_code = err.get("Code", "Unknown")
        error_msg = err.get("Message", str(e))
        logger.error(
            "Bedrock ClientError code=%s message=%s response=%s",
            error_code,
            error_msg,
            json.dumps(e.response)[:4000],
        )
        if error_code == "ValidationException":
            hint = ""
            low = error_msg.lower()
            if "inference profile" in low:
                hint = (
                    " Use an inference profile id (not raw amazon.*). "
                    "Try global.amazon.nova-2-lite-v1:0 or eu.amazon.nova-lite-v1:0 in eu-west-1."
                )
            elif "invalid" in low and "model" in low:
                hint = (
                    " Check BEDROCK_MODEL_ID (e.g. eu.amazon.nova-lite-v1:0 or global.amazon.nova-2-lite-v1:0) "
                    f"and that Bedrock region ({_bedrock_region()}) matches the profile "
                    "(eu.* needs an EU region — remove DEFAULT_AWS_REGION=us-east-1 on Lambda if set)."
                )
            raise HTTPException(
                status_code=400,
                detail=f"Bedrock validation: {error_msg}{hint}",
            ) from e
        if error_code == "AccessDeniedException":
            raise HTTPException(
                status_code=403,
                detail="Access denied to Bedrock (check IAM role/policy).",
            ) from e
        if error_code == "ResourceNotFoundException":
            raise HTTPException(
                status_code=400,
                detail=(
                    f"Model or inference profile not found: {BEDROCK_MODEL_ID} in "
                    f"{_bedrock_region()}. Set BEDROCK_MODEL_ID (e.g. eu.amazon.nova-2-lite-v1:0) "
                    "or DEFAULT_AWS_REGION to a region where this model is available."
                ),
            ) from e
        raise HTTPException(
            status_code=502,
            detail=f"Bedrock error ({error_code}): {error_msg}",
        ) from e


@app.get("/")
async def root():
    return {
        "message": "AI Digital Twin API (AWS Bedrock)",
        "memory_enabled": True,
        "storage": "S3" if USE_S3 else "local",
        "ai_model": BEDROCK_MODEL_ID,
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "use_s3": USE_S3,
        "bedrock_model": BEDROCK_MODEL_ID,
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Generate session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())

        # Load conversation history
        conversation = load_conversation(session_id)

        assistant_response = call_bedrock(conversation, request.message)

        # Update conversation history
        conversation.append(
            {
                "role": "user",
                "content": request.message,
                "timestamp": datetime.now().isoformat(),
            }
        )
        conversation.append(
            {
                "role": "assistant",
                "content": assistant_response,
                "timestamp": datetime.now().isoformat(),
            }
        )

        # Save conversation
        save_conversation(session_id, conversation)

        return ChatResponse(response=assistant_response, session_id=session_id)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Error in chat endpoint")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/conversation/{session_id}")
async def get_conversation(session_id: str):
    """Retrieve conversation history"""
    try:
        conversation = load_conversation(session_id)
        return {"session_id": session_id, "messages": conversation}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
