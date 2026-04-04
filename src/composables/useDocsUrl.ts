/**
 * 主应用内嵌的 VitePress 产物路径（与 vite base 一致）
 * 全页打开：build:with-docs 或 public 下已有 docs-app 后出现
 * 若在 Cursor/VSCode 内嵌浏览器看到 chrome-error +「Unsafe attempt to load…frame」，
 * 多为预览 iframe 限制或 /docs-app 与 VITE_APP_BASE 不一致导致首屏失败，请用系统浏览器或确认已 pnpm dev（含文档）。
 */
export function getDocsStaticPath(): string {
  const base = import.meta.env.BASE_URL;
  return `${base}docs-app/`;
}

/** 离开 SPA，进入静态文档站（站内链接由 VitePress 按 base 生成） */
export function navigateToBuiltDocs(): void {
  const path = getDocsStaticPath();
  window.location.assign(new URL(path, window.location.origin).href);
}
