import { getOrCreateAudioContext, getAudioContext } from "./audioContext";
import { dbgAudio } from "./debug";
import { isAppleTouchWebKitDevice } from "./platform";
import type { SoundType } from "./types";
import { soundPaths } from "./types";
import { getOrDecodeCueBuffer } from "./cueBuffers";
import { duckHtmlWhiteNoiseForCuePlayback } from "./whiteNoiseHtml";

/** 桌面 Web Audio 提示音输出增益；与 HTML 白噪音同时播时需压低，避免听感上「提示:白噪音≈5:1」 */
const CUE_WEB_AUDIO_GAIN = 0.42;

const soundCache = new Map<SoundType, HTMLAudioElement>();

function applyHtmlAudioPlaysInline(el: HTMLAudioElement) {
  el.setAttribute("playsinline", "true");
  (el as unknown as { playsInline?: boolean }).playsInline = true;
}

function getSound(type: SoundType): HTMLAudioElement {
  if (!soundCache.has(type)) {
    const audio = new Audio(soundPaths[type]);
    audio.preload = "auto";
    applyHtmlAudioPlaysInline(audio);
    soundCache.set(type, audio);
  }
  return soundCache.get(type)!;
}

/** Apple 触控：提示音用 HTMLAudio，与白噪音同属「元素 play」解锁链，不依赖先开白噪音 */
export function playCueHtml(type: SoundType): Promise<void> {
  const el = getSound(type);
  el.volume = 1;
  el.currentTime = 0;
  return el.play();
}

/** Web Audio 播放单条提示音；成功返回 true */
export async function tryPlayCueWebAudio(type: SoundType): Promise<boolean> {
  getOrCreateAudioContext();
  const ctx = getAudioContext();
  if (!ctx) return false;
  const decodeP = getOrDecodeCueBuffer(type);
  await ctx.resume().catch(() => {});
  if ((ctx.state as AudioContextState | "interrupted") === "interrupted") {
    await ctx.resume().catch(() => {});
  }
  if (ctx.state !== "running") {
    dbgAudio("[WebAudio cue] skip ctx not running", { type, state: ctx.state });
    return false;
  }
  try {
    const buf = await decodeP;
    if (!buf) return false;
    // 白噪音为 HTML 全音量时易盖过 Web Audio 提示音，按缓冲时长 duck
    duckHtmlWhiteNoiseForCuePlayback(buf.duration * 1000 + 180);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = CUE_WEB_AUDIO_GAIN;
    src.buffer = buf;
    src.connect(g).connect(ctx.destination);
    src.start(0);
    dbgAudio("[WebAudio cue] play OK", { type, sec: buf.duration });
    return true;
  } catch (e) {
    dbgAudio("[WebAudio cue] play FAIL", {
      type,
      message: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

async function playSoundAsync(type: SoundType): Promise<void> {
  if (isAppleTouchWebKitDevice()) {
    try {
      duckHtmlWhiteNoiseForCuePlayback(2800);
      await playCueHtml(type);
      dbgAudio("[HTML cue] play OK", { type });
      return;
    } catch (error) {
      dbgAudio("[HTML cue] play FAIL → WebAudio", {
        type,
        name: error instanceof Error ? error.name : "unknown",
        message: error instanceof Error ? error.message : String(error),
      });
      if (await tryPlayCueWebAudio(type)) return;
    }
  }

  if (await tryPlayCueWebAudio(type)) return;

  try {
    duckHtmlWhiteNoiseForCuePlayback(2200);
    await playCueHtml(type);
    dbgAudio("[HTML cue] fallback OK", { type });
  } catch (error) {
    console.error("Failed to play sound:", type, error);
    dbgAudio("[HTML cue] fallback FAIL", {
      type,
      name: error instanceof Error ? error.name : "unknown",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 定点提示音：Apple 触控上主走 HTMLAudio；桌面主走 Web Audio；失败再 HTML 兜底。
 */
export function playSound(type: SoundType): void {
  const ctx = getOrCreateAudioContext();
  if (ctx?.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
  void playSoundAsync(type);
}
