import { dbgAudio } from "./debug";

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  return audioCtx;
}

function attachAudioContextDebugListener(ctx: AudioContext) {
  const mark = "__pomotentionAudioDbgState";
  if ((ctx as unknown as Record<string, boolean>)[mark]) return;
  (ctx as unknown as Record<string, boolean>)[mark] = true;
  ctx.addEventListener("statechange", () => {
    dbgAudio("[WN] AudioContext statechange", { state: ctx.state });
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
  attachAudioContextDebugListener(ctx);
  dbgAudio("[WN] AudioContext 已创建", { initialState: ctx.state });
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
