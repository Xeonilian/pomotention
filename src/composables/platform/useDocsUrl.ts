import { isTauri } from "@tauri-apps/api/core";

/** 整页进帮助前写入；timerStore 在 pagehide 时据此跳过 intentional-exit，避免返回后清空计时 */
export const SESSION_MARKER_FULL_NAV_TO_HELP = "pomotention-marker-fullnav-help";

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
 * 优先走同源 docs-app（保持在 PWA scope 内）；若显式配置 VITE_HELP_DOCS_URL 则使用外链。
 */
export function getWebDocsUrl(): string {
  const raw = (import.meta.env.VITE_HELP_DOCS_URL as string | undefined)?.trim();
  if (raw && raw.length > 0) {
    return raw.endsWith("/") ? raw : `${raw}/`;
  }
  return new URL(getDocsStaticPath(), window.location.origin).href;
}

function markFullNavToHelpForNextPagehide(): void {
  try {
    sessionStorage.setItem(SESSION_MARKER_FULL_NAV_TO_HELP, "1");
  } catch {
    /* 私密模式等 */
  }
}

/** 离开 SPA，进入帮助文档站（当前页跳转，不另开标签/弹层） */
export function navigateToBuiltDocs(): void {
  markFullNavToHelpForNextPagehide();
  if (isTauri()) {
    const path = getDocsStaticPath();
    window.location.assign(new URL(path, window.location.origin).href);
    return;
  }
  window.location.assign(getWebDocsUrl());
}
