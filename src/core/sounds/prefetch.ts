import type { SoundType } from "./types";
import { ALL_SOUND_TYPES, SoundType as SoundTypeEnum, soundPaths } from "./types";

/** 预取到的原始音频字节（不依赖 AudioContext）；与首次播放共用同一套 inflight，避免重复下载 */
const cueBytesCache = new Map<SoundType, ArrayBuffer>();
const cueBytesInflight = new Map<SoundType, Promise<ArrayBuffer | null>>();
/** 与 loadCueBytes 共用字节缓存；双轨 HTMLAudio 共用一个 blob，避免重复 Range 拉网 */
const cueBlobUrlCache = new Map<SoundType, string>();

const FETCH_TIMEOUT_MS = 12_000;
const DEFER_PREFETCH_DELAY_MS = 1200;

const CRITICAL_CUE_TYPES: ReadonlyArray<SoundType> = [
  SoundTypeEnum.WORK_START,
  SoundTypeEnum.WORK_END,
  SoundTypeEnum.BREAK_START,
  SoundTypeEnum.BREAK_END,
];

/** 设置里可切换的白噪音轨 + 休息段占位轨；阶段 1 结束后按序预拉，不自动播放 */
const ALL_WHITE_NOISE_TRACK_TYPES: ReadonlyArray<SoundType> = [
  SoundTypeEnum.WORK_TICK,
  SoundTypeEnum.WHITE_NOISE_RAIN,
  SoundTypeEnum.WHITE_NOISE_BIRD_SEA,
  SoundTypeEnum.WHITE_NOISE_BREAK,
];

let quietWhiteNoisePrefetchStarted = false;
/** 用户切页时暂停下一段声音预拉，把带宽让给路由 chunk */
let navigationPrefetchHold = 0;

export function holdQuietAudioPrefetchForNavigation(): void {
  navigationPrefetchHold++;
}

export function releaseQuietAudioPrefetchAfterNavigation(): void {
  navigationPrefetchHold = Math.max(0, navigationPrefetchHold - 1);
}

async function waitWhileNavigationNeedsBandwidth(): Promise<void> {
  while (navigationPrefetchHold > 0) {
    await new Promise<void>((r) => window.setTimeout(r, 80));
  }
}

function buildWhiteNoisePrefetchOrder(selectedFirst: SoundType): SoundType[] {
  const inCatalog = ALL_WHITE_NOISE_TRACK_TYPES.includes(selectedFirst);
  const first = inCatalog ? selectedFirst : SoundTypeEnum.WORK_TICK;
  const rest = ALL_WHITE_NOISE_TRACK_TYPES.filter((t) => t !== first);
  return [first, ...rest];
}

async function prefetchCriticalCuesSequentially(): Promise<void> {
  for (const type of CRITICAL_CUE_TYPES) {
    await waitWhileNavigationNeedsBandwidth();
    await loadCueBytes(type);
  }
}

async function prefetchWhiteNoiseTracksSequentially(selectedFirst: SoundType): Promise<void> {
  for (const type of buildWhiteNoisePrefetchOrder(selectedFirst)) {
    await waitWhileNavigationNeedsBandwidth();
    await loadCueBytes(type);
  }
}

async function prefetchQuietAudioAfterPhase1(selectedFirst: SoundType): Promise<void> {
  await prefetchCriticalCuesSequentially();
  await prefetchWhiteNoiseTracksSequentially(selectedFirst);
}

/** 首页 chunk 阶段 1 完成后：先短提示音，再当前白噪音轨优先、其余白噪音依次 fetch */
export function beginQuietWhiteNoisePrefetch(): void {
  if (quietWhiteNoisePrefetchStarted) return;
  quietWhiteNoisePrefetchStarted = true;
  void import("@/stores/useSettingStore")
    .then(({ useSettingStore }) => {
      const track = useSettingStore().settings.whiteNoiseSoundTrack;
      return prefetchQuietAudioAfterPhase1(track);
    })
    .catch(() => prefetchQuietAudioAfterPhase1(SoundTypeEnum.WORK_TICK));
}

function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  return fetch(url, { signal: controller.signal }).finally(() => {
    clearTimeout(timer);
  });
}

export async function loadCueBlobUrl(type: SoundType): Promise<string | null> {
  const hit = cueBlobUrlCache.get(type);
  if (hit) return hit;
  const bytes = await loadCueBytes(type);
  if (!bytes) return null;
  const url = URL.createObjectURL(new Blob([bytes], { type: "audio/wav" }));
  cueBlobUrlCache.set(type, url);
  return url;
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
