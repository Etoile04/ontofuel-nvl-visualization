/**
 * nodeDeepLink.test.ts — NFM-237 MUST #3
 * 节点级深链 ?node=<id> 的纯函数契约：
 *   - getNodeIdFromSearch: 从 query string 解析节点 id（trim，空/缺失返回 null）
 *   - setNodeInUrl: 用 history.replaceState 写入 ?node=，保留既有 embed/data 等参数
 */
import { getNodeIdFromSearch, setNodeInUrl } from './nodeDeepLink';

describe('getNodeIdFromSearch (NFM-237 MUST #3)', () => {
  test('?node=class-1 → "class-1"', () => {
    expect(getNodeIdFromSearch('?node=class-1')).toBe('class-1');
  });

  test('与其他参数共存时仍正确读取 node', () => {
    expect(getNodeIdFromSearch('?embed=true&data=https://x/y.json&node=class-1')).toBe('class-1');
  });

  test('空字符串 → null', () => {
    expect(getNodeIdFromSearch('')).toBeNull();
  });

  test('无 node 参数 → null', () => {
    expect(getNodeIdFromSearch('?embed=true&data=x')).toBeNull();
  });

  test('node 值为空 → null', () => {
    expect(getNodeIdFromSearch('?node=')).toBeNull();
  });

  test('node 值为纯空白 → null（trim 后判空）', () => {
    expect(getNodeIdFromSearch('?node=%20%20')).toBeNull();
  });

  test('对 id 做 trim', () => {
    expect(getNodeIdFromSearch('?node=%20class-1%20')).toBe('class-1');
  });
});

describe('setNodeInUrl (NFM-237 MUST #3)', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete (window as any).location;
    (window as any).location = new URL('http://localhost/?embed=true&data=https://x/y.json');
  });

  afterEach(() => {
    (window as any).location = originalLocation;
    jest.restoreAllMocks();
  });

  test('写入 ?node= 并保留既有 embed/data 参数', () => {
    const spy = jest.spyOn(window.history, 'replaceState');
    setNodeInUrl('class-1');

    expect(spy).toHaveBeenCalledTimes(1);
    const url = String(spy.mock.calls[0][2]);
    const params = new URLSearchParams(url.split('?')[1] || '');
    expect(params.get('node')).toBe('class-1');
    expect(params.get('embed')).toBe('true');
    expect(params.get('data')).toBe('https://x/y.json');
  });

  test('空/空白 nodeId 不触碰 URL', () => {
    const spy = jest.spyOn(window.history, 'replaceState');
    setNodeInUrl('   ');
    expect(spy).not.toHaveBeenCalled();
  });

  test('已存在 ?node= 时更新而非追加重复键', () => {
    (window as any).location = new URL('http://localhost/?node=old&embed=true');
    const spy = jest.spyOn(window.history, 'replaceState');
    setNodeInUrl('new');

    const url = String(spy.mock.calls[0][2]);
    const params = new URLSearchParams(url.split('?')[1] || '');
    expect(params.get('node')).toBe('new');
    expect(params.getAll('node')).toHaveLength(1);
    expect(params.get('embed')).toBe('true');
  });
});
