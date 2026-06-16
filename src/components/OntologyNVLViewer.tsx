/**
 * OntoFuel 本体可视化 React 组件
 * 
 * 功能：
 * 1. 使用 Neo4j NVL 渲染本体图
 * 2. 支持交互（点击、悬停、缩放、平移）
 * 3. 支持搜索和过滤
 * 4. 支持节点详情查看
 * 5. 支持布局切换
 * 
 * 作者: OntoFuel Extractor
 * 创建时间: 2026-03-10
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InteractiveNvlWrapper } from '@neo4j-nvl/react';
import type { MouseEventCallbacks } from '@neo4j-nvl/react/lib/interactive-nvl-wrapper/types';
import type { Node, Relationship } from '../types/nvl';
import {
  exportToJSON,
  exportNodesToCSV,
  exportRelationshipsToCSV,
  exportToGraphML,
  exportToMarkdown,
  type ExportOptions
} from '../utils/exportUtils';
import { validateNvlContract } from '../utils/contractValidation';
import './OntologyNVLViewer.css';

// ✅ Task 4: 类型守卫
function isNode(obj: unknown): obj is Node {
  return typeof obj === 'object' && obj !== null && 'id' in obj;
}

function isRelationship(obj: unknown): obj is Relationship {
  return typeof obj === 'object' && obj !== null && 'id' in obj && 'start' in obj && 'end' in obj;
}

interface OntologyNVLViewerProps {
  /** NVL 数据文件路径 */
  dataUrl?: string;
  /** NVL 数据（直接传入） */
  data?: { nodes: Node[]; relationships: Relationship[] };
  /** 初始布局 */
  initialLayout?: 'forceDirected' | 'hierarchical' | 'circular';
  /** 容器高度 */
  height?: string;
  /** 容器宽度 */
  width?: string;
  /** 节点点击回调 */
  onNodeClick?: (node: Node) => void;
  /** 节点双击回调 */
  onNodeDoubleClick?: (node: Node) => void;
  /** 关系点击回调 */
  onRelationshipClick?: (rel: Relationship) => void;
  /** 嵌入模式：隐藏工具栏和侧边栏，仅展示图可视化 */
  embedMode?: boolean;
  /** 节点级深链 ?node=<id>：加载后自动选中/定位该节点（NFM-237 MUST #3） */
  initialNodeId?: string;
}

interface NodeDetails {
  id: string;
  name: string;
  type: string;
  class?: string;
  properties: Record<string, any>;
}

/**
 * 从 NVL 节点构造详情对象（点击选中 与 ?node 深链初选 共用，避免重复）。
 * 返回新对象，不修改入参（immutable）。
 */
function buildNodeDetails(node: Node): NodeDetails {
  const details: NodeDetails = {
    id: node.id,
    name: node.name || node.id,
    type: node.type || 'unknown',
    class: node.class,
    properties: {}
  };

  Object.keys(node).forEach(key => {
    if (!['id', 'name', 'type', 'class'].includes(key)) {
      details.properties[key] = (node as any)[key];
    }
  });

  return details;
}

/**
 * OntoFuel 本体可视化组件
 */
const OntologyNVLViewer: React.FC<OntologyNVLViewerProps> = ({
  dataUrl,
  data,
  initialLayout = 'forceDirected',
  height = '600px',
  width = '100%',
  onNodeClick,
  onNodeDoubleClick,
  onRelationshipClick,
  embedMode = false,
  initialNodeId
}) => {
  // 状态
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractVersion, setContractVersion] = useState<string | null>(null);
  const [layout, setLayout] = useState(initialLayout);
  const [selectedNode, setSelectedNode] = useState<NodeDetails | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportScope, setExportScope] = useState<'all' | 'filtered' | 'selected'>('all');
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());

  // 加载数据
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        let nvlData: { nodes: Node[]; relationships: Relationship[] } | null = null;

        if (data) {
          // 直接使用传入的数据
          nvlData = data;
        } else if (dataUrl) {
          // 从 URL 加载数据（添加超时和错误处理）
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          try {
            const response = await fetch(dataUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${response.statusText || 'Unknown error'}`);
            }

            // 安全的 JSON 解析
            const text = await response.text();
            try {
              nvlData = JSON.parse(text);
            } catch {
              throw new Error('Invalid JSON format in response');
            }
          } catch (err) {
            clearTimeout(timeoutId);
            if (err instanceof Error && err.name === 'AbortError') {
              throw new Error('Request timeout (10s). Please check your network.');
            }
            if (err instanceof TypeError && err.message.includes('fetch')) {
              throw new Error('Network error: unable to reach server');
            }
            throw err;
          }
        } else {
          throw new Error('Either data or dataUrl must be provided');
        }

        // ✅ P0 修复 1: 验证数据格式
        if (!nvlData) {
          throw new Error('Invalid data: received null or undefined');
        }

        // NFM-227: NVL 数据契约校验。
        // - 缺失 schema_version → 旧格式，向后兼容加载 + console.warn
        // - 带版本但校验失败 → 抛出用户友好错误（由错误态 UI 展示，避免静默白屏）
        const contractResult = validateNvlContract(nvlData);
        if (contractResult.warning) {
          console.warn(`[OntologyNVLViewer] ${contractResult.warning}`);
        }
        if (!contractResult.valid) {
          const shown = contractResult.errors.slice(0, 5);
          const more = contractResult.errors.length > shown.length
            ? `（共 ${contractResult.errors.length} 项问题，已显示前 ${shown.length} 项）`
            : '';
          throw new Error(`NVL 数据契约校验失败：${shown.join('；')}${more}`);
        }

        const parsed = nvlData as { nodes: Node[]; relationships?: Relationship[] };
        // relationships 缺失时降级为空数组（保持既有行为）
        if (!Array.isArray(parsed.relationships)) {
          console.warn('relationships is not an array, using empty array');
          parsed.relationships = [];
        }

        // ✅ P0 修复 2: 检查空数据
        if (parsed.nodes.length === 0) {
          console.warn('No nodes in data');
        }

        setContractVersion(contractResult.schemaVersion ?? null);
        setNodes(parsed.nodes);
        setRelationships(parsed.relationships);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
        console.error('Error loading NVL data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [data, dataUrl]);

  // ✅ P1 修复: 搜索过滤优化（使用 useMemo 替代 useEffect）
  const filteredNodes = useMemo(() => {
    if (!searchTerm) return nodes;
    
    const term = searchTerm.toLowerCase();
    return nodes.filter(node => {
      const name = node.name?.toLowerCase() || '';
      const label = node.label?.toLowerCase() || '';
      const type = node.type?.toLowerCase() || '';
      return name.includes(term) || label.includes(term) || type.includes(term);
    });
  }, [searchTerm, nodes]);

  // Filter relationships to only include those where both endpoints are in filteredNodes
  const filteredRelationships = useMemo(() => {
    if (!searchTerm) return relationships;

    const nodeIds = new Set(filteredNodes.map(node => node.id));
    return relationships.filter(
      rel => nodeIds.has(rel.from) && nodeIds.has(rel.to)
    );
  }, [searchTerm, relationships, filteredNodes]);

  // 选中节点：写入详情（侧边栏）+ 标记 selected 让 NVL 可视化高亮。
  // NFM-238 H1: embed 模式隐藏侧边栏（renderNodeDetails 的唯一宿主），selected 标志
  // 是深链 ?node 与点击在 embed 下唯一的可见反馈。
  const selectNode = useCallback((node: Node) => {
    setSelectedNode(buildNodeDetails(node));
    setNodes(prev => prev.map(n => ({ ...n, selected: n.id === node.id })));
  }, []);

  // 节点级深链 ?node=<id>：数据加载后自动选中/定位（NFM-237 MUST #3）
  useEffect(() => {
    if (!initialNodeId || nodes.length === 0) {
      return;
    }
    const match = nodes.find(n => n.id === initialNodeId);
    if (!match) {
      return;
    }
    selectNode(match);
  }, [initialNodeId, nodes, selectNode]);

  // 鼠标事件回调
  const mouseEventCallbacks: MouseEventCallbacks = {
    onNodeClick: (node: Node, hitElements: any, event: MouseEvent) => {
      selectNode(node);

      if (onNodeClick) {
        onNodeClick(node);
      }
    },

    onNodeDoubleClick: (node: Node, hitElements: any, event: MouseEvent) => {
      console.log('Node double-clicked:', node);
      if (onNodeDoubleClick) {
        onNodeDoubleClick(node);
      }
    },

    onRelationshipClick: (relationship: Relationship, hitElements: any, event: MouseEvent) => {
      console.log('Relationship clicked:', relationship);
      if (onRelationshipClick) {
        onRelationshipClick(relationship);
      }
    },

    onZoom: (zoomLevel: number) => {
      console.log('Zoom level:', zoomLevel);
    },

    onPan: (panning: { x: number; y: number }, event: MouseEvent) => {
      // 平移事件
      console.log('Pan:', panning);
    }
  };

  // NVL 选项
  const nvlOptions = {
    layout,
    initialzoom: 0.8,
    instanceid: 'ontofuel-nvl-viewer'
  };

  // 布局切换
  const handleLayoutChange = (newLayout: 'forceDirected' | 'hierarchical' | 'circular') => {
    setLayout(newLayout);
  };

  // 导出数据
  const handleExport = () => {
    const dataStr = JSON.stringify({ nodes: filteredNodes, relationships }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ontology_visualization.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 渲染节点详情
  const renderNodeDetails = () => {
    if (!selectedNode) return null;

    return (
      <div className="node-details-panel">
        <h3>{selectedNode.name}</h3>
        <div className="node-type">Type: {selectedNode.type}</div>
        {selectedNode.class && (
          <div className="node-class">Class: {selectedNode.class}</div>
        )}
        <div className="node-properties">
          <h4>Properties</h4>
          <ul>
            {Object.entries(selectedNode.properties).map(([key, value]) => (
              <li key={key}>
                <strong>{key}:</strong> {String(value)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  // 渲染统计信息
  const renderStats = () => {
    const classCount = nodes.filter(n => n.type === 'class').length;
    const individualCount = nodes.filter(n => n.type === 'individual').length;
    const hierarchyCount = relationships.filter(r => r.type === 'SUBCLASS_OF').length;
    const propertyCount = relationships.filter(r => r.type !== 'SUBCLASS_OF' && r.type !== 'INSTANCE_OF').length;

    return (
      <div className="stats-panel">
        <h4>Statistics</h4>
        <div>Classes: {classCount}</div>
        <div>Individuals: {individualCount}</div>
        <div>Hierarchy Relations: {hierarchyCount}</div>
        <div>Property Relations: {propertyCount}</div>
        <div className="contract-version">
          Contract: {contractVersion ?? 'legacy (no schema_version)'}
        </div>
      </div>
    );
  };

  return (
    <div className="ontology-nvl-viewer" style={{ width, height }}>
      {/* 工具栏 — embed mode hides it */}
      {!embedMode && (
      <div className="toolbar">
        {/* 搜索框 */}
        <input
          type="text"
          placeholder="Search nodes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
          aria-label="Search nodes"
          aria-describedby="search-hint"
        />
        <span id="search-hint" style={{ display: 'none' }}>
          Search by node name, label, or type
        </span>

        {/* 布局选择 */}
        <select
          value={layout}
          onChange={(e) => handleLayoutChange(e.target.value as 'forceDirected' | 'hierarchical' | 'circular')}
          className="layout-select"
          aria-label="Select graph layout"
        >
          <option value="forceDirected">Force Directed</option>
          <option value="hierarchical">Hierarchical</option>
          <option value="circular">Circular</option>
        </select>

        {/* 导出菜单 */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="export-button"
            aria-label="Export menu"
            aria-expanded={showExportMenu}
          >
            📥 Export {showExportMenu ? '▲' : '▼'}
          </button>
          
          {showExportMenu && (
            <div className="export-menu" role="menu">
              <div className="export-menu-header">
                <strong>Export Options</strong>
              </div>
              
              <div className="export-scope-options">
                <label>
                  <input
                    type="radio"
                    name="exportScope"
                    value="all"
                    checked={exportScope === 'all'}
                    onChange={(e) => setExportScope(e.target.value as 'all')}
                  />
                  All nodes ({nodes.length})
                </label>
                <label>
                  <input
                    type="radio"
                    name="exportScope"
                    value="filtered"
                    checked={exportScope === 'filtered'}
                    onChange={(e) => setExportScope(e.target.value as 'filtered')}
                    disabled={searchTerm === ''}
                  />
                  Filtered ({filteredNodes.length})
                </label>
              </div>
              
              <div className="export-divider" />
              
              <button
                onClick={() => {
                  const options: ExportOptions = {
                    scope: exportScope,
                    includeRelationships: true,
                    selectedNodeIds
                  };
                  exportToJSON(
                    exportScope === 'filtered' ? filteredNodes : nodes,
                    relationships,
                    options
                  );
                  setShowExportMenu(false);
                }}
                className="export-menu-item"
                role="menuitem"
              >
                📄 Export as JSON
              </button>
              
              <button
                onClick={() => {
                  const options: ExportOptions = {
                    scope: exportScope,
                    includeRelationships: false,
                    selectedNodeIds
                  };
                  exportNodesToCSV(
                    exportScope === 'filtered' ? filteredNodes : nodes,
                    relationships,
                    options
                  );
                  setShowExportMenu(false);
                }}
                className="export-menu-item"
                role="menuitem"
              >
                📊 Export Nodes as CSV
              </button>
              
              <button
                onClick={() => {
                  const options: ExportOptions = {
                    scope: exportScope,
                    includeRelationships: true,
                    selectedNodeIds
                  };
                  exportRelationshipsToCSV(
                    exportScope === 'filtered' ? filteredNodes : nodes,
                    relationships,
                    options
                  );
                  setShowExportMenu(false);
                }}
                className="export-menu-item"
                role="menuitem"
              >
                🔗 Export Relationships as CSV
              </button>
              
              <button
                onClick={() => {
                  const options: ExportOptions = {
                    scope: exportScope,
                    includeRelationships: true,
                    selectedNodeIds
                  };
                  exportToGraphML(
                    exportScope === 'filtered' ? filteredNodes : nodes,
                    relationships,
                    options
                  );
                  setShowExportMenu(false);
                }}
                className="export-menu-item"
                role="menuitem"
              >
                🗺️ Export as GraphML
              </button>
              
              <button
                onClick={() => {
                  const options: ExportOptions = {
                    scope: exportScope,
                    includeRelationships: true,
                    selectedNodeIds
                  };
                  exportToMarkdown(
                    exportScope === 'filtered' ? filteredNodes : nodes,
                    relationships,
                    options
                  );
                  setShowExportMenu(false);
                }}
                className="export-menu-item"
                role="menuitem"
              >
                📝 Export as Markdown Report
              </button>
            </div>
          )}
        </div>
      </div>
      )}
      <div className="content">
        {/* embed 模式最小搜索 (NFM-237 MUST #2)：复用既有 searchTerm/filteredNodes，
            工具栏隐藏时仍保留一个最小搜索框，避免 700+ 节点图不可用。 */}
        {embedMode && (
          <div className="embed-search-bar">
            <input
              type="search"
              placeholder="搜索节点…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="embed-search-input"
              aria-label="搜索节点"
            />
            {searchTerm && (
              <button
                type="button"
                className="embed-search-clear"
                onClick={() => setSearchTerm('')}
                aria-label="清除搜索"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* 加载状态 */}
        {loading && (
          <div className="loading" role="status" aria-live="polite">
            <div className="spinner" aria-hidden="true"></div>
            <p>Loading ontology data...</p>
          </div>
        )}

        {/* 错误状态 */}
        {error && (
          <div className="error" role="alert">
            <span className="error-icon">⚠️</span>
            <p>Error: {error}</p>
            <button
              onClick={() => window.location.reload()}
              aria-label="Retry loading data"
              style={{
                marginTop: '12px',
                padding: '8px 16px',
                border: '1px solid #e74c3c',
                borderRadius: '4px',
                background: 'white',
                color: '#e74c3c',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* NVL 可视化 */}
        {!loading && !error && (
          <div className="nvl-container">
            <InteractiveNvlWrapper
              nodes={filteredNodes}
              rels={filteredRelationships}
              mouseEventCallbacks={mouseEventCallbacks}
              {...nvlOptions}
            />
          </div>
        )}

        {/* ✅ P0 修复 2: 空数据状态提示 */}
        {!loading && !error && nodes.length === 0 && (
          <div className="empty-state" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 10
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
              No data available
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              Check your data source or try another file
            </p>
          </div>
        )}

        {/* 搜索无结果提示 */}
        {!loading && !error && filteredNodes.length === 0 && nodes.length > 0 && (
          <div className="no-results" style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            zIndex: 10
          }}>
            <p style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>
              No nodes match your search
            </p>
            <p style={{ fontSize: '14px', color: '#999', marginBottom: '16px' }}>
              Try different keywords or clear the search
            </p>
            <button
              onClick={() => setSearchTerm('')}
              style={{
                padding: '8px 16px',
                border: '1px solid #4A90E2',
                borderRadius: '4px',
                background: 'white',
                color: '#4A90E2',
                cursor: 'pointer'
              }}
            >
              Clear Search
            </button>
          </div>
        )}

        {/* 侧边栏 — embed mode hides it */}
        {!embedMode && (
        <div className="sidebar">
          {renderStats()}
          {renderNodeDetails()}
        </div>
        )}
      </div>
    </div>
  );
};

export default OntologyNVLViewer;
