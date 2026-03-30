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
