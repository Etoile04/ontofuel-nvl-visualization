/**
 * Unit tests for helpers (NFM-228 — closes a 0%-coverage util as part of the
 * comprehensive functional suite).
 */
import { formatNodeName, truncateText } from './helpers';

describe('helpers', () => {
  describe('formatNodeName', () => {
    test('capitalizes the first character', () => {
      expect(formatNodeName('steel')).toBe('Steel');
      expect(formatNodeName('Material')).toBe('Material');
    });

    test('returns input unchanged when empty', () => {
      expect(formatNodeName('')).toBe('');
    });
  });

  describe('truncateText', () => {
    test('truncates with ellipsis when over maxLength', () => {
      expect(truncateText('hello world', 5)).toBe('hello...');
    });

    test('returns input unchanged when within maxLength', () => {
      expect(truncateText('hi', 5)).toBe('hi');
      expect(truncateText('exact', 5)).toBe('exact');
    });

    test('returns empty input unchanged', () => {
      expect(truncateText('', 5)).toBe('');
    });
  });
});
