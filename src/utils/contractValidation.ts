/**
 * NVL 数据契约轻量校验（NFM-227 / NFM-226 ADR D2）。
 *
 * 仅校验契约必要项：顶层溯源字段、stats 计数键、节点 type 枚举、关系端点引用。
 * 刻意不引入 ajv 等重量级依赖以遵守前端 bundle 预算；完整 JSON Schema 校验
 * （Draft 2020-12）在 Python 侧 tests/test_nvl_contract.py 作为 conformance 门。
 *
 * 校验策略（与验收标准一致）：
 * - 缺失 schema_version：视为旧格式，向后兼容加载（仅要求 nodes 为数组），返回 warning。
 * - 含 schema_version：完整结构校验，失败则返回 errors 供 UI 展示友好错误。
 */
import type { Node, Relationship } from '../types/nvl';

export interface NvlContractStats {
  nodes: number;
  relationships: number;
  classes: number;
  individuals: number;
}

export interface NvlContract {
  schema_version?: string;
  generated_at?: string;
  source_ontology?: string;
  source_digest?: string;
  stats?: Partial<NvlContractStats>;
  nodes?: Node[];
  relationships?: Relationship[];
  [key: string]: unknown;
}

export interface ContractValidationResult {
  /** 是否为带版本契约（含 schema_version） */
  versioned: boolean;
  /** 校验是否通过；versionless 文件视为通过（向后兼容） */
  valid: boolean;
  /** 失败时的错误消息列表 */
  errors: string[];
  /** 对 versionless 文件的降级提示（调用方应 console.warn） */
  warning?: string;
  /** 契约版本（versionless 时为 undefined） */
  schemaVersion?: string;
}

const NODE_TYPES = new Set(['class', 'individual']);

const isNonEmptyString = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0;

/**
 * 校验 NVL 数据契约。
 *
 * @param data fetch/parse 后的原始对象
 * @returns 校验结果：versioned / valid / errors / warning / schemaVersion
 */
export function validateNvlContract(data: unknown): ContractValidationResult {
  if (typeof data !== 'object' || data === null) {
    return { versioned: false, valid: false, errors: ['数据不是有效对象'] };
  }

  const doc = data as Record<string, unknown>;
  const versioned = isNonEmptyString(doc.schema_version);

  // 缺失 schema_version：旧格式，向后兼容（仅要求 nodes 可用）
  if (!versioned) {
    const nodesOk = Array.isArray(doc.nodes);
    return {
      versioned: false,
      valid: nodesOk,
      errors: nodesOk ? [] : ['nodes 必须是数组'],
      warning: nodesOk
        ? 'NVL 数据缺少 schema_version，按旧格式向后兼容加载。建议重新生成为带版本契约的文件 (NFM-227)。'
        : undefined
    };
  }

  // 带版本契约：完整结构校验
  const errors: string[] = [];

  for (const key of ['generated_at', 'source_ontology', 'source_digest'] as const) {
    if (!isNonEmptyString(doc[key])) {
      errors.push(`缺少或无效的契约字段：${key}`);
    }
  }

  const stats = doc.stats;
  if (typeof stats !== 'object' || stats === null) {
    errors.push('缺少 stats 计数对象');
  } else {
    for (const key of ['nodes', 'relationships', 'classes', 'individuals'] as const) {
      const v = (stats as Record<string, unknown>)[key];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
        errors.push(`stats.${key} 必须为非负数字`);
      }
    }
  }

  const nodes = doc.nodes;
  if (!Array.isArray(nodes)) {
    errors.push('nodes 必须是数组');
  } else {
    nodes.forEach((node, i) => {
      if (typeof node !== 'object' || node === null) {
        errors.push(`节点 #${i} 不是有效对象`);
        return;
      }
      const n = node as Record<string, unknown>;
      if (!isNonEmptyString(n.id)) {
        errors.push(`节点 #${i} 缺少 id`);
      }
      if (typeof n.type !== 'string' || !NODE_TYPES.has(n.type)) {
        errors.push(`节点 #${i} (${String(n.id ?? i)}) 的 type 必须为 class 或 individual`);
      }
    });
  }

  const relationships = doc.relationships;
  if ('relationships' in doc && !Array.isArray(relationships)) {
    errors.push('relationships 必须是数组');
  } else if (Array.isArray(relationships) && Array.isArray(nodes)) {
    const nodeIds = new Set(nodes.map(n => (n as { id?: string }).id));
    relationships.forEach((rel, i) => {
      if (typeof rel !== 'object' || rel === null) {
        errors.push(`关系 #${i} 不是有效对象`);
        return;
      }
      const r = rel as Record<string, unknown>;
      for (const key of ['id', 'from', 'to', 'type'] as const) {
        if (!isNonEmptyString(r[key])) {
          errors.push(`关系 #${i} 缺少 ${key}`);
        }
      }
      if (isNonEmptyString(r.from) && !nodeIds.has(r.from)) {
        errors.push(`关系 #${i} 的 from 指向不存在的节点：${r.from}`);
      }
      if (isNonEmptyString(r.to) && !nodeIds.has(r.to)) {
        errors.push(`关系 #${i} 的 to 指向不存在的节点：${r.to}`);
      }
    });
  }

  return {
    versioned: true,
    valid: errors.length === 0,
    errors,
    schemaVersion: doc.schema_version as string
  };
}
