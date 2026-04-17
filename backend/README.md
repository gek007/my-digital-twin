# Backend — AI Digital Twin API

A FastAPI backend that powers the AI Digital Twin chat. It uses **Amazon Bedrock** (Converse API) to generate responses based on a custom personality profile (`me.txt`) and persists conversation history as JSON files in the `../memory` directory (or S3 when configured).

## Getting Started

Make sure you have Python 3.13+ and [uv](https://docs.astral.sh/uv/) installed, then run:

```bash
uv sync
uv run server.py
```

Or with pip:

```bash
pip install -r requirements.txt
python server.py
```

The server starts at [http://localhost:8000](http://localhost:8000). API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs).

**Local AWS credentials:** configure the AWS CLI (`aws configure`) or set environment variables so `boto3` can call Bedrock (`bedrock:InvokeModel` / Converse). On Lambda, attach an execution role with Bedrock permissions.

## Environment Variables

Copy `.env.example` to `.env` and adjust. Common options:

- `BEDROCK_MODEL_ID` — inference profile id (e.g. `eu.amazon.nova-lite-v1:0` or `global.amazon.nova-2-lite-v1:0`)
- Bedrock **region** (in order): `BEDROCK_REGION` → `AWS_REGION` (Lambda sets this) → `DEFAULT_AWS_REGION` → `us-east-1`

**Lambda in the EU:** If you use an `eu.*` profile, the Bedrock client must use an **EU** endpoint. Do **not** set `DEFAULT_AWS_REGION=us-east-1` on the function unless you also use a matching model id; otherwise Bedrock may return “The provided model identifier is invalid.” Remove `DEFAULT_AWS_REGION` so `AWS_REGION` (e.g. `eu-west-1`) is used, or set `BEDROCK_REGION=eu-west-1`.

- `CORS_ORIGINS` — comma-separated origins for local dev
