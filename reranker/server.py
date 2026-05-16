"""
Docket reranker sidecar — BAAI/bge-reranker-v2-m3.

Start:
  pip3 install -r reranker/requirements.txt
  python3 -m uvicorn reranker.server:app --host 127.0.0.1 --port 8001

Environment variables:
  RERANKER_MODEL       HuggingFace model ID (default: BAAI/bge-reranker-v2-m3)
  RERANKER_MAX_LENGTH  Tokenizer truncation length (default: 512)

POST /rerank  { "query": str, "passages": [str, ...] }
           -> { "scores": [float, ...] }
           Scores are raw cross-encoder logits; higher = more relevant.
           Order and length match the input passages array exactly.

GET  /health -> { "status": "ok", "model": str, "device": str }
"""

import os
import torch
from fastapi import FastAPI
from pydantic import BaseModel
from sentence_transformers import CrossEncoder

MODEL = os.getenv("RERANKER_MODEL", "BAAI/bge-reranker-v2-m3")
MAX_LENGTH = int(os.getenv("RERANKER_MAX_LENGTH", "512"))

# Auto-select best available device: Apple Silicon → CUDA → CPU.
if torch.backends.mps.is_available():
    device = "mps"
elif torch.cuda.is_available():
    device = "cuda"
else:
    device = "cpu"

print(f"Loading {MODEL} on {device}…")
_encoder = CrossEncoder(MODEL, device=device, max_length=MAX_LENGTH)

# Warmup pass so the first real request doesn't pay the JIT/kernel-compile cost.
_encoder.predict([["warmup", "warmup"]])
print("Reranker ready.")

app = FastAPI(title="docket-reranker")


class RerankRequest(BaseModel):
    query: str
    passages: list[str]


class RerankResponse(BaseModel):
    scores: list[float]


@app.post("/rerank", response_model=RerankResponse)
def rerank(req: RerankRequest) -> RerankResponse:
    if not req.passages:
        return RerankResponse(scores=[])
    pairs = [[req.query, p] for p in req.passages]
    scores = _encoder.predict(pairs, show_progress_bar=False)
    return RerankResponse(scores=scores.tolist())


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "model": MODEL, "device": device}
