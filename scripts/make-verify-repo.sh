#!/bin/bash
# Huunda nakala ya migrations kwa harness ya lab (dest: $1, default /tmp/verifyrepo).
# Sababu: 031_chat_rls_security_repair.sql ina `COMMIT();` (syntax error) — quirk ya
# kihistoria; harness hudondosha hiyo line kwenye **nakala** pekee. Historia ya 031
# kwenye repo HAIGUZWI.
set -euo pipefail
DEST="${1:-/tmp/verifyrepo}"
rm -rf "$DEST"
mkdir -p "$DEST/supabase"
cp -r "$(dirname "$0")/../supabase/migrations" "$DEST/supabase/"
python3 - "$DEST" << 'PY'
import sys, pathlib
p = pathlib.Path(sys.argv[1]) / 'supabase/migrations/031_chat_rls_security_repair.sql'
s = p.read_text()
p.write_text(s.replace('BEGIN;\n', '', 1).replace('COMMIT();', ''))
PY
echo "verify repo: $DEST"
