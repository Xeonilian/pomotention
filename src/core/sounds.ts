// sounds.ts
import { useSettingStore } from "@/stores/useSettingStore";
// 声音类型枚举
export enum SoundType {
  WORK_START = "work_start",
  WORK_MIDDLE = "work_middle",
  WORK_END = "work_end",
  BREAK_START = "break_start",
  BREAK_END = "break_end",
  WHITE_NOISE = "white_noise",
  PHASE_R1 = "phase_r1",
  PHASE_W1 = "phase_w1",
  PHASE_W2 = "phase_w2",
  PHASE_R2 = "phase_r2",
  PHASE_T = "phase_t",
  PHASE_BREAK = "phase_break",
  WORK_TICK = "work_tick",
}

// 声音文件路径
const soundPaths = {
  [SoundType.WORK_START]: "/sounds/work_start.wav",
  [SoundType.WORK_MIDDLE]: "/sounds/work_middle.wav",
  [SoundType.WORK_END]: "/sounds/work_end.wav",
  [SoundType.BREAK_START]: "/sounds/break_start.wav",
  [SoundType.BREAK_END]: "/sounds/break_end.wav",
  [SoundType.WHITE_NOISE]: "/sounds/white_noise.wav",
  [SoundType.PHASE_R1]: "/sounds/phase_r1.wav",
  [SoundType.PHASE_W1]: "/sounds/phase_w1.wav",
  [SoundType.PHASE_W2]: "/sounds/phase_w2.wav",
  [SoundType.PHASE_R2]: "/sounds/phase_r2.wav",
  [SoundType.PHASE_T]: "/sounds/phase_t.wav",
  [SoundType.PHASE_BREAK]: "/sounds/break_middle.wav",
  [SoundType.WORK_TICK]: "/sounds/work_tick.wav",
};

// 声音对象缓存
const soundCache = new Map<SoundType, HTMLAudioElement>();

// 白噪音音频对象
let whiteNoiseAudio: HTMLAudioElement | null = null;

// 白噪音状态
let isPomodoroRunning = false;

// 获取声音对象
function getSound(type: SoundType): HTMLAudioElement {
  if (!soundCache.has(type)) {
    const audio = new Audio(soundPaths[type]);
    soundCache.set(type, audio);
  }
  return soundCache.get(type)!;
}

// 播放声音
export function playSound(type: SoundType): void {
  const sound = getSound(type);
  sound.currentTime = 0;
  sound
    .play()
    .catch((error) => console.error("Failed to play sound:", type, error));
}

// 开始播放白噪音
export function startWhiteNoise(): void {
  const settingStore = useSettingStore();
  if (!settingStore.settings.isWhiteNoiseEnabled) return;

  // 彻底销毁旧 audio
  if (whiteNoiseAudio) {
    whiteNoiseAudio.pause();
    whiteNoiseAudio.src = "";
    whiteNoiseAudio = null;
  }
  const src = soundPaths[settingStore.settings.whiteNoiseSoundTrack];
  whiteNoiseAudio = new Audio(src);
  whiteNoiseAudio.loop = true;
  whiteNoiseAudio.volume =
    settingStore.settings.whiteNoiseSoundTrack === SoundType.WORK_TICK
      ? 1
      : 0.3;

  // 直接播放，无需监听 canplaythrough，现代浏览器会自动缓冲到位后播
  whiteNoiseAudio.play().catch((e) => {
    // 忽略所有报错，不打印到控制台
    console.log("白噪音 play 错误", e);
  });
}
export function stopWhiteNoise(): void {
  if (whiteNoiseAudio) {
    whiteNoiseAudio.pause();
    whiteNoiseAudio.src = "";
    whiteNoiseAudio = null;
  }
}

// 设置番茄钟运行状态
export function setPomodoroRunning(running: boolean): void {
  const settingStore = useSettingStore();
  isPomodoroRunning = running;
  if (!running) {
    stopWhiteNoise();
  } else if (settingStore.settings.isWhiteNoiseEnabled) {
    startWhiteNoise();
  }
}

// 切换白噪音状态
export function toggleWhiteNoise(): void {
  const settingStore = useSettingStore();
  settingStore.settings.isWhiteNoiseEnabled =
    !settingStore.settings.isWhiteNoiseEnabled;
  if (!settingStore.settings.isWhiteNoiseEnabled) {
    stopWhiteNoise();
  } else if (isPomodoroRunning) {
    startWhiteNoise();
  }
}
