import { useSettingStore } from "@/stores/useSettingStore";

/** 写入设置页「音频诊断」，不抛错以免影响播放链 */
export function dbgAudio(message: string, extra?: Record<string, unknown>) {
  try {
    const tail = extra !== undefined ? ` ${JSON.stringify(extra)}` : "";
    useSettingStore().pushAudioDebugLog(`${message}${tail}`);
  } catch {
    /* Pinia 未就绪等 */
  }
}
