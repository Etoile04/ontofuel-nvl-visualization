/**
 * 导出工具类
 * 支持多种格式的数据导出
 * 
 * 支持格式：
 * - JSON（完整数据）
 * - CSV（节点/关系表格）
 * - GraphML（用于其他图工具）
 * - Markdown（用于文档）
 */

import type { Node, Relationship } from '../types/nvl';

export interface ExportOptions {
  /** 导出范围：'all' | 'filtered' | 'selected' */
  scope: 'all' | 'filtered' | 'selected';
  /** 包含关系 */
  includeRelationships: boolean;
  /** 文件名前缀 */
  filenamePrefix?: string;
  /** 选中的节点 ID（当 scope='selected' 时） */
  selectedNodeIds?: Set<string>;
}

/**
 * 导出为 JSON
 */
export function exportToJSON(
  nodes: Node[],
  relationships: Relationship[],
  options: ExportOptions
): void {
  const data = filterData(nodes, relationships, options);
  const jsonStr = JSON.stringify(data, null, 2);
  downloadFile(jsonStr, `${getFilename(options)}.json`, 'application/json');
}

/**
 * 导出节点为 CSV
 */
export function exportNodesToCSV(
  nodes: Node[],
  relationships: Relationship[],
  options: ExportOptions
): void {
  const { nodes: filteredNodes } = filterData(nodes, relationships, options);
  
  if (filteredNodes.length === 0) {
    alert('No nodes to export');
    return;
  }

  // 收集所有可能的属性字段
  const allKeys = new Set<string>();
  filteredNodes.forEach(node => {
    Object.keys(node).forEach(key => allKeys.add(key));
  });
  const headers = Array.from(allKeys).sort();

  // 生成 CSV
  const rows = filteredNodes.map(node => {
    return headers.map(key => {
      const value = (node as any)[key];
      return formatCSVValue(value);
    }).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, `${getFilename(options)}_nodes.csv`, 'text/csv');
}

/**
 * 导出关系为 CSV
 */
export function exportRelationshipsToCSV(
  nodes: Node[],
  relationships: Relationship[],
  options: ExportOptions
): void {
  const { relationships: filteredRels, nodeIds } = filterData(nodes, relationships, options);
  
  // 只导出与选中节点相关的关系
  const relsToExport = options.scope === 'selected' 
    ? filteredRels.filter(r => nodeIds.has(r.from) && nodeIds.has(r.to))
    : filteredRels;

  if (relsToExport.length === 0) {
    alert('No relationships to export');
    return;
  }

  // 收集所有可能的属性字段
  const allKeys = new Set<string>(['id', 'from', 'to', 'type']);
  relsToExport.forEach(rel => {
    Object.keys(rel).forEach(key => allKeys.add(key));
  });
  const headers = Array.from(allKeys).sort();

  // 生成 CSV
  const rows = relsToExport.map(rel => {
    return headers.map(key => {
      const value = (rel as any)[key];
      return formatCSVValue(value);
    }).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\n');
  downloadFile(csv, `${getFilename(options)}_relationships.csv`, 'text/csv');
}

/**
 * 导出为 GraphML（用于 Gephi、Cytoscape 等）
 */
export function exportToGraphML(
  nodes: Node[],
  relationships: Relationship[],
  options: ExportOptions
): void {
  const { nodes: filteredNodes, relationships: filteredRels, nodeIds } = filterData(nodes, relationships, options);
  
  // 只导出与选中节点相关的关系
  const relsToExport = options.scope === 'selected' 
    ? filteredRels.filter(r => nodeIds.has(r.from) && nodeIds.has(r.to))
    : filteredRels;

  // 收集所有属性键
  const nodeAttributes = new Set<string>();
  const edgeAttributes = new Set<string>();
  
  filteredNodes.forEach(node => {
    Object.keys(node).forEach(key => {
      if (!['id', 'name', 'type'].includes(key)) {
        nodeAttributes.add(key);
      }
    });
  });

  relsToExport.forEach(rel => {
    Object.keys(rel).forEach(key => {
      if (!['id', 'from', 'to', 'type'].includes(key)) {
        edgeAttributes.add(key);
      }
    });
  });

  // 生成 GraphML
  let graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns">
  <key id="name" for="node" attr.name="name" attr.type="string"/>
  <key id="type" for="node" attr.name="type" attr.type="string"/>
  <key id="label" for="node" attr.name="label" attr.type="string"/>
`;

  // 添加节点属性定义
  Array.from(nodeAttributes).forEach((attr, i) => {
    graphml += `  <key id="node_attr_${i}" for="node" attr.name="${attr}" attr.type="string"/>\n`;
  });

  // 添加边属性定义
  Array.from(edgeAttributes).forEach((attr, i) => {
    graphml += `  <key id="edge_attr_${i}" for="edge" attr.name="${attr}" attr.type="string"/>\n`;
  });

  graphml += `  <graph id="G" edgedefault="undirected">\n`;

  // 添加节点
  filteredNodes.forEach(node => {
    graphml += `    <node id="${escapeXML(node.id)}">\n`;
    graphml += `      <data key="name">${escapeXML(node.name || node.id)}</data>\n`;
    if (node.type) {
      graphml += `      <data key="type">${escapeXML(node.type)}</data>\n`;
    }
    if (node.label) {
      graphml += `      <data key="label">${escapeXML(node.label)}</data>\n`;
    }
    
    // 添加其他属性
    Object.entries(node).forEach(([key, value]) => {
      if (!['id', 'name', 'type', 'label'].includes(key) && value !== undefined) {
        const attrIndex = Array.from(nodeAttributes).indexOf(key);
        if (attrIndex !== -1) {
          graphml += `      <data key="node_attr_${attrIndex}">${escapeXML(String(value))}</data>\n`;
        }
      }
    });
    
    graphml += `    </node>\n`;
  });

  // 添加边
  relsToExport.forEach((rel, index) => {
    const edgeId = rel.id || `e${index}`;
    graphml += `    <edge id="${escapeXML(edgeId)}" source="${escapeXML(rel.from)}" target="${escapeXML(rel.to)}">\n`;
    if (rel.type) {
      graphml += `      <data key="type">${escapeXML(rel.type)}</data>\n`;
    }
    
    // 添加其他属性
    Object.entries(rel).forEach(([key, value]) => {
      if (!['id', 'from', 'to', 'type'].includes(key) && value !== undefined) {
        const attrIndex = Array.from(edgeAttributes).indexOf(key);
        if (attrIndex !== -1) {
          graphml += `      <data key="edge_attr_${attrIndex}">${escapeXML(String(value))}</data>\n`;
        }
      }
    });
    
    graphml += `    </edge>\n`;
  });

  graphml += `  </graph>\n`;
  graphml += `</graphml>`;

  downloadFile(graphml, `${getFilename(options)}.graphml`, 'application/xml');
}

/**
 * 导出为 Markdown 报告
 */
export function exportToMarkdown(
  nodes: Node[],
  relationships: Relationship[],
  options: ExportOptions
): void {
  const { nodes: filteredNodes, relationships: filteredRels, nodeIds } = filterData(nodes, relationships, options);
  const relsToExport = options.scope === 'selected' 
    ? filteredRels.filter(r => nodeIds.has(r.from) && nodeIds.has(r.to))
    : filteredRels;

  // 统计
  const classCount = filteredNodes.filter(n => n.type === 'class').length;
  const individualCount = filteredNodes.filter(n => n.type === 'individual').length;
  const hierarchyCount = relsToExport.filter(r => r.type === 'SUBCLASS_OF').length;
  const propertyCount = relsToExport.filter(r => r.type !== 'SUBCLASS_OF' && r.type !== 'INSTANCE_OF').length;

  let markdown = `# 本体可视化报告

**导出时间**: ${new Date().toLocaleString('zh-CN')}
**导出范围**: ${options.scope === 'all' ? '全部数据' : options.scope === 'filtered' ? '过滤结果' : '选中节点'}

## 统计信息

- **节点总数**: ${filteredNodes.length}
  - 类 (Classes): ${classCount}
  - 个体 (Individuals): ${individualCount}
- **关系总数**: ${relsToExport.length}
  - 层次关系: ${hierarchyCount}
  - 属性关系: ${propertyCount}

## 节点列表

### 类 (Classes)

`;

  const classes = filteredNodes.filter(n => n.type === 'class');
  classes.forEach(node => {
    markdown += `#### ${node.name || node.id}\n\n`;
    if (node.comment) {
      markdown += `${node.comment}\n\n`;
    }
    if (node.uri) {
      markdown += `**URI**: ${node.uri}\n\n`;
    }
    markdown += `---\n\n`;
  });

  markdown += `\n### 个体 (Individuals)\n\n`;

  const individuals = filteredNodes.filter(n => n.type === 'individual');
  individuals.slice(0, 50).forEach(node => { // 限制为 50 个，避免文档过长
    markdown += `#### ${node.name || node.id}\n\n`;
    if (node.class) {
      markdown += `**类型**: ${node.class}\n\n`;
    }
    if (node.comment) {
      markdown += `${node.comment}\n\n`;
    }
    markdown += `---\n\n`;
  });

  if (individuals.length > 50) {
    markdown += `\n*（还有 ${individuals.length - 50} 个个体未显示）*\n\n`;
  }

  downloadFile(markdown, `${getFilename(options)}_report.md`, 'text/markdown');
}

/**
 * 过滤数据
 */
function filterData(
  nodes: Node[],
  relationships: Relationship[],
  options: ExportOptions
): { nodes: Node[]; relationships: Relationship[]; nodeIds: Set<string> } {
  let filteredNodes = nodes;
  let nodeIds = new Set<string>();

  if (options.scope === 'selected' && options.selectedNodeIds) {
    filteredNodes = nodes.filter(n => options.selectedNodeIds!.has(n.id));
    nodeIds = new Set(filteredNodes.map(n => n.id));
  } else if (options.scope === 'filtered') {
    nodeIds = new Set(nodes.map(n => n.id));
  } else {
    nodeIds = new Set(nodes.map(n => n.id));
  }

  const filteredRelationships = options.includeRelationships
    ? relationships.filter(r => nodeIds.has(r.from) && nodeIds.has(r.to))
    : [];

  return { nodes: filteredNodes, relationships: filteredRelationships, nodeIds };
}

/**
 * 生成文件名
 */
function getFilename(options: ExportOptions): string {
  const prefix = options.filenamePrefix || 'ontology';
  const scope = options.scope === 'all' ? '' : `_${options.scope}`;
  const timestamp = new Date().toISOString().split('T')[0];
  return `${prefix}${scope}_${timestamp}`;
}

/**
 * 格式化 CSV 值
 */
function formatCSVValue(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // 如果包含逗号、引号或换行，需要用引号包裹
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * 转义 XML 特殊字符
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * 下载文件
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
