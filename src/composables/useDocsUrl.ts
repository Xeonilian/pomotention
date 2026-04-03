/**
 * 内嵌帮助 iframe 地址（与 vite base、vue-router history 一致）
 * - 开发：经 Vite 代理到 VitePress（另开 pnpm docs:dev:app，端口 5173）
 * - 生产：需 pnpm build:with-docs，静态资源在 dist/<base>docs-app/
 */
export function getDocsIframeSrc(): string {
  const base = import.meta.env.BASE_URL;
  return `${base}docs-app/`;
}
