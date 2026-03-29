import { useSettingStore } from "@/stores/useSettingStore";

/** iOS 真机可导出：与 NDJSON ingest 双写（ingest 仅本机调试会话可用） */
const DBG_INGEST = "http://127.0.0.1:7242/ingest/a855573f-7487-43d2-8f8d-5dee3311857f";

/**
 * Debug session 4748a7：结构化快照，供假设 H1–H5 对照；真机请复制设置里含 [DBG4748a7] 的行。
 */
export function dbgIosPlaybackProbe4748(
  hypothesisId: string,
  location: string,
  message: string,
  data: Record<string, unknown>,
) {
  const payload = {
    sessionId: "4748a7",
    hypothesisId,
    location,
    message,
    data,
    timestamp: Date.now(),
  };
  // #region agent log
  fetch(DBG_INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "4748a7" },
    body: JSON.stringify(payload),
  }).catch(() => {});
  // #endregion
  try {
    dbgAudio(`[DBG4748a7] ${message}`, { hypothesisId, location, ...data });
  } catch {
    /* Pinia 未就绪等 */
  }
}

/** 写入设置页「音频诊断」，不抛错以免影响播放链 */
export function dbgAudio(message: string, extra?: Record<string, unknown>) {
  try {
    const tail = extra !== undefined ? ` ${JSON.stringify(extra)}` : "";
    useSettingStore().pushAudioDebugLog(`${message}${tail}`);
  } catch {
    /* Pinia 未就绪等 */
  }
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
