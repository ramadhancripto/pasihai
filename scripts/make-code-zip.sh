#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════
# PASIHAI — PAKEJI LA CODE (pasihai-code.zip)
#
# Code pekee. HAKUNA picha za preview, HAKUNA maelekezo/ripoti.
#
#   code-kamili/              mfumo wote wa code (unaokimbia: npm ci && npm run dev)
#   files-zilizobadilishwa/   faili ZOTE zilizobadilishwa/kuongezwa — KAMILI, kwa njia ya repo
#   orodha.txt                orodha ya faili zilizobadilishwa (A = mpya, M = imebadilishwa)
#
# Kinachoachwa: docs/ (picha za uthibitisho + ripoti), *.md, PASIHAI-PREVIEW.html,
# .git/, node_modules/, dist/, supabase/verify/screens (screenshots).
# Picha za app zenye thamani (src/assets/, public/, android/) zinabaki — code zinazitumia.
#
# Matumizi:  bash scripts/make-code-zip.sh [outdir]
# ══════════════════════════════════════════════════════════════
set -euo pipefail

OUT_DIR="${1:-/home/user}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
NAME="pasihai-code"
STAGE="$(mktemp -d)"
ROOT="$STAGE/$NAME"
mkdir -p "$ROOT"

echo "· Tawi: $BRANCH ($(git rev-parse --short HEAD))"

# ── 1. Mti kamili wa code ─────────────────────────────────────
echo "· code-kamili/ — mti wote wa code…"
mkdir -p "$ROOT/code-kamili"
tar -c \
  --exclude=./.git --exclude=./node_modules --exclude=./dist --exclude=./coverage \
  --exclude=./docs --exclude='*.md' \
  --exclude=./PASIHAI-PREVIEW.html \
  --exclude=./MANIFEST.sha256 --exclude=./MANIFEST.txt \
  --exclude=./supabase/verify/screens \
  --exclude=./scripts/make-delivery-zip.sh --exclude=./scripts/make-full-zip.sh \
  . | tar -x -C "$ROOT/code-kamili"

# Harness ya Status ni CODE (si picha) — inarudi kwa njia ile ile ya repo
mkdir -p "$ROOT/code-kamili/docs/shots/status"
cp docs/shots/status/status-viewer-harness.html "$ROOT/code-kamili/docs/shots/status/"

# ── 2. Faili zilizobadilishwa (kamili) ────────────────────────
echo "· files-zilizobadilishwa/ — faili zote zilizobadilishwa…"
mkdir -p "$ROOT/files-zilizobadilishwa"
git diff --name-status main.."$BRANCH" > "$STAGE/list.txt"

n=0
while IFS=$'\t' read -r st path; do
  case "$path" in
    docs/shots/*) continue ;;          # picha za uthibitisho — hazijumuishwi
  esac
  [ -f "$path" ] || continue
  mkdir -p "$ROOT/files-zilizobadilishwa/$(dirname "$path")"
  cp -p "$path" "$ROOT/files-zilizobadilishwa/$path"
  n=$((n+1))
done < "$STAGE/list.txt"

mkdir -p "$ROOT/files-zilizobadilishwa/docs/shots/status"
cp -p docs/shots/status/status-viewer-harness.html "$ROOT/files-zilizobadilishwa/docs/shots/status/"
n=$((n+1))

# ── 3. Orodha ─────────────────────────────────────────────────
{
  echo "FILES ZILIZOBADILISHWA · main ($(git rev-parse --short main)) → $BRANCH ($(git rev-parse --short HEAD))"
  echo "A = mpya · M = imebadilishwa"
  echo
  grep -v $'^A\tdocs/shots/' "$STAGE/list.txt" | sed 's/\t/  /'
  grep $'^A\tdocs/shots/status/status-viewer-harness.html' "$STAGE/list.txt" | sed 's/\t/  /'
} > "$ROOT/orodha.txt"

# ── 4. Zip ────────────────────────────────────────────────────
ZIP="$OUT_DIR/$NAME.zip"
rm -f "$ZIP"
( cd "$STAGE" && zip -q -r -6 "$ZIP" "$NAME" )
sha256sum "$ZIP" | awk '{print $1"  '"$NAME"'.zip"}' > "$OUT_DIR/$NAME.zip.sha256"

# ── 5. Ukaguzi ────────────────────────────────────────────────
code_files=$(find "$ROOT/code-kamili" -type f | wc -l)
chg_files=$(find "$ROOT/files-zilizobadilishwa" -type f | wc -l)
md=$(find "$ROOT" -name '*.md' | wc -l)
shots=$(find "$ROOT" -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.webp' -o -iname '*.gif' \) \
        | grep -vE '/(android|public|src/assets)/' | wc -l || true)

echo "✓ $ZIP  ($(du -h "$ZIP" | cut -f1))"
echo "   code-kamili: $code_files faili · files-zilizobadilishwa: $chg_files faili"
echo "   *.md: $md (inapaswa 0) · picha za preview: $shots (inapaswa 0)"
rm -rf "$STAGE"
