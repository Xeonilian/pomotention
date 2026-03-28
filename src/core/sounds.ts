/** 门面：对外 API 见 `src/core/sounds/index.ts` */
export {
  SoundType,
  soundPaths,
  prefetchSoundAssets,
  playSound,
  startWhiteNoise,
  stopWhiteNoise,
  toggleWhiteNoise,
  resumeSharedAudioAfterForeground,
  resumeSharedAudioAfterForegroundAsync,
} from "./sounds/index";
