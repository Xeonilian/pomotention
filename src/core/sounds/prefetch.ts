import type { SoundType } from "./types";
import { ALL_SOUND_TYPES, soundPaths } from "./types";

/** 预取到的原始音频字节（不依赖 AudioContext）；与首次播放共用同一套 inflight，避免重复下载 */
const cueBytesCache = new Map<SoundType, ArrayBuffer>();
const cueBytesInflight = new Map<SoundType, Promise<ArrayBuffer | null>>();

export async function loadCueBytes(type: SoundType): Promise<ArrayBuffer | null> {
  const hit = cueBytesCache.get(type);
  if (hit) return hit;
  let inflight = cueBytesInflight.get(type);
  if (!inflight) {
    inflight = (async () => {
      try {
        const url = soundPaths[type];
        const res = await fetch(url);
        if (!res.ok) return null;
        const arr = await res.arrayBuffer();
        cueBytesCache.set(type, arr);
        return arr;
      } catch {
        return null;
      } finally {
        cueBytesInflight.delete(type);
      }
    })();
    cueBytesInflight.set(type, inflight);
  }
  return inflight;
}

/**
 * 应用启动后尽早调用：并行拉取全部 /sounds 字节，不等首次 playSound。
 * 与 HTMLAudio 回退共用 HTTP 缓存；解码仍在首次需要 AudioContext 时做。
 */
export function prefetchSoundAssets(): void {
  for (const type of ALL_SOUND_TYPES) {
    void loadCueBytes(type);
  }
}
