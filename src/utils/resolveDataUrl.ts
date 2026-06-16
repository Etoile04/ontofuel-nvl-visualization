/**
 * Runtime dataUrl resolution (NFM-231 / NFM-229 ADR D1, D4).
 *
 * Extracts the data-source selection out of `App.tsx` into a pure, React-free
 * function so it can be unit-tested and reused by the NFMD embed surface.
 *
 * Priority chain (AC#1, strict, highest → lowest):
 *   1. `?data=<URL>`        — explicit, overrides everything
 *   2. `?corpus=<id>`       — RESERVED: NFMD backend resolver is not wired yet;
 *                             resolves to the default URL + console.warn stub
 *   3. `REACT_APP_DATA_URL` — build-time env override
 *   4. `propsUrl`           — caller-supplied default
 *   5. `DEFAULT_DATA_URL`   — `/data/nvl_ontology_data.json` (legacy value)
 *
 * Default behavior is byte-for-byte unchanged from the prior hardcoded
 * `dataUrl="/data/nvl_ontology_data.json"` (zero breakage).
 */

/** Environment shape consumed by the resolver (CRA exposes `REACT_APP_*`). */
export interface ResolveDataUrlEnv {
  REACT_APP_DATA_URL?: string;
}

/** Which priority layer supplied the resolved URL. */
export type ResolveDataUrlSource =
  | 'query-data'
  | 'query-corpus'
  | 'env'
  | 'props'
  | 'default';

/** Result of resolving the runtime data URL. */
export interface ResolveDataUrlResult {
  url: string;
  source: ResolveDataUrlSource;
}

/** Legacy hardcoded default — preserved verbatim for zero-breakage. */
export const DEFAULT_DATA_URL = '/data/nvl_ontology_data.json';

/**
 * Resolve the runtime data URL from query params, env, and an optional prop.
 *
 * @param params    - Parsed URL search params (e.g. `new URLSearchParams(window.location.search)`)
 * @param env       - Build/runtime env (e.g. `process.env`), only `REACT_APP_*` is honored
 * @param propsUrl  - Optional caller-supplied default URL (lowest-priority override)
 * @returns `{ url, source }` describing the chosen URL and which layer supplied it
 */
export function resolveDataUrl(
  params: URLSearchParams,
  env: ResolveDataUrlEnv,
  propsUrl?: string,
): ResolveDataUrlResult {
  // 1. ?data=<URL> — highest priority, explicit override
  const dataParam = params.get('data');
  if (dataParam) {
    return { url: dataParam, source: 'query-data' };
  }

  // 2. ?corpus=<id> — reserved; backend resolver not wired (stub + warn)
  const corpusId = params.get('corpus');
  if (corpusId) {
    return { url: resolveCorpusId(corpusId), source: 'query-corpus' };
  }

  // 3. REACT_APP_DATA_URL env
  const envUrl = env.REACT_APP_DATA_URL;
  if (envUrl) {
    return { url: envUrl, source: 'env' };
  }

  // 4. props (caller default)
  if (propsUrl) {
    return { url: propsUrl, source: 'props' };
  }

  // 5. default — legacy hardcoded value
  return { url: DEFAULT_DATA_URL, source: 'default' };
}

/**
 * Resolve a `?corpus=<id>` to a data URL.
 *
 * Stub: the NFMD / nucpot backend corpus protocol is not wired yet (see
 * NFM-229 D6 — final form pending NFMD architecture research). Until then it
 * returns the default data URL so the viewer still renders, and warns so the
 * reserved parameter is visible during integration.
 *
 * @param id - Corpus identifier from `?corpus=<id>`
 * @returns Default data URL for now (placeholder)
 */
export function resolveCorpusId(id: string): string {
  // eslint-disable-next-line no-console
  console.warn(
    `?corpus=${id}: NFMD backend resolver not wired — using default data URL. ` +
      'Reserved for NFMD/nucpot integration (NFM-229 D6).',
  );
  return DEFAULT_DATA_URL;
}
