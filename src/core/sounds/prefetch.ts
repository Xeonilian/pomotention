import type { SoundType } from "./types";
import { ALL_SOUND_TYPES, SoundType as SoundTypeEnum, soundPaths } from "./types";

/** 预取到的原始音频字节（不依赖 AudioContext）；与首次播放共用同一套 inflight，避免重复下载 */
const cueBytesCache = new Map<SoundType, ArrayBuffer>();
const cueBytesInflight = new Map<SoundType, Promise<ArrayBuffer | null>>();

const FETCH_TIMEOUT_MS = 12_000;
const DEFER_PREFETCH_DELAY_MS = 1200;

const CRITICAL_CUE_TYPES: ReadonlyArray<SoundType> = [
  SoundTypeEnum.WORK_START,
  SoundTypeEnum.WORK_END,
  SoundTypeEnum.BREAK_START,
  SoundTypeEnum.BREAK_END,
];

function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { signal: controller.signal }).finally(() => {
    clearTimeout(timer);
  });
}

export async function loadCueBytes(type: SoundType): Promise<ArrayBuffer | null> {
  const hit = cueBytesCache.get(type);
  if (hit) return hit;
  let inflight = cueBytesInflight.get(type);
  if (!inflight) {
    inflight = (async () => {
      try {
        const url = soundPaths[type];
        const res = await fetchWithTimeout(url);
        if (!res.ok) {
          return null;
        }
        const arr = await res.arrayBuffer();
        cueBytesCache.set(type, arr);
        return arr;
      } catch (error) {
        return null;
      } finally {
        cueBytesInflight.delete(type);
      }
    })();
    cueBytesInflight.set(type, inflight);
  }
  return inflight;
}

function prefetchTypes(types: Iterable<SoundType>): void {
  for (const type of types) {
    void loadCueBytes(type);
  }
}

function deferWork(task: () => void): void {
  const g = window as Window & { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number };
  if (typeof g.requestIdleCallback === "function") {
    g.requestIdleCallback(task, { timeout: 2500 });
    return;
  }
  window.setTimeout(task, DEFER_PREFETCH_DELAY_MS);
}

function collectSelectedWhiteNoiseTypes(selectedTrack: SoundType): SoundType[] {
  const types: SoundType[] = [SoundTypeEnum.WHITE_NOISE_BREAK];
  if (selectedTrack !== SoundTypeEnum.WHITE_NOISE_BREAK) {
    types.push(selectedTrack);
  }
  return types;
}

function collectDeferredTypes(selectedTrack: SoundType): SoundType[] {
  const skipped = new Set<SoundType>([
    ...CRITICAL_CUE_TYPES,
    ...collectSelectedWhiteNoiseTypes(selectedTrack),
  ]);
  return ALL_SOUND_TYPES.filter((type) => !skipped.has(type));
}

/** 第一阶段：优先保证开始/结束等关键提示音可用 */
export function prefetchCriticalCues(): void {
  prefetchTypes(CRITICAL_CUE_TYPES);
}

/** 第二阶段：优先拉取休息静音轨 + 用户当前选中的白噪音 */
export function prefetchWhiteNoiseForSelection(selectedTrack: SoundType): void {
  prefetchTypes(collectSelectedWhiteNoiseTypes(selectedTrack));
}

/** 第三阶段：空闲时补齐剩余素材，避免启动期抢占带宽 */
export function prefetchDeferredSoundAssets(selectedTrack: SoundType): void {
  deferWork(() => prefetchTypes(collectDeferredTypes(selectedTrack)));
}

/**
 * 启动预取按优先级分三段：
 * 1) 关键提示音；2) white_noise_break + 当前白噪音轨；3) 空闲补齐其余素材。
 * 与 HTMLAudio 回退共用 HTTP 缓存；解码仍在首次需要 AudioContext 时做。
 */
export function prefetchSoundAssets(selectedTrack: SoundType = SoundTypeEnum.WORK_TICK): void {
  prefetchCriticalCues();
  prefetchWhiteNoiseForSelection(selectedTrack);
  prefetchDeferredSoundAssets(selectedTrack);
}
