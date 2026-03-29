import type { SoundType } from "./types";
import { decodeArrayBufferToAudioBuffer, getOrCreateAudioContext } from "./audioContext";
import { dbgAudio } from "./debug";
import { loadCueBytes } from "./prefetch";

/** 已解码的短音效（桌面 Web Audio 主路径；Apple 触控上提示音优先 HTMLAudio，此项供定时器等无手势兜底） */
const cueBufferCache = new Map<SoundType, AudioBuffer>();
const cueBufferInflight = new Map<SoundType, Promise<AudioBuffer | null>>();

export async function getOrDecodeCueBuffer(type: SoundType): Promise<AudioBuffer | null> {
  const ctx = getOrCreateAudioContext();
  if (!ctx) return null;
  const cached = cueBufferCache.get(type);
  if (cached) return cached;
  let inflight = cueBufferInflight.get(type);
  if (!inflight) {
    inflight = (async () => {
      try {
        const arr = await loadCueBytes(type);
        if (!arr) return null;
        const decoded = await decodeArrayBufferToAudioBuffer(ctx, arr);
        cueBufferCache.set(type, decoded);
        return decoded;
      } catch (e) {
        console.error("[WebAudio cue] decode fail", type, e);
        dbgAudio("[WebAudio cue] decode FAIL", {
          type,
          message: e instanceof Error ? e.message : String(e),
        });
        return null;
      } finally {
        cueBufferInflight.delete(type);
      }
    })();
    cueBufferInflight.set(type, inflight);
  }
  return inflight;
}
