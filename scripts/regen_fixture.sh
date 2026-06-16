#!/usr/bin/env bash
# Regenerate the canonical NVL E2E fixture from the extractor ontology (NFM-228 Task 1).
#
# The committed fixture (e2e/fixtures/nvl_ontology_data.json) is the source of truth
# for E2E render-count assertions (matrix M1). Regenerate it locally when the
# canonical ontology (data/material_ontology_enhanced.json in the extractor repo)
# changes, then commit the result so CI and M1 assertions stay in sync.
#
# CI consumes the committed fixture directly (cross-repo regen is impractical in the
# visualization-app CI runner); this script is a local developer tool.
#
# Usage (canonical dev layout workspace-extractor/visualization-app):
#   npm run regen:fixture
# Usage (worktree or custom layout):
#   EXTRACTOR_ROOT=/path/to/workspace-extractor npm run regen:fixture
#
# Requires the extractor's scripts/sync_viz_pipeline.py on PYTHONPATH.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VIZ_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
FIXTURE="$VIZ_ROOT/e2e/fixtures/nvl_ontology_data.json"

# Default: sibling extractor checkout (canonical layout). Override for worktrees.
EXTRACTOR_ROOT="${EXTRACTOR_ROOT:-$VIZ_ROOT/..}"
ONTOLOGY="${ONTOLOGY:-$EXTRACTOR_ROOT/data/material_ontology_enhanced.json}"

if [ ! -f "$EXTRACTOR_ROOT/scripts/sync_viz_pipeline.py" ]; then
  echo "ERROR: extractor repo not found at $EXTRACTOR_ROOT" >&2
  echo "Set EXTRACTOR_ROOT to the workspace-extractor checkout." >&2
  exit 1
fi

echo "Regenerating NVL fixture from $ONTOLOGY -> $FIXTURE"
python3 "$EXTRACTOR_ROOT/scripts/sync_viz_pipeline.py" \
  --ontology "$ONTOLOGY" \
  --nvl-output "$FIXTURE"

# Sanity check: non-empty nodes/relationships and report counts (M1 baseline).
python3 - "$FIXTURE" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
n, r = len(d.get('nodes', [])), len(d.get('relationships', []))
assert n > 0 and r > 0, f"empty fixture: nodes={n} rels={r}"
print(f"fixture OK: {n} nodes, {r} relationships, schema_version={d.get('schema_version')}")
PY
