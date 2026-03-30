/**
 * 音频对外 API：提示音走 `cuePlayback`（桌面 Web Audio 优先）；白噪音全平台 HTML 双轨接缝，见 `whiteNoiseHtml`。
 * v3: 包含 dbgSwStatus 用于 PWA/iPhone 声音诊断。
 */
export { SoundType, soundPaths } from "./types";
export { prefetchSoundAssets, prefetchWhiteNoiseForSelection } from "./prefetch";
export { playSound } from "./cuePlayback";
export {
  startWhiteNoise,
  startSilentWhiteNoiseHold,
  stopWhiteNoise,
  toggleWhiteNoise,
  resumeSharedAudioAfterForeground,
  resumeSharedAudioAfterForegroundAsync,
} from "./whiteNoiseApi";
export { dbgSwStatus } from "./debug";
