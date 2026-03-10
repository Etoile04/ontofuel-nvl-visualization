/**
 * NVL 类型扩展
 * 扩展 Neo4j NVL 的 Node 和 Relationship 类型
 */

import { Node as NVLNode, Relationship as NVLRelationship } from '@neo4j-nvl/base';

export interface OntologyNode extends NVLNode {
  name?: string;
  type?: 'class' | 'individual';
  class?: string;
  label?: string;
  comment?: string;
  uri?: string;
  color?: string;
  size?: number;
  [key: string]: any; // 允许其他自定义属性
}

export interface OntologyRelationship extends NVLRelationship {
  type?: string;  // 改为可选，与 NVL Relationship 兼容
  label?: string;
  comment?: string;
  [key: string]: any; // 允许其他自定义属性
}

export type Node = OntologyNode;
export type Relationship = OntologyRelationship;
