#!/bin/bash
# Wrapper around check-overflow.js — pixel-perfect content-fit check.
# Usage: check-fit.sh <input.html>
# Exits 0 if all slides fit, 1 if any overflow. JSON report on stdout.

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node not found on PATH. Install Node.js to enable overflow checks." >&2
  exit 2
fi

exec node "$SCRIPT_DIR/check-overflow.js" "$@"
