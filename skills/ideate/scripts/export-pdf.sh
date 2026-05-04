#!/bin/bash
# Convert a deck HTML to PDF using headless Chrome.
# Usage: export-pdf.sh <input.html> <output.pdf>

set -e

INPUT="$1"
OUTPUT="$2"

if [ -z "$INPUT" ] || [ -z "$OUTPUT" ]; then
  echo "Usage: $0 <input.html> <output.pdf>" >&2
  exit 1
fi

if [ ! -f "$INPUT" ]; then
  echo "Input HTML not found: $INPUT" >&2
  exit 1
fi

# Find Chrome / Chromium / Edge on macOS, Linux, or via PATH
CHROME=""
for candidate in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" \
  "$(command -v google-chrome 2>/dev/null)" \
  "$(command -v chromium 2>/dev/null)" \
  "$(command -v chrome 2>/dev/null)"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then
    CHROME="$candidate"
    break
  fi
done

if [ -z "$CHROME" ]; then
  echo "ERROR: No Chrome / Chromium / Edge found. Install one to enable PDF export." >&2
  exit 2
fi

mkdir -p "$(dirname "$OUTPUT")"
ABS_INPUT="$(cd "$(dirname "$INPUT")" && pwd)/$(basename "$INPUT")"

"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --hide-scrollbars \
  --no-pdf-header-footer \
  --virtual-time-budget=10000 \
  --print-to-pdf="$OUTPUT" \
  --print-to-pdf-no-header \
  "file://$ABS_INPUT" 2>/dev/null

if [ -f "$OUTPUT" ]; then
  echo "PDF created: $OUTPUT"
  exit 0
else
  echo "ERROR: PDF export failed." >&2
  exit 3
fi
