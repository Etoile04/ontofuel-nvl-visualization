/**
 * exportUtils.test.ts
 * Comprehensive tests for export utility functions
 */

import {
  exportToJSON,
  exportNodesToCSV,
  exportRelationshipsToCSV,
  exportToGraphML,
  exportToMarkdown,
  type ExportOptions
} from './exportUtils';
import type { Node, Relationship } from '../types/nvl';

// Mock the DOM APIs for file download
class MockBlob {
  constructor(public content: string[], public options: { type: string }) {}
}

Object.defineProperty(global, 'Blob', {
  value: MockBlob,
  writable: true,
  configurable: true
});

Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: jest.fn(() => 'mock-url'),
    revokeObjectURL: jest.fn()
  },
  writable: true,
  configurable: true
});

// Anchor element captured from the last createElement('a') call; tests assert
// against it (e.g. mockAnchor.click triggered, mockAnchor.download filename).
let mockAnchor: any;

const createMockElement = (tag: string) => {
  const mockElement: any = {
    tagName: tag,
    style: {},
    click: jest.fn()
  };

  if (tag === 'a') {
    // Create fresh object for each anchor element
    const anchorData = { href: '', download: '' };

    Object.defineProperty(mockElement, 'href', {
      get: function() { return anchorData.href; },
      set: function(value) { anchorData.href = value; },
      enumerable: true,
      configurable: true
    });
    Object.defineProperty(mockElement, 'download', {
      get: function() { return anchorData.download; },
      set: function(value) { anchorData.download = value; },
      enumerable: true,
      configurable: true
    });

    mockAnchor = mockElement;
  }

  return mockElement;
};

const mockBody = {
  appendChild: jest.fn(),
  removeChild: jest.fn()
};

Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn((tag: string) => createMockElement(tag)),
    body: mockBody
  },
  writable: true,
  configurable: true
});

// Mock alert
global.alert = jest.fn() as any;

describe('exportUtils', () => {
  // Mock test data
  const mockNodes: Node[] = [
    {
      id: 'class-1',
      name: 'Material',
      type: 'class',
      label: 'Material',
      uri: 'http://example.org/Material',
      comment: 'Base material class'
    },
    {
      id: 'individual-1',
      name: 'Steel',
      type: 'individual',
      class: 'Material',
      label: 'Steel'
    },
    {
      id: 'class-2',
      name: 'Property',
      type: 'class',
      label: 'Property'
    },
    {
      id: 'individual-2',
      name: 'High Strength Steel',
      type: 'individual',
      class: 'Material',
      label: 'High Strength Steel',
      customProperty: 'customValue'
    }
  ];

  const mockRelationships: Relationship[] = [
    {
      id: 'rel-1',
      from: 'class-1',
      to: 'class-2',
      type: 'HAS_PROPERTY'
    },
    {
      id: 'rel-2',
      from: 'individual-1',
      to: 'class-1',
      type: 'INSTANCE_OF'
    },
    {
      id: 'rel-3',
      from: 'individual-2',
      to: 'class-1',
      type: 'INSTANCE_OF'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // CRA defaults set `resetMocks: true`, which calls .mockReset() on every
    // jest.fn before each test and strips the top-level implementations below
    // (document.createElement / URL.createObjectURL). Re-establish them here so
    // downloadFile keeps getting a real anchor + object URL instead of undefined.
    (document.createElement as unknown as jest.Mock).mockImplementation((tag: string) =>
      createMockElement(tag)
    );
    (URL.createObjectURL as unknown as jest.Mock).mockImplementation(() => 'mock-url');
  });

  describe('exportToJSON', () => {
    test('should export all nodes and relationships to JSON', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: true
      };

      exportToJSON(mockNodes, mockRelationships, options);

      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toMatch(/ontology.*\.json$/);
    });

    test('should export filtered nodes and relationships', () => {
      const options: ExportOptions = {
        scope: 'filtered',
        includeRelationships: true
      };

      exportToJSON(mockNodes, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    test('should export only selected nodes', () => {
      const selectedIds = new Set(['class-1', 'individual-1']);
      const options: ExportOptions = {
        scope: 'selected',
        includeRelationships: true,
        selectedNodeIds: selectedIds
      };

      exportToJSON(mockNodes, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    test('should export nodes without relationships when includeRelationships is false', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportToJSON(mockNodes, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    test('should use custom filename prefix', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: true,
        filenamePrefix: 'custom-ontology'
      };

      exportToJSON(mockNodes, mockRelationships, options);

      expect(mockAnchor.download).toMatch(/custom-ontology.*\.json$/);
    });
  });

  describe('exportNodesToCSV', () => {
    test('should export nodes to CSV', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportNodesToCSV(mockNodes, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toMatch(/_nodes\.csv$/);
    });

    test('should handle nodes with special characters', () => {
      const nodesWithSpecialChars: Node[] = [
        {
          id: 'node-1',
          name: 'Node, with "quotes"',
          type: 'class',
          description: 'Text\nwith\nnewlines'
        },
        {
          id: 'node-2',
          name: 'Normal Node',
          type: 'class'
        }
      ];

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportNodesToCSV(nodesWithSpecialChars, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    test('should show alert when no nodes to export', () => {
      const options: ExportOptions = {
        scope: 'selected',
        includeRelationships: false,
        selectedNodeIds: new Set(['non-existent'])
      };

      exportNodesToCSV(mockNodes, mockRelationships, options);

      expect(global.alert).toHaveBeenCalledWith('No nodes to export');
      expect(mockAnchor.click).not.toHaveBeenCalled();
    });

    test('should handle empty node data', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportNodesToCSV([], mockRelationships, options);

      expect(global.alert).toHaveBeenCalledWith('No nodes to export');
    });

    test('should export filtered nodes', () => {
      const selectedIds = new Set(['class-1', 'class-2']);
      const options: ExportOptions = {
        scope: 'selected',
        includeRelationships: false,
        selectedNodeIds: selectedIds
      };

      exportNodesToCSV(mockNodes, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
    });
  });

  describe('exportRelationshipsToCSV', () => {
    test('should export relationships to CSV', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: true
      };

      exportRelationshipsToCSV(mockNodes, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toMatch(/_relationships\.csv$/);
    });

    test('should export relationships with special characters', () => {
      const relationshipsWithSpecialChars: Relationship[] = [
        {
          id: 'rel-1',
          from: 'class-1',
          to: 'class-2',
          type: 'HAS, "Property"',
          description: 'Relationship\nwith\nnewlines'
        }
      ];

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: true
      };

      exportRelationshipsToCSV(
        mockNodes,
        relationshipsWithSpecialChars,
        options
      );

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    test('should show alert when no relationships to export', () => {
      const options: ExportOptions = {
        scope: 'selected',
        includeRelationships: true,
        selectedNodeIds: new Set(['isolated-node'])
      };

      exportRelationshipsToCSV(mockNodes, mockRelationships, options);

      expect(global.alert).toHaveBeenCalledWith('No relationships to export');
      expect(mockAnchor.click).not.toHaveBeenCalled();
    });

    test('should handle empty relationship data', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: true
      };

      exportRelationshipsToCSV(mockNodes, [], options);

      expect(global.alert).toHaveBeenCalledWith('No relationships to export');
    });

    test('should filter relationships by selected nodes', () => {
      const selectedIds = new Set(['class-1', 'individual-1']);
      const options: ExportOptions = {
        scope: 'selected',
        includeRelationships: true,
        selectedNodeIds: selectedIds
      };

      exportRelationshipsToCSV(mockNodes, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
    });
  });

  describe('exportToGraphML', () => {
    test('should export to GraphML format', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: true
      };

      exportToGraphML(mockNodes, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toMatch(/\.graphml$/);
    });

    test('should include XML declaration and namespaces', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: true
      };

      exportToGraphML(mockNodes, mockRelationships, options);

      const blobCall = (URL.createObjectURL as jest.Mock).mock.calls[0][0];
      const content = blobCall.content[0];

      expect(content).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(content).toContain('<graphml xmlns="http://graphml.graphdrawing.org/xmlns">');
      expect(content).toContain('</graphml>');
    });

    test('should escape XML special characters in node data', () => {
      const nodesWithSpecialChars: Node[] = [
        {
          id: 'node-1',
          name: 'Node & <Tag>',
          type: 'class',
          description: 'Text with "quotes" and \'apostrophes\''
        }
      ];

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportToGraphML(nodesWithSpecialChars, [], options);

      const blobCall = (URL.createObjectURL as jest.Mock).mock.calls[0][0];
      const content = blobCall.content[0];

      expect(content).toContain('&amp;');
      expect(content).toContain('&lt;');
      expect(content).toContain('&gt;');
      expect(content).toContain('&quot;');
      expect(content).toContain('&apos;');
    });

    test('should handle nodes with custom attributes', () => {
      const nodeWithCustomAttributes: Node[] = [
        {
          id: 'node-1',
          name: 'Custom Node',
          type: 'class',
          customAttr1: 'value1',
          customAttr2: 123,
          nested: { object: 'data' }
        }
      ];

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportToGraphML(nodeWithCustomAttributes, [], options);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    test('should export relationships with edges', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: true
      };

      exportToGraphML(mockNodes, mockRelationships, options);

      const blobCall = (URL.createObjectURL as jest.Mock).mock.calls[0][0];
      const content = blobCall.content[0];

      expect(content).toContain('<edge ');
      expect(content).toContain('source=');
      expect(content).toContain('target=');
    });

    test('should filter relationships by selected nodes', () => {
      const selectedIds = new Set(['class-1']);
      const options: ExportOptions = {
        scope: 'selected',
        includeRelationships: true,
        selectedNodeIds: selectedIds
      };

      exportToGraphML(mockNodes, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
    });
  });

  describe('exportToMarkdown', () => {
    test('should export ontology report to Markdown', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: true
      };

      exportToMarkdown(mockNodes, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockAnchor.download).toMatch(/_report\.md$/);
    });

    test('should include statistics in markdown', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: true
      };

      exportToMarkdown(mockNodes, mockRelationships, options);

      const blobCall = (URL.createObjectURL as jest.Mock).mock.calls[0][0];
      const content = blobCall.content[0];

      expect(content).toContain('# 本体可视化报告');
      expect(content).toContain('**导出时间**:');
      expect(content).toContain('## 统计信息');
      expect(content).toContain('**节点总数**:');
      expect(content).toContain('**关系总数**:');
    });

    test('should include node lists separated by type', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportToMarkdown(mockNodes, mockRelationships, options);

      const blobCall = (URL.createObjectURL as jest.Mock).mock.calls[0][0];
      const content = blobCall.content[0];

      expect(content).toContain('### 类 (Classes)');
      expect(content).toContain('### 个体 (Individuals)');
      expect(content).toContain('Material');
      expect(content).toContain('Steel');
    });

    test('should limit individual display to 50 items', () => {
      const manyIndividuals: Node[] = Array.from({ length: 100 }, (_, i) => ({
        id: `individual-${i}`,
        name: `Individual ${i}`,
        type: 'individual'
      }));

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportToMarkdown(manyIndividuals, [], options);

      const blobCall = (URL.createObjectURL as jest.Mock).mock.calls[0][0];
      const content = blobCall.content[0];

      expect(content).toContain('*（还有 50 个个体未显示）*');
    });

    test('should include node comments and URIs when available', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportToMarkdown(mockNodes, mockRelationships, options);

      const blobCall = (URL.createObjectURL as jest.Mock).mock.calls[0][0];
      const content = blobCall.content[0];

      expect(content).toContain('Base material class');
      expect(content).toContain('**URI**: http://example.org/Material');
    });

    test('should handle empty data', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportToMarkdown([], [], options);

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
    });

    test('should show scope in report', () => {
      const options: ExportOptions = {
        scope: 'filtered',
        includeRelationships: false
      };

      exportToMarkdown(mockNodes, mockRelationships, options);

      const blobCall = (URL.createObjectURL as jest.Mock).mock.calls[0][0];
      const content = blobCall.content[0];

      expect(content).toContain('**导出范围**: 过滤结果');
    });
  });

  describe('filterData edge cases', () => {
    test('should handle all scope', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: true
      };

      exportToJSON(mockNodes, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    test('should handle selected scope with no matches', () => {
      const options: ExportOptions = {
        scope: 'selected',
        includeRelationships: true,
        selectedNodeIds: new Set(['non-existent'])
      };

      exportToJSON(mockNodes, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    test('should handle selected scope with empty selectedNodeIds', () => {
      const options: ExportOptions = {
        scope: 'selected',
        includeRelationships: true,
        selectedNodeIds: new Set()
      };

      exportToJSON(mockNodes, mockRelationships, options);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('formatCSVValue edge cases', () => {
    test('should handle values with commas', () => {
      const nodeWithComma: Node[] = [
        {
          id: 'node-1',
          name: 'Value, with, commas',
          type: 'class'
        }
      ];

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportNodesToCSV(nodeWithComma, [], options);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    test('should handle values with quotes', () => {
      const nodeWithQuotes: Node[] = [
        {
          id: 'node-1',
          name: 'Value with "quotes" inside',
          type: 'class'
        }
      ];

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportNodesToCSV(nodeWithQuotes, [], options);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    test('should handle values with newlines', () => {
      const nodeWithNewlines: Node[] = [
        {
          id: 'node-1',
          name: 'Value\nwith\nnewlines',
          type: 'class'
        }
      ];

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportNodesToCSV(nodeWithNewlines, [], options);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    test('should handle null and undefined values', () => {
      const nodeWithNulls: Node[] = [
        {
          id: 'node-1',
          name: 'Test Node',
          type: 'class',
          description: null,
          comment: undefined
        }
      ];

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportNodesToCSV(nodeWithNulls, [], options);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    test('should handle numeric values', () => {
      const nodeWithNumbers: Node[] = [
        {
          id: 'node-1',
          name: 'Test Node',
          type: 'class',
          count: 123,
          ratio: 45.67
        }
      ];

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportNodesToCSV(nodeWithNumbers, [], options);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    test('should handle boolean values', () => {
      const nodeWithBooleans: Node[] = [
        {
          id: 'node-1',
          name: 'Test Node',
          type: 'class',
          active: true,
          deprecated: false
        }
      ];

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportNodesToCSV(nodeWithBooleans, [], options);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('escapeXML edge cases', () => {
    test('should handle all special characters in GraphML export', () => {
      const nodeWithAllSpecialChars: Node[] = [
        {
          id: 'node-1',
          name: 'Test & < > " \' \\',
          type: 'class',
          description: 'Multiple special chars: & < > " \''
        }
      ];

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportToGraphML(nodeWithAllSpecialChars, [], options);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    test('should handle ampersand in various positions', () => {
      const nodeWithAmpersand: Node[] = [
        {
          id: 'node-1',
          name: 'AT&T',
          type: 'class',
          comment: 'Comment & more'
        }
      ];

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportToGraphML(nodeWithAmpersand, [], options);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    test('should handle angle brackets in attributes', () => {
      const nodeWithBrackets: Node[] = [
        {
          id: 'node-1',
          name: 'Tag',
          type: 'class',
          label: '<HTML>'
        }
      ];

      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportToGraphML(nodeWithBrackets, [], options);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('downloadFile integration', () => {
    test('should trigger download for JSON export', () => {
      const options: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportToJSON(mockNodes, [], options);

      // Verify download was triggered
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    test('should trigger download for CSV export', () => {
      const csvOptions: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportNodesToCSV(mockNodes, [], csvOptions);

      // Verify download was triggered
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    test('should trigger download for GraphML export', () => {
      const graphmlOptions: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportToGraphML(mockNodes, [], graphmlOptions);

      // Verify download was triggered
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });

    test('should trigger download for Markdown export', () => {
      const mdOptions: ExportOptions = {
        scope: 'all',
        includeRelationships: false
      };

      exportToMarkdown(mockNodes, [], mdOptions);

      // Verify download was triggered
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
    });
  });
});