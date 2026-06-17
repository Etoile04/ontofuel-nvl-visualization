/**
 * NFM-228 Task 4 — multi-format export regression (AC#2).
 *
 * Asserts the CONTENT shape produced by the export functions (GraphML / Markdown /
 * relationship-CSV / JSON) and the scope=selected filter (L1). These are
 * characterization/regression tests for already-shipped behavior (NFM-49 export),
 * so they are expected to pass immediately.
 *
 * Content is captured by intercepting the Blob passed to downloadFile.
 * URL.createObjectURL/anchor.click are stubbed so jsdom does not attempt real
 * navigation (the historical failure was a bad createElement mock returning
 * undefined — we do NOT mock createElement here).
 */
import {
  exportToGraphML,
  exportToMarkdown,
  exportRelationshipsToCSV,
  exportNodesToCSV,
  exportToJSON,
  type ExportOptions
} from './exportUtils';
import type { Node, Relationship } from '../types/nvl';

const baseOpt = (
  scope: ExportOptions['scope'],
  selected?: Set<string>
): ExportOptions => ({
  scope,
  includeRelationships: true,
  ...(selected ? { selectedNodeIds: selected } : {})
});

// --- capture content from downloadFile -> new Blob([content]) ---
let lastContent = '';
const RealBlob = global.Blob;

function captureBlob(): void {
  lastContent = '';
  global.Blob = class extends RealBlob {
    constructor(parts?: BlobPart[], opts?: BlobPropertyBag) {
      lastContent = (parts ?? [])
        .map((p) => (typeof p === 'string' ? p : ''))
        .join('');
      super(parts as BlobPart[], opts);
    }
  } as unknown as typeof Blob;
}

function restoreBlob(): void {
  global.Blob = RealBlob;
}

const nodes: Node[] = [
  { id: 'class_A', type: 'class', name: 'Alpha' },
  { id: 'class_B', type: 'class', name: 'Beta' },
  { id: 'ind_1', type: 'individual', name: 'IndOne' }
];
const relationships: Relationship[] = [
  { id: 'r1', from: 'class_A', to: 'class_B', type: 'SUBCLASS_OF' },
  { id: 'r2', from: 'ind_1', to: 'class_A', type: 'INSTANCE_OF' }
];

describe('exportUtils multi-format + scope (NFM-228 Task 4)', () => {
  beforeEach(() => {
    captureBlob();
    jest.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    jest.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    jest.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    restoreBlob();
    jest.restoreAllMocks();
  });

  test('exportToGraphML emits <graphml>/<node>/<edge> with source+target', () => {
    exportToGraphML(nodes, relationships, baseOpt('all'));
    expect(lastContent).toContain('<graphml');
    expect(lastContent).toContain('<node id="class_A"');
    expect(lastContent).toContain('<edge');
    expect(lastContent).toContain('source="class_A"');
    expect(lastContent).toContain('target="class_B"');
  });

  test('exportToMarkdown emits top-level heading + stats section + node name', () => {
    exportToMarkdown(nodes, relationships, baseOpt('all'));
    expect(lastContent).toMatch(/^#\s/);
    expect(lastContent).toContain('## 统计信息');
    expect(lastContent).toContain('Alpha');
    // scope is reflected in the report body
    expect(lastContent).toContain('全部数据');
  });

  test('exportRelationshipsToCSV header contains from,to,type and data rows present', () => {
    exportRelationshipsToCSV(nodes, relationships, baseOpt('all'));
    const lines = lastContent.split('\n');
    expect(lines[0]).toContain('from');
    expect(lines[0]).toContain('to');
    expect(lines[0]).toContain('type');
    expect(lines.length).toBeGreaterThanOrEqual(3); // header + 2 relationships
    expect(lastContent).toContain('SUBCLASS_OF');
  });

  test('scope=selected (L1): relationship CSV only includes rels between selected nodes', () => {
    const selected = new Set(['class_A', 'class_B']);
    exportRelationshipsToCSV(nodes, relationships, baseOpt('selected', selected));
    expect(lastContent).toContain('class_A');
    expect(lastContent).toContain('class_B');
    expect(lastContent).toContain('SUBCLASS_OF');
    // individual + its INSTANCE_OF relationship are out of scope
    expect(lastContent).not.toContain('ind_1');
    expect(lastContent).not.toContain('INSTANCE_OF');
  });

  test('scope=selected (L1): node CSV only includes selected nodes', () => {
    const selected = new Set(['class_A']);
    exportNodesToCSV(nodes, relationships, baseOpt('selected', selected));
    expect(lastContent).toContain('class_A');
    expect(lastContent).toContain('Alpha');
    expect(lastContent).not.toContain('class_B');
    expect(lastContent).not.toContain('ind_1');
  });

  test('scope=filtered: honors the pre-filtered node set passed in', () => {
    // Only the two class nodes are in the (already-filtered) set; the individual
    // and its INSTANCE_OF relationship must therefore be excluded.
    const filteredNodes = nodes.slice(0, 2);
    exportRelationshipsToCSV(filteredNodes, relationships, baseOpt('filtered'));
    expect(lastContent).toContain('SUBCLASS_OF');
    expect(lastContent).not.toContain('INSTANCE_OF');
  });

  test('exportToJSON produces valid JSON with all nodes/relationships', () => {
    exportToJSON(nodes, relationships, baseOpt('all'));
    const parsed = JSON.parse(lastContent);
    expect(Array.isArray(parsed.nodes)).toBe(true);
    expect(parsed.nodes).toHaveLength(3);
    expect(parsed.relationships).toHaveLength(2);
  });
});
