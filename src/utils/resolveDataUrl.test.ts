/**
 * resolveDataUrl.test.ts
 * Tests for runtime data-source URL resolution (NFM-229 / NFM-226 ADR §2 D4).
 */

import {
  resolveDataUrl,
  resolveCorpusId,
  DEFAULT_DATA_URL,
} from './resolveDataUrl';

describe('resolveDataUrl priority chain', () => {
  test('?data= takes highest priority over corpus, env, and props', () => {
    const params = new URLSearchParams('?data=https://x.test/a.json&corpus=c1');
    const result = resolveDataUrl(
      params,
      { REACT_APP_DATA_URL: 'https://env.test/e.json' },
      'https://prop.test/p.json'
    );
    expect(result.url).toBe('https://x.test/a.json');
    expect(result.source).toBe('query-data');
  });

  test('falls back to default when nothing is set (zero-break)', () => {
    const result = resolveDataUrl(new URLSearchParams(''), {}, undefined);
    expect(result.url).toBe(DEFAULT_DATA_URL);
    expect(result.source).toBe('default');
  });

  test('default URL is the documented /data/nvl_ontology_data.json', () => {
    expect(DEFAULT_DATA_URL).toBe('/data/nvl_ontology_data.json');
  });

  test('REACT_APP_DATA_URL env wins over props and default', () => {
    const result = resolveDataUrl(
      new URLSearchParams(''),
      { REACT_APP_DATA_URL: 'https://env.test/e.json' },
      'https://prop.test/p.json'
    );
    expect(result.url).toBe('https://env.test/e.json');
    expect(result.source).toBe('env');
  });

  test('propsUrl wins over default', () => {
    const result = resolveDataUrl(
      new URLSearchParams(''),
      {},
      'https://prop.test/p.json'
    );
    expect(result.url).toBe('https://prop.test/p.json');
    expect(result.source).toBe('props');
  });

  test('null params does not throw and falls back through tiers', () => {
    const result = resolveDataUrl(null, {}, undefined);
    expect(result.url).toBe(DEFAULT_DATA_URL);
    expect(result.source).toBe('default');
  });

  test('?data= with empty corpus/env still resolves to the query url', () => {
    const result = resolveDataUrl(
      new URLSearchParams('?data=/data/custom.json'),
      {},
      undefined
    );
    expect(result.url).toBe('/data/custom.json');
    expect(result.source).toBe('query-data');
  });
});

describe('?corpus= reserved resolver (NFMD backend not wired)', () => {
  test('corpus stub warns and falls through to next tier (env)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = resolveDataUrl(
      new URLSearchParams('?corpus=my-corpus'),
      { REACT_APP_DATA_URL: 'https://env.test/e.json' }
    );
    expect(result.source).toBe('env');
    expect(result.url).toBe('https://env.test/e.json');
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('resolveCorpusId returns null and warns (backend pending)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolveCorpusId('anything')).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test('corpus with no other source falls through to default', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const result = resolveDataUrl(
      new URLSearchParams('?corpus=only-corpus'),
      {},
      undefined
    );
    expect(result.source).toBe('default');
    expect(result.url).toBe(DEFAULT_DATA_URL);
    warnSpy.mockRestore();
  });
});
