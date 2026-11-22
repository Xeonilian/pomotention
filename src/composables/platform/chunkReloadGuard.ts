/** 懒加载 / preload chunk 失败时的一次性刷新守卫与 PWA 更新标记 */

export const CHUNK_RELOAD_FLAG = "chunk-reload";
export const PWA_UPDATING_KEY = "pwa-updating";

export function markPwaUpdating(version?: string) {
  try {
    const v = version ?? String(import.meta.env.VITE_APP_VERSION ?? "1");
    localStorage.setItem(PWA_UPDATING_KEY, v);
  } catch {
    /* 隐私模式等 */
  }
}

export function clearPwaUpdating() {
  try {
    localStorage.removeItem(PWA_UPDATING_KEY);
  } catch {
    /* 隐私模式等 */
  }
}

export function clearChunkReloadFlag() {
  try {
    sessionStorage.removeItem(CHUNK_RELOAD_FLAG);
  } catch {
    /* 隐私模式等 */
  }
}

/** 启动成功后清守卫与 updating 标记 */
export function clearBootRecoveryFlags() {
  clearChunkReloadFlag();
  clearPwaUpdating();
}

/**
 * 守卫未置位 → 置位、写 updating、reload，返回 true。
 * 守卫已置位 → 返回 false（调用方应提示用户，勿再自动 reload）。
 */
export function tryReloadOnceForStaleChunk(): boolean {
  try {
    if (sessionStorage.getItem(CHUNK_RELOAD_FLAG)) return false;
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, "1");
  } catch {
    /* 隐私模式等：仍尝试刷新一次 */
  }
  markPwaUpdating();
  window.location.reload();
  return true;
}

export function dispatchAppNavError() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("app-nav-error"));
}
