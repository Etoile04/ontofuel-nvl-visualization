/**
 * helpers.test.ts
 * Tests for utility helper functions
 */

import { formatNodeName, truncateText } from './helpers';

describe('formatNodeName', () => {
  test('should capitalize first letter of a name', () => {
    expect(formatNodeName('material')).toBe('Material');
    expect(formatNodeName('steel')).toBe('Steel');
    expect(formatNodeName('property')).toBe('Property');
  });

  test('should handle single character', () => {
    expect(formatNodeName('a')).toBe('A');
    expect(formatNodeName('z')).toBe('Z');
  });

  test('should handle empty string', () => {
    expect(formatNodeName('')).toBe('');
  });

  test('should handle null or undefined', () => {
    expect(formatNodeName(null as any)).toBe(null);
    expect(formatNodeName(undefined as any)).toBe(undefined);
  });

  test('should not modify already capitalized names', () => {
    expect(formatNodeName('Material')).toBe('Material');
    expect(formatNodeName('Steel')).toBe('Steel');
  });

  test('should handle names with multiple words', () => {
    expect(formatNodeName('material property')).toBe('Material property');
    expect(formatNodeName('high strength steel')).toBe('High strength steel');
  });

  test('should handle special characters', () => {
    expect(formatNodeName('123material')).toBe('123material');
    expect(formatNodeName('-material')).toBe('-material');
  });
});

describe('truncateText', () => {
  test('should return original text when shorter than maxLength', () => {
    expect(truncateText('short', 10)).toBe('short');
    expect(truncateText('exact length', 12)).toBe('exact length');
    expect(truncateText('material', 8)).toBe('material');
  });

  test('should truncate text longer than maxLength and add ellipsis', () => {
    expect(truncateText('very long text', 5)).toBe('very ...');
    expect(truncateText('material property description', 10)).toBe('material p...');
  });

  test('should handle empty string', () => {
    expect(truncateText('', 10)).toBe('');
  });

  test('should handle null or undefined', () => {
    expect(truncateText(null as any, 10)).toBe(null);
    expect(truncateText(undefined as any, 10)).toBe(undefined);
  });

  test('should handle maxLength of 0', () => {
    expect(truncateText('text', 0)).toBe('...');
  });

  test('should handle negative maxLength', () => {
    expect(truncateText('text', -5)).toBe('...');
  });

  test('should handle text with special characters', () => {
    expect(truncateText('text\nwith\nnewlines', 10)).toBe('text\nwith\n...');
    expect(truncateText('text\twith\ttabs', 10)).toBe('text\twith\t...');
  });

  test('should handle very long text', () => {
    const longText = 'a'.repeat(1000);
    const result = truncateText(longText, 50);
    expect(result).toHaveLength(53); // 50 + '...' length (3)
    expect(result). toBe('a'.repeat(50) + '...');
  });

  test('should handle unicode characters correctly', () => {
    expect(truncateText('材质属性', 3)).toBe('材质属...');
    expect(truncateText('鋼鐵材料', 3)).toBe('鋼鐵材...');
  });
});