/**
 * nodeDeepLink.ts — NFM-237 MUST #3
 *
 * 节点级深链：`?node=<id>`
 *   - 加载时定位/选中该节点（由 OntologyNVLViewer 的 initialNodeId 实现）
 *   - 点击节点时同步 URL（由 App 的 onNodeClick 调用 setNodeInUrl）
 *
 * 这两个函数刻意保持为纯/可注入：getNodeIdFromSearch 是纯函数，
 * setNodeInUrl 通过 history.replaceState 写入，保留既有 embed/data/corpus 参数。
 */

/**
 * 从 query string 解析 `?node=<id>`。
 * @returns trim 后的节点 id；不存在或为空白时返回 null。
 */
export function getNodeIdFromSearch(search: string): string | null {
  if (!search) {
    return null;
  }
  const params = new URLSearchParams(search);
  const raw = params.get('node');
  if (raw === null) {
    return null;
  }
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * 用 `history.replaceState` 把 `?node=<id>` 写入当前 URL，保留其它查询参数。
 * 不触发导航/历史条目（replaceState），适合点击节点时静默同步深链。
 * 空/空白 id 时为 no-op。
 */
export function setNodeInUrl(nodeId: string): void {
  const trimmed = nodeId?.trim();
  if (!trimmed) {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  params.set('node', trimmed);
  const search = params.toString();
  const url = search ? `${window.location.pathname}?${search}` : window.location.pathname;
  window.history.replaceState(null, '', url);
}
