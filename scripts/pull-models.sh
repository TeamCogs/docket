#!/usr/bin/env bash
# Pulls the Ollama models Docket needs.
# Run this once after installing Ollama, or let the app do it on first launch.

set -euo pipefail

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama not found. Install from https://ollama.com first." >&2
  exit 1
fi

MODELS=(
  "qwen3:32b-instruct-q4_K_M"
  "qwen3:8b-instruct-q4_K_M"
  "nomic-embed-text-v2-moe"
  "bge-reranker-v2-m3"
)

echo "Pulling Docket's local models. This is a one-time download (~25 GB total)."
for m in "${MODELS[@]}"; do
  echo "→ ${m}"
  ollama pull "${m}"
done

echo "Done. All models are local. Docket will not attempt to download them again."
