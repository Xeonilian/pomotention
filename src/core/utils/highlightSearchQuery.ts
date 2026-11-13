/** 转义 RegExp 特殊字符 */
export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 转义 HTML，避免高亮时注入 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 纯文本：转义后按关键字包 <mark class="search-hit">（大小写不敏感）。
 * query 为空则只转义、不高亮。
 */
export function highlightSearchInText(text: string, query: string): string {
  const q = query.trim();
  const escaped = escapeHtml(text ?? "");
  if (!q) return escaped;
  const re = new RegExp(escapeRegExp(escapeHtml(q)), "gi");
  return escaped.replace(re, (m) => `<mark class="search-hit">${m}</mark>`);
}

/**
 * 已渲染 HTML：只在标签外的文本节点上高亮（不破坏标签结构）。
 * query 为空原样返回。
 */
export function highlightSearchInHtml(html: string, query: string): string {
  const q = query.trim();
  if (!q || !html) return html ?? "";
  const re = new RegExp(`(${escapeRegExp(q)})`, "gi");
  return html.replace(/(<[^>]*>)|([^<]+)/g, (match, tag: string | undefined, text: string | undefined) => {
    if (tag) return tag;
    if (!text) return match;
    return text.replace(re, '<mark class="search-hit">$1</mark>');
  });
}
