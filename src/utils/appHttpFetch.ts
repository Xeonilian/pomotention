import { isTauri } from "@tauri-apps/api/core";
import { xhrFetch } from "@/utils/xhrFetch";

/** 桌面 macOS WebView UA（不含 iPhone/iPad 等移动 Safari） */
export function isMacDesktopUserAgent(): boolean {
  if (typeof navigator === "undefined") return false;
  return /macintosh|mac os x/i.test(navigator.userAgent);
}

/**
 * 唯一切换点：Tauri 正式包 + macOS 桌面走 XHR，其余一律 fetch。
 * 与 Supabase、版本检查等共用，避免重复判断。
 */
export function shouldUseMacPackagedXhr(): boolean {
  return import.meta.env.PROD && isTauri() && isMacDesktopUserAgent();
}

export async function appHttpFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  if (shouldUseMacPackagedXhr()) return xhrFetch(input, init);
  return fetch(input, init);
}

/** 设置页 / 粘贴诊断用 */
export function getAppHttpFetchSnapshot() {
  return {
    viteProd: import.meta.env.PROD,
    isTauri: isTauri(),
    macDesktopUa: isMacDesktopUserAgent(),
    transport: shouldUseMacPackagedXhr() ? ("xhr" as const) : ("fetch" as const),
  };
}
