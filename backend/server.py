import json
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

app = FastAPI()

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

# Bedrock runtime region: BEDROCK_REGION overrides DEFAULT_AWS_REGION (e.g. us-east-1 for higher quotas)
_bedrock_region = os.getenv("BEDROCK_REGION") or os.getenv("DEFAULT_AWS_REGION", "eu-west-1")
bedrock_client = boto3.client(
    service_name="bedrock-runtime",
    region_name=_bedrock_region,
)

# Bedrock model selection - see Q42 on https://edwarddonner.com/faq for more
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "global.amazon.nova-2-lite-v1:0")

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


def call_bedrock(conversation: List[Dict], user_message: str) -> str:
    """Call AWS Bedrock with conversation history.

    Converse API requires strict user/assistant alternation.
    System prompt must use the ``system`` parameter, not a fake user message.
    """
    messages = []

    # Add conversation history with strict alternation (merge consecutive same-role turns)
    for msg in conversation[-50:]:
        role = msg.get("role")
        if role not in ("user", "assistant"):
            continue
        text = (msg.get("content") or "").strip()
        if not text:
            continue
        if messages and messages[-1]["role"] == role:
            # merge consecutive same-role turns
            messages[-1]["content"] = [{"text": messages[-1]["content"][0]["text"] + "\n\n" + text}]
        else:
            messages.append({"role": role, "content": [{"text": text}]})

    # Converse must not have two consecutive "user" turns. Incomplete S3 history
    # (last message is user with no assistant reply) would cause that — drop it.
    while messages and messages[0]["role"] == "assistant":
        messages.pop(0)
    if messages and messages[-1]["role"] == "user":
        messages.pop()

    messages.append({"role": "user", "content": [{"text": user_message.strip()}]})

    try:
        print(
            f"[bedrock] model={BEDROCK_MODEL_ID} region={_bedrock_region} "
            f"turns={len(messages)}"
        )
        response = bedrock_client.converse(
            modelId=BEDROCK_MODEL_ID,
            messages=messages,
            system=[{"text": prompt()}],
            inferenceConfig={"maxTokens": 2000, "temperature": 0.7, "topP": 0.9},
        )

        blocks = response.get("output", {}).get("message", {}).get("content") or []
        out = "".join(b["text"] for b in blocks if "text" in b)
        usage = response.get("usage") or {}
        print(f"[bedrock] ok out_len={len(out)} usage={usage}")
        return out

    except ClientError as e:
        error_code = e.response["Error"]["Code"]
        if error_code == "ValidationException":
            aws_msg = e.response.get("Error", {}).get("Message", str(e))
            print(f"Bedrock validation error: {aws_msg}")
            raise HTTPException(
                status_code=400, detail=f"Bedrock validation: {aws_msg}"
            )
        elif error_code == "AccessDeniedException":
            print(f"Bedrock access denied: {e}")
            raise HTTPException(
                status_code=403, detail="Access denied to Bedrock model"
            )
        else:
            print(f"Bedrock error: {e}")
            raise HTTPException(status_code=500, detail=f"Bedrock error: {str(e)}")


@app.get("/")
async def root():
    return {
        "message": "AI Digital Twin API (Powered by AWS Bedrock)",
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
        "bedrock_region": _bedrock_region,
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Generate session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())
        print(f"[chat] session={session_id} msg_len={len(request.message or '')}")

        # Load conversation history
        conversation = load_conversation(session_id)

        # Call Bedrock for response
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

        print(f"[chat] saved session={session_id}")
        return ChatResponse(response=assistant_response, session_id=session_id)

    except HTTPException as e:
        print(f"[chat] HTTPException {e.status_code}: {e.detail}")
        raise
    except Exception as e:
        print(f"[chat] Error: {repr(e)}")
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
