// sounds.ts
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
};

// 声音对象缓存
const soundCache = new Map<SoundType, HTMLAudioElement>();

// 白噪音音频对象
let whiteNoiseAudio: HTMLAudioElement | null = null;

// 白噪音状态
let isWhiteNoiseEnabled = true;
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
  if (!isWhiteNoiseEnabled || !isPomodoroRunning) {
    return;
  }

  if (!whiteNoiseAudio) {
    whiteNoiseAudio = new Audio(soundPaths[SoundType.WHITE_NOISE]);
    whiteNoiseAudio.loop = true;
    whiteNoiseAudio.volume = 0.3;

    whiteNoiseAudio.addEventListener("canplaythrough", () => {
      if (isWhiteNoiseEnabled && isPomodoroRunning) {
        whiteNoiseAudio
          ?.play()
          .catch((error) => console.error("白噪音播放失败:", error));
      }
    });

    whiteNoiseAudio.addEventListener("error", (e) => {
      console.error("白噪音音频加载错误:", e);
    });
  } else {
    whiteNoiseAudio
      .play()
      .catch((error) => console.error("白噪音播放失败:", error));
  }
}

// 停止播放白噪音
export function stopWhiteNoise(): void {
  if (whiteNoiseAudio) {
    whiteNoiseAudio.pause();
    whiteNoiseAudio.currentTime = 0;
  }
}

// 设置番茄钟运行状态
export function setPomodoroRunning(running: boolean): void {
  isPomodoroRunning = running;
  if (!running) {
    stopWhiteNoise();
  } else if (isWhiteNoiseEnabled) {
    startWhiteNoise();
  }
}

// 获取白噪音状态
export function getWhiteNoiseState(): boolean {
  return isWhiteNoiseEnabled;
}

// 切换白噪音状态
export function toggleWhiteNoise(): boolean {
  isWhiteNoiseEnabled = !isWhiteNoiseEnabled;
  if (!isWhiteNoiseEnabled) {
    stopWhiteNoise();
  } else if (isPomodoroRunning) {
    startWhiteNoise();
  }
  return isWhiteNoiseEnabled;
}
