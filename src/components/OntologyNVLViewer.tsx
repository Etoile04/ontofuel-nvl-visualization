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
}

interface NodeDetails {
  id: string;
  name: string;
  type: string;
  class?: string;
  properties: Record<string, any>;
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
  onRelationshipClick
}) => {
  // 状态
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

        if (!Array.isArray(nvlData.nodes)) {
          throw new Error('Invalid data format: nodes must be an array');
        }

        if (!Array.isArray(nvlData.relationships)) {
          console.warn('relationships is not an array, using empty array');
          nvlData.relationships = [];
        }

        // ✅ P0 修复 2: 检查空数据
        if (nvlData.nodes.length === 0) {
          console.warn('No nodes in data');
        }

        setNodes(nvlData.nodes);
        setRelationships(nvlData.relationships);
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

  // 鼠标事件回调
  const mouseEventCallbacks: MouseEventCallbacks = {
    onNodeClick: (node: Node, hitElements: any, event: MouseEvent) => {
      console.log('Node clicked:', node);
      
      // 提取节点详情
      const details: NodeDetails = {
        id: node.id,
        name: node.name || node.id,
        type: node.type || 'unknown',
        class: node.class,
        properties: {}
      };

      // 提取所有属性
      Object.keys(node).forEach(key => {
        if (!['id', 'name', 'type', 'class'].includes(key)) {
          details.properties[key] = (node as any)[key];
        }
      });

      setSelectedNode(details);
      
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
      </div>
    );
  };

  return (
    <div className="ontology-nvl-viewer" style={{ width, height }}>
      {/* 工具栏 */}
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

      {/* 主内容区 */}
      <div className="content">
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
              rels={relationships}
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

        {/* 侧边栏 */}
        <div className="sidebar">
          {renderStats()}
          {renderNodeDetails()}
        </div>
      </div>
    </div>
  );
};

export default OntologyNVLViewer;
