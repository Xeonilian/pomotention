import { useSettingStore } from "@/stores/useSettingStore";
import { dbgAudio } from "./debug";
import { getAudioContext } from "./audioContext";
import { isHtmlWhiteNoiseActive, resumeHtmlWhiteNoiseIfNeeded, startWhiteNoiseHtml, stopHtmlWhiteNoise } from "./whiteNoiseHtml";
import { SoundType, soundPaths } from "./types";

/** 雨声/鸟鸣等非滴答轨的基础音量（0–1）；与 Web Audio 提示音混音时不宜过低，否则听感像「提示远大于白噪音」 */
const WHITE_NOISE_AMBIENT_VOLUME = 0.98;

/** 全平台白噪音：仅 HTML 双轨 crossfade（可调接缝，不依赖 Web Audio loop） */
export function startWhiteNoise(): void {
  const settingStore = useSettingStore();
  if (!settingStore.settings.isWhiteNoiseEnabled) return;

  stopWhiteNoise();

  const track = settingStore.settings.whiteNoiseSoundTrack;
  const src = soundPaths[track];
  const vol = track === SoundType.WORK_TICK ? 1 : WHITE_NOISE_AMBIENT_VOLUME;
  if (!src) {
    dbgAudio("[WN] whiteNoiseSoundTrack 无映射，已改存 work_tick，请再切换/开始一次", { track });
    settingStore.settings.whiteNoiseSoundTrack = SoundType.WORK_TICK;
    return;
  }

  startWhiteNoiseHtml(src, vol);
}

export function stopWhiteNoise(): void {
  try {
    stopHtmlWhiteNoise();
    dbgAudio("[WN] stopWhiteNoise", {
      ctxState: getAudioContext()?.state ?? "no-ctx",
    });
  } catch (e) {
    console.log("[WN] stopWhiteNoise 外层错误:", e);
  }
}

export function toggleWhiteNoise(): void {
  const settingStore = useSettingStore();
  settingStore.settings.isWhiteNoiseEnabled = !settingStore.settings.isWhiteNoiseEnabled;
  if (!settingStore.settings.isWhiteNoiseEnabled) {
    stopWhiteNoise();
    return;
  }
  void import("@/stores/useTimerStore")
    .then(({ useTimerStore }) => {
      if (!useSettingStore().settings.isWhiteNoiseEnabled) return;
      const ts = useTimerStore();
      if (ts.isActive && ts.isWorking) {
        startWhiteNoise();
      }
    })
    .catch(() => {
      /* Pinia 未就绪等 */
    });
}

function tryRestartWhiteNoiseIfNeeded(): void {
  try {
    if (!useSettingStore().settings.isWhiteNoiseEnabled) return;
    if (isHtmlWhiteNoiseActive()) return;
    void import("@/stores/useTimerStore")
      .then(({ useTimerStore }) => {
        if (!useSettingStore().settings.isWhiteNoiseEnabled) return;
        const ts = useTimerStore();
        if (ts.isActive && ts.isWorking) {
          startWhiteNoise();
          dbgAudio("[WN] 前台恢复后补拉白噪音", { reason: "无 HTML 双轨实例" });
        }
      })
      .catch(() => {});
  } catch {
    /* Pinia 未就绪 */
  }
}

/**
 * 休眠/合盖唤醒后须先 await，再跑墙钟 reconcile；否则 finalize 里 playSound 时 AudioContext 仍 suspended，日志可能 play OK 但听不到。
 */
export async function resumeSharedAudioAfterForegroundAsync(): Promise<void> {
  resumeHtmlWhiteNoiseIfNeeded();

  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === "running") {
    tryRestartWhiteNoiseIfNeeded();
    return;
  }

  try {
    await ctx.resume();
  } catch (e: unknown) {
    dbgAudio("[WN] resumeSharedAudio 拒绝", {
      message: e instanceof Error ? e.message : String(e),
    });
  }
  tryRestartWhiteNoiseIfNeeded();
}

/** 锁屏/切后台后 AudioContext 可能 suspend；不等待 resume（与 reconcile 并发时可能无声） */
export function resumeSharedAudioAfterForeground(): void {
  void resumeSharedAudioAfterForegroundAsync();
}
