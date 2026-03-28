import { getOrCreateAudioContext, getAudioContext } from "./audioContext";
import { dbgAudio } from "./debug";
import { isAppleTouchWebKitDevice, preferHtmlAudioCueFirst } from "./platform";
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

/** iOS/Android：提示音用 HTMLAudio，与白噪音同属「元素 play」链，避免仅 Web Audio 在后台挂起 */
export function playCueHtml(type: SoundType): Promise<void> {
  const el = getSound(type);
  el.volume = 1;
  el.currentTime = 0;
  return el.play();
}

/** iOS：AudioContext 已 running 时定时 cue 先走 Web Audio，避免 HTML play() 反复 NotAllowed */
function preferWebAudioCueFirstOnIos(): boolean {
  const ctx = getAudioContext();
  return isAppleTouchWebKitDevice() && ctx !== null && ctx.state === "running";
}

/** Web Audio 播放单条提示音；成功返回 true */
export async function tryPlayCueWebAudio(type: SoundType, opts?: { silent?: boolean }): Promise<boolean> {
  const silent = opts?.silent === true;
  getOrCreateAudioContext();
  const ctx = getAudioContext();
  if (!ctx) return false;
  const decodeP = getOrDecodeCueBuffer(type);
  await ctx.resume().catch(() => {});
  if ((ctx.state as AudioContextState | "interrupted") === "interrupted") {
    await ctx.resume().catch(() => {});
  }
  if (ctx.state !== "running") {
    if (!silent) {
      dbgAudio("[cue] WebAudio skip", { type, state: ctx.state });
    }
    return false;
  }
  try {
    const buf = await decodeP;
    if (!buf) return false;
    duckHtmlWhiteNoiseForCuePlayback(buf.duration * 1000 + 180);
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.value = CUE_WEB_AUDIO_GAIN;
    src.buffer = buf;
    src.connect(g).connect(ctx.destination);
    src.start(0);
    if (!silent) {
      dbgAudio("[cue] OK", { type, path: "web", sec: buf.duration });
    }
    return true;
  } catch (e) {
    if (!silent) {
      dbgAudio("[cue] WebAudio FAIL", {
        type,
        message: e instanceof Error ? e.message : String(e),
      });
    }
    return false;
  }
}

function dbgCueFail(type: SoundType, step: string, error: unknown) {
  dbgAudio("[cue] FAIL", {
    type,
    step,
    name: error instanceof Error ? error.name : "unknown",
    message: error instanceof Error ? error.message : String(error),
  });
}

async function playSoundAsync(type: SoundType): Promise<void> {
  const webFirstIos = preferWebAudioCueFirstOnIos();

  if (webFirstIos) {
    if (await tryPlayCueWebAudio(type, { silent: true })) {
      dbgAudio("[cue] OK", { type, path: "web" });
      return;
    }
    try {
      duckHtmlWhiteNoiseForCuePlayback(2800);
      await playCueHtml(type);
      dbgAudio("[cue] OK", { type, path: "html", note: "ios_after_web" });
    } catch (error) {
      dbgCueFail(type, "ios_html_after_web", error);
    }
    return;
  }

  if (preferHtmlAudioCueFirst()) {
    try {
      duckHtmlWhiteNoiseForCuePlayback(2800);
      await playCueHtml(type);
      dbgAudio("[cue] OK", { type, path: "html" });
      return;
    } catch (error) {
      if (await tryPlayCueWebAudio(type, { silent: true })) {
        dbgAudio("[cue] OK", { type, path: "web", note: "html_blocked" });
        return;
      }
      dbgCueFail(type, "html_then_web", error);
    }
    return;
  }

  if (await tryPlayCueWebAudio(type, { silent: true })) {
    dbgAudio("[cue] OK", { type, path: "web" });
    return;
  }

  try {
    duckHtmlWhiteNoiseForCuePlayback(2200);
    await playCueHtml(type);
    dbgAudio("[cue] OK", { type, path: "html", note: "desktop_fallback" });
  } catch (error) {
    console.error("Failed to play sound:", type, error);
    dbgCueFail(type, "desktop_html_fallback", error);
  }
}

/**
 * 定点提示音：iOS（ctx 已解锁）先 Web Audio；Android/移动 HTML 优先；桌面 Web Audio 优先。
 */
export function playSound(type: SoundType): void {
  const ctx = getOrCreateAudioContext();
  if (ctx?.state === "suspended") {
    void ctx.resume().catch(() => {});
  }
  void playSoundAsync(type);
}
