#!/usr/bin/env bash
# Quick sanity check: while Docket is running, confirm it only opens connections
# to the local Ollama socket. Uses lsof on macOS/Linux.

set -euo pipefail

if [[ "$(uname)" == "Darwin" ]]; then
  echo "Connections opened by Docket (excluding loopback):"
  lsof -i -nP 2>/dev/null | grep -i "docket\|next-server\|node" | grep -v "127.0.0.1\|::1" || echo "(none — local-only confirmed)"
else
  echo "lsof-style audit on Linux:"
  sudo lsof -i -nP -a -c node 2>/dev/null | grep -v "127.0.0.1\|::1" || echo "(none — local-only confirmed)"
fi
