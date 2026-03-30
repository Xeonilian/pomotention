import { dbgAudio } from "./debug";

let audioCtx: AudioContext | null = null;

/** 无用户手势时 resume 失败后置位，避免定时器/阶段 watch 反复 resume() 触发 Chrome 控制台刷屏 */
let resumeBlockedByAutoplayPolicy = false;
let resumeInFlight: Promise<boolean> | null = null;

export function getAudioContext(): AudioContext | null {
  return audioCtx;
}

/**
 * 合并并发 resume，并在策略拦截后不再重复调用直至用户手势。
 * 与 tryPlayCueWebAudio 搭配；提示音仍可走 HTML 回退。
 */
export async function resumeAudioContextForPlayback(): Promise<boolean> {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return false;
  if (ctx.state === "running") return true;
  if (resumeBlockedByAutoplayPolicy) return false;

  if (!resumeInFlight) {
    resumeInFlight = ctx
      .resume()
      .then(() => {
        if (ctx.state === "running") return true;
        resumeBlockedByAutoplayPolicy = true;
        return false;
      })
      .catch(() => {
        resumeBlockedByAutoplayPolicy = true;
        return false;
      })
      .finally(() => {
        resumeInFlight = null;
      });
  }
  return resumeInFlight;
}

function installUserGestureResumeUnlock(): void {
  if (typeof document === "undefined") return;
  document.addEventListener(
    "pointerdown",
    () => {
      resumeBlockedByAutoplayPolicy = false;
      void resumeAudioContextForPlayback();
    },
    { capture: true, passive: true },
  );
}

installUserGestureResumeUnlock();

function attachAudioContextDebugListener(ctx: AudioContext) {
  const mark = "__pomotentionAudioDbgState";
  if ((ctx as unknown as Record<string, boolean>)[mark]) return;
  (ctx as unknown as Record<string, boolean>)[mark] = true;
  ctx.addEventListener("statechange", () => {
    // 仅记录易致无声的状态，避免 running 刷屏
    if (ctx.state === "suspended" || ctx.state === "interrupted") {
      dbgAudio("[WN] AudioContext", { state: ctx.state });
    }
  });
}

export function getOrCreateAudioContext(): AudioContext | null {
  if (audioCtx) return audioCtx;
  const AC =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  const ctx = new AC();
  audioCtx = ctx;
  /* 新建后多为 suspended，须 resume；勿在多处无协调地反复 resume，见 resumeAudioContextForPlayback */
  attachAudioContextDebugListener(ctx);
  return ctx;
}

export function decodeArrayBufferToAudioBuffer(ctx: AudioContext, buf: ArrayBuffer): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    const anyCtx = ctx as any;
    try {
      if (typeof anyCtx.decodeAudioData !== "function") {
        reject(new Error("decodeAudioData 不可用"));
        return;
      }
      if (anyCtx.decodeAudioData.length === 1) {
        anyCtx.decodeAudioData(buf).then(resolve, reject);
      } else {
        ctx.decodeAudioData(buf, resolve, reject);
      }
    } catch (e) {
      reject(e);
    }
  });
}
