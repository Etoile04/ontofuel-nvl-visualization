/**
 * resolveDataUrl.test.ts
 * Tests for runtime dataUrl resolution (NFM-231 / NFM-229 D1).
 *
 * Priority chain under test (AC#1):
 *   ?data=<URL>  >  ?corpus=<id> (reserved)  >  REACT_APP_DATA_URL env
 *   >  props  >  default '/data/nvl_ontology_data.json'
 *
 * Written first (RED), implementation follows (GREEN).
 */

import {
  resolveDataUrl,
  resolveCorpusId,
  DEFAULT_DATA_URL,
} from './resolveDataUrl';

const p = (qs: string): URLSearchParams => new URLSearchParams(qs);

describe('resolveDataUrl', () => {
  describe('?data=<URL> — highest priority', () => {
    test('uses ?data value when present', () => {
      const r = resolveDataUrl(p('data=https://host/foo.json'), {});
      expect(r.url).toBe('https://host/foo.json');
      expect(r.source).toBe('query-data');
    });

    test('?data takes priority over ?corpus', () => {
      const r = resolveDataUrl(p('data=https://x/d.json&corpus=abc'), {});
      expect(r.url).toBe('https://x/d.json');
      expect(r.source).toBe('query-data');
    });

    test('?data takes priority over env', () => {
      const r = resolveDataUrl(p('data=https://x/d.json'), {
        REACT_APP_DATA_URL: 'https://env/d.json',
      });
      expect(r.source).toBe('query-data');
    });

    test('?data takes priority over props', () => {
      const r = resolveDataUrl(p('data=https://x/d.json'), {}, 'https://props/d.json');
      expect(r.source).toBe('query-data');
    });

    test('empty ?data= falls through to next layer (not treated as set)', () => {
      const r = resolveDataUrl(p('data='), {});
      expect(r.source).toBe('default');
    });
  });

  describe('?corpus=<id> — reserved / placeholder', () => {
    test('falls back to default URL and warns (backend not wired)', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const r = resolveDataUrl(p('corpus=nvl-2026'), {});
      expect(r.source).toBe('query-corpus');
      expect(r.url).toBe(DEFAULT_DATA_URL);
      expect(warn).toHaveBeenCalled();
      expect(String(warn.mock.calls[0][0])).toMatch(/NFMD backend resolver not wired/i);
      warn.mockRestore();
    });

    test('?corpus takes priority over env', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const r = resolveDataUrl(p('corpus=abc'), { REACT_APP_DATA_URL: 'https://env/d.json' });
      expect(r.source).toBe('query-corpus');
      warn.mockRestore();
    });

    test('?corpus takes priority over props', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      const r = resolveDataUrl(p('corpus=abc'), {}, 'https://props/d.json');
      expect(r.source).toBe('query-corpus');
      warn.mockRestore();
    });
  });

  describe('REACT_APP_DATA_URL env', () => {
    test('uses env when no query param is set', () => {
      const r = resolveDataUrl(p(''), { REACT_APP_DATA_URL: 'https://env/d.json' });
      expect(r.url).toBe('https://env/d.json');
      expect(r.source).toBe('env');
    });

    test('env takes priority over props', () => {
      const r = resolveDataUrl(p(''), { REACT_APP_DATA_URL: 'https://env/d.json' }, 'https://props/d.json');
      expect(r.source).toBe('env');
    });
  });

  describe('props', () => {
    test('uses props when no query and no env', () => {
      const r = resolveDataUrl(p(''), {}, 'https://props/d.json');
      expect(r.url).toBe('https://props/d.json');
      expect(r.source).toBe('props');
    });

    test('empty-string props fall through to default', () => {
      const r = resolveDataUrl(p(''), {}, '');
      expect(r.source).toBe('default');
    });
  });

  describe('default fallback — zero breakage', () => {
    test('falls back to the legacy hardcoded default when nothing is set', () => {
      const r = resolveDataUrl(p(''), {});
      expect(r.url).toBe('/data/nvl_ontology_data.json');
      expect(r.source).toBe('default');
    });

    test('DEFAULT_DATA_URL equals the legacy hardcoded value', () => {
      expect(DEFAULT_DATA_URL).toBe('/data/nvl_ontology_data.json');
    });
  });
});

describe('resolveCorpusId', () => {
  test('returns the default URL while the backend resolver is unwired', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(resolveCorpusId('nvl-2026')).toBe(DEFAULT_DATA_URL);
    warn.mockRestore();
  });

  test('warns once that the NFMD backend resolver is not wired', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    resolveCorpusId('nvl-2026');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/NFMD backend resolver not wired/i);
    warn.mockRestore();
  });
});
