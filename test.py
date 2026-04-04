import json
import os
from pathlib import Path
from typing import Any

PATH = Path(__file__).parent / "backend"
DATA_PATH = PATH / "data"
FACTS_PATH = DATA_PATH / "facts.json"


def load_facts() -> dict[str, Any]:
    if not FACTS_PATH.exists():
        raise FileNotFoundError(f"Facts file not found at {FACTS_PATH}")
    with open(FACTS_PATH, "r") as f:
        return json.load(f)


facts = load_facts()
print(facts)
