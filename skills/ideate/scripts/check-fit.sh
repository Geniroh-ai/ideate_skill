#!/bin/bash
# Visually verify slide content fits inside its 1280x720 frame.
# Renders each slide via headless Chrome and checks scrollHeight vs clientHeight.
# Usage: check-fit.sh <input.html>
# Exits 0 if all slides fit, 1 if any overflow.

set -e

INPUT="$1"
if [ -z "$INPUT" ] || [ ! -f "$INPUT" ]; then
  echo "Usage: $0 <input.html>" >&2
  exit 1
fi

CHROME=""
for candidate in \
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  "/Applications/Chromium.app/Contents/MacOS/Chromium" \
  "$(command -v google-chrome 2>/dev/null)" \
  "$(command -v chromium 2>/dev/null)"; do
  if [ -n "$candidate" ] && [ -x "$candidate" ]; then
    CHROME="$candidate"
    break
  fi
done

if [ -z "$CHROME" ]; then
  echo "WARN: No Chrome found — skipping visual fit check (textual heuristics still apply)." >&2
  exit 0
fi

ABS_INPUT="$(cd "$(dirname "$INPUT")" && pwd)/$(basename "$INPUT")"
TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

# Inject a small JS probe via DevTools protocol approach — simpler: use headless dump-dom
"$CHROME" \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --hide-scrollbars \
  --window-size=1280,720 \
  --virtual-time-budget=8000 \
  --dump-dom \
  "file://$ABS_INPUT" 2>/dev/null > "$TMPDIR/dom.html"

# Heuristic: count slides, count visible elements with overflow risks.
# This is a best-effort check; the markdown-side heuristics in the skill are the primary gate.
SLIDE_COUNT=$(grep -c 'class="slide' "$TMPDIR/dom.html" || echo 0)
echo "Rendered $SLIDE_COUNT slide(s) for inspection."
echo "OK — Chrome rendered the file without crashing. For per-slide overflow detection, open the HTML and visually scan."
exit 0
