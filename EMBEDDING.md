# Embedding Guide — OntoFuel NVL Viewer as NFMD Integration Surface

> Spec surface for embedding the OntoFuel ontology viewer into the NFMD website
> (or any host). Tracked by [NFM-229](/NFM/issues/NFM-229) / NFM-226 ADR §2 D4.
>
> This is the **canonical integration path**: the React NVL viewer is the single
> supported frontend. The legacy Python `start_viewer` is deprecated — see
> [DEPRECATED.md](../src/ontofuel/visualization/DEPRECATED.md) in the extractor repo.

## 1. Embed surface (URL contract)

The viewer is configured entirely through URL query params, so no host-side
build step is required — point an `<iframe>` at the deployed viewer.

| Param       | Required | Meaning                                                                 |
| ----------- | -------- | ----------------------------------------------------------------------- |
| `embed`     | no       | `embed=true` hides the toolbar / export menu (chromeless embed). A minimal floating search box is preserved (§5). |
| `data`      | no       | Absolute or relative URL to the NVL JSON corpus to render.              |
| `corpus`    | no       | **Reserved.** NFMD backend corpus id; resolver not yet wired (§4).      |
| `node`      | no       | `node=<id>` opens the viewer pre-selected on a specific node (§5).      |

### Data-source resolution priority

When multiple sources are present, the viewer resolves in this order
(implemented in `src/utils/resolveDataUrl.ts`):

1. `?data=<URL>` — explicit URL param (highest priority)
2. `?corpus=<id>` — reserved NFMD backend resolution (§4; currently a no-op stub)
3. `REACT_APP_DATA_URL` — build-time environment variable
4. `dataUrl` prop on `<OntologyNVLViewer>` (for direct, non-iframe consumers)
5. Default `/data/nvl_ontology_data.json` (zero-break fallback)

With **no** param or env var set, the viewer loads the default corpus —
existing behaviour is unchanged.

## 2. Minimal embed snippet

```html
<iframe
  src="https://<viewer-host>/?embed=true&data=https://<corpus-host>/nvl_ontology_data.json"
  title="OntoFuel ontology viewer"
  style="width: 100%; height: 100%; min-height: 600px; border: 0;"
  loading="lazy"
  allowfullscreen
></iframe>
```

- `embed=true` → toolbar + export menu hidden; the graph fills the frame. A
  minimal floating search box stays available so large graphs remain navigable.
- `data=` → points at the corpus JSON you want to render.
- `node=` (optional) → e.g. `&node=Material` opens pre-selected on that node.

## 3. Static asset hosting & CORS contract

**Viewer assets.** Build the viewer (`npm run build`) and serve the resulting
`build/` directory as static files from any static host / CDN / Docker image.
The iframe `src` points at that static origin.

**Corpus JSON hosting (CORS).** The corpus referenced by `?data=<URL>` is
fetched client-side by the viewer, so the host serving that JSON **must** allow
the viewer's origin:

```
# On the corpus host's response headers:
Access-Control-Allow-Origin: https://<viewer-host>
# (or the embedding page origin, if the data URL is same-origin with the host)
Access-Control-Allow-Methods: GET
```

- **Same-origin (simplest):** host the corpus JSON on the **same origin** as the
  viewer (e.g. viewer serves `/data/*.json` itself) → no CORS headers needed.
- **Cross-origin:** set `Access-Control-Allow-Origin` on the corpus host to
  permit the viewer origin. Without it the browser blocks the fetch and the
  viewer shows a load error.
- The viewer performs a `fetch(dataUrl)` with no credentials; ensure the corpus
  endpoint is publicly readable (or covered by the CORS policy above).

## 4. Reserved: `?corpus=<id>` → NFMD backend (not yet wired)

`?corpus=<id>` is **reserved** for resolving a corpus identifier to a URL via
the NFMD backend. The resolver (`resolveCorpusId` in `resolveDataUrl.ts`) is a
deliberate stub that:

- emits a `console.warn` explaining the backend is not wired, and
- returns `null`, so resolution falls through to the lower-priority tiers
  (env → props → default).

The concrete backend protocol (how `<id>` maps to a corpus URL / API call) is
**out of scope for this repo** and awaits the NFMD/nucpot architecture research
conclusion. Once that contract is finalised, wire `resolveCorpusId` to it.
Cross-team protocol changes must be escalated to CTO/CEO.

> **Open decision (escalated to CTO, non-blocking for this surface):** whether
> the final NFMD integration ships corpus as **static assets embedded alongside
> the viewer** (current path) or via a **backend API that emits NVL**. This
> guide implements the static-embed path and reserves the API hook; the final
> form is deferred to the NFMD architecture research (NFM-229 D6).

## 5. iframe sizing, embed search & deep-linking

### Sizing — height contract (NFM-237 MUST #1)

The viewer adapts to its **host container**, not the viewport:

- `.ontology-nvl-viewer` renders at `height: 100%` with a **`min-height: 400px`**
  floor (CSS), so it fills whatever box the host gives it (hero / card / modal /
  iframe) and never collapses below a usable size.
- The height resolves through a `height: 100%` chain: the viewer root, the App
  wrapper, `#root`, `body`, and `html` are all `height: 100%`. **The host must
  therefore give the iframe (or embedding container) an explicit height**, e.g.
  `style="height: 100%; min-height: 600px"`, or a fixed/constrained height from
  the host layout. A heightless container leaves the viewer at its 400px floor.

> Previous behaviour forced `height: 100vh` internally, which overfilled cards
> and modals. That was removed in NFM-237; default (non-embed) full-viewport
> behaviour is preserved via the `100%` chain.

### Embed search (NFM-237 MUST #2)

In `embed=true` mode the full toolbar is hidden, but a **minimal floating search
box** (top-left overlay) is retained. It reuses the same node filtering as the
full toolbar (match on node name / label / type) — essential for the 700+ node
corpus. Typing filters the graph live; the `×` button clears the search.

### Deep-linking (NFM-237 MUST #3)

The surface now deep-links at three levels:

- `?data=<URL>` — corpus selection (§1).
- `?embed=true` — chromeless embed (§1).
- `?node=<id>` — **node-level**: on load the viewer locates and selects the node
  with that id (rendering its details). Clicking any node **syncs** `?node=<id>`
  back into the URL via `history.replaceState`, preserving any existing
  `embed`/`data`/`corpus` params — so the address bar always reflects the
  focused entity and is shareable. Implemented in `src/utils/nodeDeepLink.ts`.

If `?node=<id>` does not match any node in the loaded corpus, the viewer loads
normally without error (no selection).

## 6. Operational notes

- Build command: `npm run build` (CRA) → `build/`.
- Tests: `npm test` (includes `src/utils/resolveDataUrl.test.ts` covering the
  full priority chain + corpus stub).
- Default corpus path the viewer ships with: `/data/nvl_ontology_data.json`.
