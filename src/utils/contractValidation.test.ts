/**
 * Unit tests for validateNvlContract (NFM-227).
 * Covers versionless backward-compat, versioned conformance, and failure modes.
 */
import { validateNvlContract } from './contractValidation';

const validVersioned = {
  schema_version: '1.0',
  generated_at: '2026-06-17T00:00:00+00:00',
  source_ontology: 'data/material_ontology_enhanced.json',
  source_digest: '0d986d21a5a2b230',
  stats: { nodes: 2, relationships: 1, classes: 2, individuals: 0 },
  nodes: [
    { id: 'class_A', type: 'class' },
    { id: 'class_B', type: 'class' }
  ],
  relationships: [
    { id: 'r1', from: 'class_A', to: 'class_B', type: 'SUBCLASS_OF' }
  ]
};

describe('validateNvlContract (NFM-227)', () => {
  test('versionless 数据：valid=true + warning（向后兼容）', () => {
    const r = validateNvlContract({ nodes: [{ id: 'n1', type: 'class' }], relationships: [] });
    expect(r.versioned).toBe(false);
    expect(r.valid).toBe(true);
    expect(r.warning).toMatch(/schema_version/);
    expect(r.schemaVersion).toBeUndefined();
  });

  test('带版本合规契约：valid=true，versioned=true', () => {
    const r = validateNvlContract(validVersioned);
    expect(r.versioned).toBe(true);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.schemaVersion).toBe('1.0');
  });

  test('节点 type 非法：valid=false', () => {
    const r = validateNvlContract({ ...validVersioned, nodes: [{ id: 'n1', type: 'bogus' }] });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('type'))).toBe(true);
  });

  test('节点缺 type：valid=false', () => {
    const r = validateNvlContract({ ...validVersioned, nodes: [{ id: 'n1' }] });
    expect(r.valid).toBe(false);
  });

  test('关系端点悬空：valid=false', () => {
    const r = validateNvlContract({
      ...validVersioned,
      relationships: [{ id: 'r1', from: 'class_A', to: 'missing', type: 'SUBCLASS_OF' }]
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('to'))).toBe(true);
  });

  test('接受 INSTANCE_OF / SUBCLASS_OF / 领域动词作为关系 type', () => {
    for (const t of ['INSTANCE_OF', 'SUBCLASS_OF', 'hasComposition']) {
      const r = validateNvlContract({
        ...validVersioned,
        relationships: [{ id: 'r1', from: 'class_A', to: 'class_B', type: t }]
      });
      expect(r.valid).toBe(true);
    }
  });

  test('缺少溯源字段：valid=false', () => {
    const r = validateNvlContract({
      schema_version: '1.0',
      nodes: [{ id: 'n1', type: 'class' }],
      relationships: []
    });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('source_digest'))).toBe(true);
  });

  test('stats 缺键：valid=false', () => {
    const r = validateNvlContract({ ...validVersioned, stats: { nodes: 2, relationships: 1 } });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.includes('classes'))).toBe(true);
  });

  test('非对象输入：valid=false', () => {
    expect(validateNvlContract(null).valid).toBe(false);
    expect(validateNvlContract('not an object').valid).toBe(false);
  });

  test('versionless 但 nodes 非数组：valid=false', () => {
    const r = validateNvlContract({ nodes: 'nope' });
    expect(r.valid).toBe(false);
  });
});
