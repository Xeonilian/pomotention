import { useSettingStore } from "@/stores/useSettingStore";

/** 写入设置页「音频诊断」，不抛错以免影响播放链 */
export function dbgAudio(message: string, extra?: Record<string, unknown>) {
  try {
    const tail = extra !== undefined ? ` ${JSON.stringify(extra)}` : "";
    useSettingStore().pushAudioDebugLog(`${message}${tail}`);
  } catch {
    /* Pinia 未就绪等：生产环境可开控制台对照 */
    try {
      console.warn("[audio-dbg]", message, extra ?? "");
    } catch {
      /* 忽略 */
    }
  }
}

/** 检查 SW 状态并记录到音频诊断 (v3 debug for iPhone cache issue) */
export function dbgSwStatus() {
  if (!("serviceWorker" in navigator)) {
    dbgAudio("[SW] Not supported");
    return;
  }
  navigator.serviceWorker.getRegistration().then(reg => {
    if (!reg) {
      dbgAudio("[SW] No registration");
      return;
    }
    dbgAudio("[SW] Registration", {
      active: !!reg.active,
      waiting: !!reg.waiting,
      installing: !!reg.installing,
      controller: !!navigator.serviceWorker.controller,
      scope: reg.scope
    });
  }).catch(e => dbgAudio("[SW] getRegistration failed", { error: String(e) }));
}

/** 同类高频事件节流，避免息屏长测刷屏 */
export function dbgAudioThrottled(key: string, windowMs: number, message: string, extra?: Record<string, unknown>) {
  type G = typeof globalThis & { __pomoAudioDbgThrottle?: Map<string, number> };
  const g = globalThis as G;
  if (!g.__pomoAudioDbgThrottle) g.__pomoAudioDbgThrottle = new Map();
  const map = g.__pomoAudioDbgThrottle;
  const now = Date.now();
  const last = map.get(key) ?? 0;
  if (now - last < windowMs) return;
  map.set(key, now);
  dbgAudio(message, extra);
}

export function postAudioRuntimeDebug(
  runId: string,
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
): void {
  // #region agent log
  fetch("http://127.0.0.1:7242/ingest/a855573f-7487-43d2-8f8d-5dee3311857f", {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "9643b2" },
    body: JSON.stringify({
      sessionId: "9643b2",
      runId,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
}
