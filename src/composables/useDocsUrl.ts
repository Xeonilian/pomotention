import { isTauri } from "@tauri-apps/api/core";

/**
 * 主应用内嵌的 VitePress 产物路径（与 vite base 一致）
 * 仅 Tauri（或本地打包产物）优先使用此路径。
 */
export function getDocsStaticPath(): string {
  const base = import.meta.env.BASE_URL;
  return `${base}docs-app/`;
}

/**
 * Web/PWA 的线上文档入口。
 * 可通过 VITE_HELP_DOCS_URL 覆盖；默认走 Cloudflare docs 站点。
 */
export function getWebDocsUrl(): string {
  const raw = (import.meta.env.VITE_HELP_DOCS_URL as string | undefined)?.trim();
  const url = raw && raw.length > 0 ? raw : "https://pomotention-docs.pages.dev/";
  return url.endsWith("/") ? url : `${url}/`;
}

/** 离开 SPA，进入帮助文档站 */
export function navigateToBuiltDocs(): void {
  if (isTauri()) {
    const path = getDocsStaticPath();
    window.location.assign(new URL(path, window.location.origin).href);
    return;
  }
  window.location.assign(getWebDocsUrl());
}
