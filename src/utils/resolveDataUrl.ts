/**
 * resolveDataUrl.ts
 *
 * Runtime resolution of the NVL data source URL.
 *
 * Priority (highest → lowest), per NFM-229 / NFM-226 ADR §2 D4:
 *   1. ?data=<URL>        — explicit URL query param
 *   2. ?corpus=<id>       — reserved; resolves via NFMD backend (stub, not wired yet)
 *   3. REACT_APP_DATA_URL — build-time environment variable
 *   4. propsUrl           — dataUrl prop passed directly to <OntologyNVLViewer>
 *   5. DEFAULT_DATA_URL   — /data/nvl_ontology_data.json
 *
 * Default behaviour is unchanged: with no query param, env var, or prop,
 * this resolves to the same default App.tsx previously hardcoded (zero-break).
 */

export const DEFAULT_DATA_URL = '/data/nvl_ontology_data.json';

export type DataSource =
  | 'query-data'
  | 'query-corpus'
  | 'env'
  | 'props'
  | 'default';

export interface ResolvedDataSource {
  url: string;
  source: DataSource;
}

/**
 * Reserved corpus resolver placeholder.
 *
 * `?corpus=<id>` is intended to resolve to a corpus served by the NFMD
 * backend. That backend protocol is not yet defined (pending NFMD/nucpot
 * architecture research — see NFM-229 D6). This stub signals clearly that
 * the resolver is not wired and returns null so callers fall through to
 * the next priority tier.
 *
 * Wire this up once the NFMD backend contract is finalised.
 */
export function resolveCorpusId(corpusId: string): string | null {
  // eslint-disable-next-line no-console
  console.warn(
    `[OntoFuel] ?corpus=${corpusId} resolver is not wired yet ` +
      '(NFMD backend contract pending — see NFM-229 D6). ' +
      'Falling back to lower-priority data source.'
  );
  return null;
}

/**
 * Resolve the NVL data source URL at runtime.
 *
 * @param params   URL search params (e.g. `new URLSearchParams(window.location.search)`)
 * @param env      environment record (e.g. `process.env`); reads `REACT_APP_DATA_URL`
 * @param propsUrl optional dataUrl prop passed directly to the viewer
 */
export function resolveDataUrl(
  params: URLSearchParams | null,
  env?: Record<string, string | undefined>,
  propsUrl?: string
): ResolvedDataSource {
  const queryData = params?.get('data') ?? undefined;
  if (queryData) {
    return { url: queryData, source: 'query-data' };
  }

  const corpusId = params?.get('corpus') ?? undefined;
  if (corpusId) {
    const resolved = resolveCorpusId(corpusId);
    if (resolved) {
      return { url: resolved, source: 'query-corpus' };
    }
    // corpus resolver not wired → fall through to lower-priority tiers
  }

  const envUrl = env?.REACT_APP_DATA_URL;
  if (envUrl) {
    return { url: envUrl, source: 'env' };
  }

  if (propsUrl) {
    return { url: propsUrl, source: 'props' };
  }

  return { url: DEFAULT_DATA_URL, source: 'default' };
}
