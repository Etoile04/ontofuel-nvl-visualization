/**
 * 工具函数集合
 * 提供通用的字符串处理方法
 */

/**
 * 将名称首字母大写
 * @param name - 原始名称
 * @returns 首字母大写后的名称
 */
export function formatNodeName(name: string): string {
  if (!name || name.length === 0) {
    return name;
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/**
 * 截断文本并在超出时添加省略号
 * @param text - 原始文本
 * @param maxLength - 最大长度
 * @returns 截断后的文本（超出时末尾添加 "..."）
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + '...';
}
