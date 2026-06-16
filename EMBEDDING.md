# Embedding the OntoFuel NVL Viewer

This document is the **NFMD integration spec surface** for the React NVL
visualization app (`visualization-app/`). It defines how the NFMD website (or
any third-party host) embeds the ontology viewer, how the data source is
configured at runtime, the CORS contract for cross-origin data, and the
reserved-but-not-yet-wired corpus resolver.

> Related: NFM-226 (viz integration ADR), NFM-229 D3 (this contract),
> NFM-231 (implementation). Legacy Python `start_viewer` is deprecated — see
> `src/ontofuel/visualization/DEPRECATED.md` in the main repo.

---

## 1. Build & static hosting

The app is a Create React App. Produce static assets once and host them
anywhere that serves static files:

```bash
cd visualization-app
npm install
npm run build        # emits visualization-app/build/
```

Serve the resulting `build/` directory as static assets (nginx, S3 + CloudFront,
GitHub Pages, Netlify, Vercel static, a CDN, or an object store). The build is
fully client-side — there is **no runtime server requirement** for the viewer
itself.

For a path-prefixed host, set the CRA `homepage` field in `package.json`
(e.g. `"homepage": "/viewer"`) before building so asset URLs resolve.

## 2. Embed surface (URL parameters)

All configuration is via query-string parameters on the viewer URL, so an
embedder controls behavior purely through the `src` of an `<iframe>` (or the
navigated URL). No rebuild is needed to change the data source.

| Param          | Purpose                                           | Status      |
| -------------- | ------------------------------------------------- | ----------- |
| `?embed=true`  | Hide the toolbar / side panel (chromeless mode)   | Stable      |
| `?data=<URL>`  | Load NVL JSON from any URL (highest priority)     | Stable      |
| `?corpus=<id>` | Resolve a corpus id to a data URL via NFMD backend | **Reserved** |

### `?embed=true`

Enables **embed mode**: the in-app toolbar and auxiliary panels are hidden so
the graph fills the frame. Use this for site embedding. Without it, the full
interactive UI is shown (useful for a standalone "open in viewer" link).

### `?data=<URL>` — runtime data source

Points the viewer at any NVL JSON document. This is the primary knob for
serving a specific ontology snapshot, a per-user extract, or a versioned
release:

```
https://viewer.example.com/?embed=true&data=https://data.example.com/nvl/2026-06.json
```

The data URL resolution is centralized in
[`src/utils/resolveDataUrl.ts`](src/utils/resolveDataUrl.ts) and follows a
strict priority chain (highest → lowest):

1. `?data=<URL>` — explicit, overrides everything
2. `?corpus=<id>` — reserved (see below), currently a stub
3. `REACT_APP_DATA_URL` — build-time env override
4. caller-supplied prop
5. **default** `/data/nvl_ontology_data.json` (legacy value, unchanged)

**Default zero-breakage:** with no parameters and no env, the viewer loads the
exact same default file it always did.

### `?corpus=<id>` — reserved (NFMD backend, TBD)

Intended to let an embedder request a dataset by logical id
(e.g. `?corpus=reactor-fuel-2026`) and have the NFMD backend resolve it to a
canonical data URL. **This is reserved but not yet wired.** The current stub
([`resolveCorpusId`](src/utils/resolveDataUrl.ts)) emits a `console.warn`
(`NFMD backend resolver not wired`) and falls back to the default data URL so
the viewer still renders.

The final backend protocol depends on the NFMD / nucpot architecture research
(see §6 Future). Until then, **use `?data=<URL>`** for any non-default dataset.

## 3. CORS contract (cross-origin data)

When `?data=<URL>` points to a **different origin** than the page hosting the
viewer, the browser's same-origin policy applies to the `fetch`. The data host
**must** return CORS headers permitting the embed origin:

```http
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: https://nfmd.example.com
Vary: Origin
```

Rules of thumb:

- **Same-origin data** (viewer and JSON served from the same host): no CORS
  headers needed.
- **Single known embedder**: allowlist that exact origin
  (`Access-Control-Allow-Origin: https://nfmd.example.com`).
- **Public/open data**: `Access-Control-Allow-Origin: *` is acceptable for
  read-only public NVL JSON (no credentials involved).
- The request is a simple `GET` of JSON — no preflight is triggered as long as
  no custom headers are sent. Keep the data endpoint free of auth cookies if
  you intend to use `*`.

If the fetch fails due to CORS, the viewer surfaces a friendly load error
(see `OntologyNVLViewer`'s error state) rather than silently failing.

## 4. iframe embedding

Embed the viewer in an `<iframe>` pointing at the built static app with the
desired query parameters:

```html
<iframe
  src="https://viewer.example.com/?embed=true&data=https://data.example.com/nvl/latest.json"
  title="OntoFuel NVL Viewer"
  width="100%"
  height="600"
  style="border:0; width:100%; height:600px;"
  loading="lazy"
  allow="clipboard-write"
></iframe>
```

Recommendations:

- **Sizing:** give the frame an explicit height (e.g. `600px`+). The viewer
  fills `100%` of its container; avoid unbounded `height:100%` inside a
  zero-height parent. For responsive layouts, wrap in an aspect-ratio
  container and let the iframe fill it.
- **Deep links:** every interactive state that is URL-encoded (data source,
  embed mode) is shareable — the same `src` reproduces the view. Persist
  view-specific state (selection, layout) in the URL as those features land.
- **Sandbox:** if you sandbox the iframe, keep `allow-scripts` and
  `allow-same-origin` enabled (the viewer needs to run JS and fetch its data).
  Do **not** add `allow-top-navigation` — the viewer never navigates the parent.
- **Accessibility:** always set a descriptive `title`.

## 5. Docker embed entry (production)

For a self-contained deployment, the main repo ships a Docker setup that
builds this app and serves it as static assets behind a container (the
canonical production embedding path). See the main repo's `docker/` directory
and the CLI note below.

> The Python CLI command `ontofuel viz` (legacy `start_viewer`) is
> **deprecated** as of OntoFuel v1.2. It still starts the legacy Python D3
> viewer for backward compatibility but prints a deprecation notice pointing
> here. Prefer the Docker embed entry or a static host for production.

## 6. Future / reserved

- **`?corpus=<id>` resolver.** The final NFMD backend protocol for resolving a
  corpus id to a data URL is pending the NFMD / nucpot architecture research
  (NFM-229 D6). The parameter and the `resolveCorpusId()` seam are reserved so
  the contract is stable; only the resolver implementation changes later.
- **Static embed vs. backend API.** This version ships the **static-embed
  path** (`?data=<URL>` + static hosting). Whether NFMD additionally exposes a
  backend data API is an open architectural decision for the CTO, informed by
  the NFMD research; it does not block this contract.
- **Versioned NVL contract.** The viewer performs a lightweight client-side
  contract check (NFM-227); full JSON Schema conformance is enforced on the
  Python side. Versioned data files (`schema_version`) are preferred for new
  deployments.
