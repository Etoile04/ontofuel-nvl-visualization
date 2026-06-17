# OntoFuel NVL Visualization — Test Matrix (NFM-228)

Functional + E2E regression coverage for the visualization app. Gate strategy
follows the QA kickoff verdict ([NFM-233](/NFM/issues/NFM-233), AC#5):

- **D1 Track B+ = CI merge gate** — `npm run build` of the real CRA bundle +
  static `serve build/`, driven by Playwright. No dev server (random), no Docker
  (slow / CI-unavailable). See `.github/workflows/ci.yml`.
- **D1 Track A = nightly** — Docker/nginx iframe face that static `serve` cannot
  reproduce. Best-effort. See `.github/workflows/e2e-nightly-nginx.yml` (M-R1).

## Entry points

| Surface | Command | What runs |
| --- | --- | --- |
| Unit / component | `npm run test:ci` | Jest + ts-jest + RTL, coverage gate (70% stmts/lines/funcs, 60% branches floor) — see §Follow-ups |
| E2E | `npm run test:e2e` | Playwright (chromium) against `build/` served on `:3210` |
| Fixture refresh | `npm run regen:fixture` | Re-emit canonical NVL from the extractor ontology |

Canonical NVL fixture: `e2e/fixtures/nvl_ontology_data.json` (927 nodes /
1061 relationships / `schema_version 1.0`). M1 count assertions are computed
from it, so they stay in sync.

## Matrix

| ID | Capability | Layer | Location | Asserts |
| --- | --- | --- | --- | --- |
| **M1** | Render smoke | E2E | `e2e/render.spec.ts` (`graph container mounts`, `Statistics panel reflects fixture counts`, `no console errors`) | Graph container mounts; Statistics panel = fixture counts; no page errors |
| **M1** | Render smoke | Jest | `src/components/OntologyNVLViewer.test.tsx` (`数据加载`) | node/relationship counts from props |
| **M2** | Search filter (NFM-50) | E2E | `e2e/search.spec.ts` (`search narrows filtered node count…`) | "Filtered (N)" drops to exact computed subset; 0 + "No nodes match" on miss; restores on clear |
| **M2** | Search cross-filter invariant (NFM-50) | Jest | `src/components/OntologyNVLViewer.test.tsx` (`应该在搜索时过滤关系`, `…保留共享关系`, `…清除搜索后恢复`) | relationships narrow to both-endpoints-in-filter; shared rels kept; clear restores |
| **M2** | Search case-insensitive (NFM-50) | Jest | `src/components/OntologyNVLViewer.test.tsx` (`搜索大小写不敏感`) | name/label/type match regardless of case |
| **M3** | Multi-format export (NFM-49) | E2E | `e2e/export.spec.ts` (`exports non-empty … file`) | JSON / Relationships CSV / GraphML / Markdown each download non-empty, correct extension |
| **M3** | Export content + scope (NFM-49) | Jest | `src/utils/exportUtils.nfm228.test.ts` | GraphML `<graphml>/<node>/<edge>`; Markdown heading/stats; rel-CSV `from,to,type`; **scope=`selected`** (L1) + `filtered` |
| **M4** | Embed mode (NFM-49) | E2E | `e2e/embed.spec.ts` (`?embed=true hides toolbar + sidebar…`) | toolbar (search/layout/export) + sidebar absent; graph present |
| **M4** | Embed mode (NFM-49) | Jest | `src/components/OntologyNVLViewer.test.tsx` (`嵌入模式`); `src/App.test.tsx` | embed hides toolbar/sidebar; `?embed=true` → `embedMode` prop wired |
| **M5** | Contract conformance | Contract | `schemas/nvl.schema.json` | versioned contract spec (stub, swap-ready for NFM-227) |
| **M5** | Contract conformance | Jest | ⏳ deferred to [NFM-227](/NFM/issues/NFM-227) | `validateNvlContract(fixture)` case — blocked until `contractValidation.ts` lands (QA H1). ~15 min add |
| **M6** | Docker / nginx iframe (NFM-49) | Nightly | `.github/workflows/e2e-nightly-nginx.yml` (M-R1) | `X-Frame-Options: ALLOWALL`; `Access-Control-Allow-Origin`; SPA `try_files`; `/data/…` served |

## Notes
- The NVL canvas is WebGL, so "visible node count" in E2E is read via the export
  menu's live **"Filtered (N)"** label (derived from the same `filteredNodes` the
  canvas uses) plus the "No nodes match your search" hint — both deterministic
  DOM signals.
- L2 (QA): the M3 E2E row asserts non-empty downloads; the **Jest** M3 row
  cross-references the content-shape assertions (`<graphml>`/`<node>`, headings,
  `from,to,type`) so the E2E row is not misread as "non-empty only".
- Docker (NFM-49) is **Track A nightly**, not in the M1–M5 merge gate — it is
  covered by M6 so "no Docker row in the merge gate" is not misread as "untested".

## Follow-ups
- **Branch coverage → 70%**: current global branches ≈ 65% (helpers.ts now 100%;
  residual debt is `exportUtils.ts` edge branches and `OntologyNVLViewer.tsx`
  interaction branches). The gate is set as a regression floor (60% branches /
  70% stmts·lines·funcs) so it does not fail its own introducing PR; raising
  branches to the 70% target is tracked as follow-up test work (export edge
  cases: empty-input alert paths, special-character escaping branches).
- **M5 contract fixture case (H1b)**: deferred to [NFM-227](/NFM/issues/NFM-227) —
  one `validateNvlContract(fixture)` assertion once `contractValidation.ts` lands.
