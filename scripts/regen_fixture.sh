#!/usr/bin/env bash
# NFM-228: regenerate the canonical NVL E2E fixture from the extractor ontology and
# verify it matches the committed copy. CI drift guard — exits non-zero if the
# ontology or converter changed since the fixture was committed.
#
# Usage: ./scripts/regen_fixture.sh
# Env:   EXTRACTOR_ROOT (default: parent of this repo), ONTOLOGY (default:
#        $EXTRACTOR_ROOT/data/material_ontology_enhanced.json)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIZ_ROOT="$(dirname "$SCRIPT_DIR")"
EXTRACTOR_ROOT="${EXTRACTOR_ROOT:-$(dirname "$VIZ_ROOT")}"
ONTOLOGY="${ONTOLOGY:-$EXTRACTOR_ROOT/data/material_ontology_enhanced.json}"
FIXTURE="$VIZ_ROOT/e2e/fixtures/nvl_ontology_data.json"
TMP="$(mktemp -t nvl_fixture_XXXXXX.json)"
trap 'rm -f "$TMP"' EXIT

if [ ! -f "$ONTOLOGY" ]; then
  echo "✗ ontology not found: $ONTOLOGY" >&2
  exit 2
fi

echo "→ regenerating NVL from $ONTOLOGY"
python3 "$EXTRACTOR_ROOT/scripts/sync_viz_pipeline.py" \
  --ontology "$ONTOLOGY" \
  --nvl-output "$TMP" >/dev/null

python3 - "$FIXTURE" "$TMP" <<'PY'
import json, sys
committed, regen = sys.argv[1], sys.argv[2]
a = json.load(open(committed))
b = json.load(open(regen))
# generated_at is non-deterministic; ignore it when checking for drift.
a.pop('generated_at', None)
b.pop('generated_at', None)
if a == b:
    print("✓ NFM-228 fixture in sync with ontology (ignoring generated_at)")
    sys.exit(0)
print("✗ NFM-228 fixture drift: ontology/converter changed since fixture was committed")
print("  Regenerate locally:")
print("    python3 ../scripts/sync_viz_pipeline.py \\")
print("      --ontology data/material_ontology_enhanced.json \\")
print("      --nvl-output e2e/fixtures/nvl_ontology_data.json")
sys.exit(1)
PY
