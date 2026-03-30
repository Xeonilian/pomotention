import { getOrCreateAudioContext, getAudioContext, resumeAudioContextForPlayback } from "./audioContext";
import { dbgAudio } from "./debug";
import { isAppleTouchWebKitDevice, preferHtmlAudioCueFirst } from "./platform";
import { SoundType, soundPaths } from "./types";
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

/** 锁屏/切后台时 document 多为 hidden；此时 Web Audio 常「start 成功但无声」或随即 interrupted */
function isPageHiddenForAudio(): boolean {
  if (typeof document === "undefined") return false;
  return document.visibilityState !== "visible" || document.hidden;
}

/**
 * iOS 亮屏：ctx running 时定时 cue 先 Web Audio（避免亮屏 middle 等 HTML NotAllowed）。
 * 息屏：work_middle / work_end 真机 HTML play() 常 NotAllowed；work_end 还须避免与同步 stopWhiteNoise 竞态（见 timer store）。
 */
function preferWebAudioCueFirstOnIos(type: SoundType): boolean {
  if (!isAppleTouchWebKitDevice()) return false;
  if (isPageHiddenForAudio()) {
    return type === SoundType.WORK_MIDDLE || type === SoundType.WORK_END;
  }
  const ctx = getAudioContext();
  return ctx !== null && ctx.state === "running";
}

/** Web Audio 播放单条提示音；成功返回 true */
export async function tryPlayCueWebAudio(type: SoundType): Promise<boolean> {
  getOrCreateAudioContext();
  const ctx = getAudioContext();
  if (!ctx) return false;
  const decodeP = getOrDecodeCueBuffer(type);
  const running = await resumeAudioContextForPlayback();
  if (!running) return false;
  if ((ctx.state as AudioContextState | "interrupted") === "interrupted") {
    const ok = await resumeAudioContextForPlayback();
    if (!ok) return false;
  }
  if (ctx.state !== "running") {
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
    // iOS 息屏：勿用 setTimeout 做 gate——后台定时器常被节流到 ~1s，误判 interrupted
    if (isAppleTouchWebKitDevice() && isPageHiddenForAudio()) {
      await Promise.resolve();
      await resumeAudioContextForPlayback();
      const st = ctx.state as AudioContextState | "interrupted";
      if (st !== "running") {
        return false;
      }
    }
    return true;
  } catch (e) {
    dbgAudio("[cue] WebAudio FAIL", {
      type,
      message: e instanceof Error ? e.message : String(e),
    });
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

/** 一条成功路径只记一次：类型 + 实际输出路径 */
function dbgCueOk(type: SoundType, path: "web" | "html", note?: string) {
  dbgAudio(note ? `[cue] ${type} ${path} (${note})` : `[cue] ${type} ${path}`);
}

async function playSoundAsync(type: SoundType): Promise<void> {
  const webFirstIos = preferWebAudioCueFirstOnIos(type);

  if (webFirstIos) {
    if (await tryPlayCueWebAudio(type)) {
      dbgCueOk(type, "web");
      return;
    }
    try {
      duckHtmlWhiteNoiseForCuePlayback(2800);
      await playCueHtml(type);
      dbgCueOk(type, "html", "ios_after_web");
    } catch (error) {
      dbgCueFail(type, "ios_html_after_web", error);
    }
    return;
  }

  if (preferHtmlAudioCueFirst()) {
    try {
      duckHtmlWhiteNoiseForCuePlayback(2800);
      await playCueHtml(type);
      dbgCueOk(type, "html");
      return;
    } catch (error) {
      if (await tryPlayCueWebAudio(type)) {
        dbgCueOk(type, "web", "html_blocked");
        return;
      }
      // iOS 锁屏：Web 易被 post-check 否掉；短延迟再试 HTML，与白噪音同属媒体元素管线
      if (isAppleTouchWebKitDevice() && isPageHiddenForAudio()) {
        await new Promise((r) => setTimeout(r, 160));
        try {
          duckHtmlWhiteNoiseForCuePlayback(2800);
          await playCueHtml(type);
          dbgCueOk(type, "html", "ios_hidden_retry");
          return;
        } catch (error2) {
          dbgCueFail(type, "ios_hidden_all_fail", error2);
          return;
        }
      }
      dbgCueFail(type, "html_then_web", error);
    }
    return;
  }

  if (await tryPlayCueWebAudio(type)) {
    dbgCueOk(type, "web");
    return;
  }

  try {
    duckHtmlWhiteNoiseForCuePlayback(2200);
    await playCueHtml(type);
    dbgCueOk(type, "html", "desktop_fallback");
  } catch (error) {
    console.error("Failed to play sound:", type, error);
    dbgCueFail(type, "desktop_html_fallback", error);
  }
}

/**
 * 定点提示音：iOS 亮屏 ctx running 先 Web；息屏且 work_middle 先 Web（证据：HTML 稳定 NotAllowed）；其它息屏类型仍 HTML→Web；桌面 Web 优先。
 */
/** 返回 Promise，供 timer 在 decode/起播完成后再 stopWhiteNoise；勿与 queueMicrotask 并行，否则易先于 await decode 拆掉 HTML 双轨 */
export function playSound(type: SoundType): Promise<void> {
  /* 勿在此 create/resume：定时器与 currentPhase watch 会高频调用，无手势时反复 resume 会刷 Chrome 控制台 */
  return playSoundAsync(type);
}
