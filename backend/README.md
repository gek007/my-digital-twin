# Backend — AI Digital Twin API

A FastAPI backend that powers the AI Digital Twin chat. It uses OpenAI's GPT-4o-mini to generate responses based on a custom personality profile (`me.txt`) and persists conversation history as JSON files in the `../memory` directory.

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

## Environment Variables

Create a `.env` file in this directory with:

```
OPENAI_API_KEY=your-key-here
CORS_ORIGINS=http://localhost:3000
```
