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
// ====== Web Audio for 白噪音 BEGIN ======
let audioCtx: AudioContext | null = null;
let whiteNoiseSource: AudioBufferSourceNode | null = null;
let whiteNoiseGain: GainNode | null = null;

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

// ====== Web Audio for 白噪音 BEGIN ======

// 跟踪所有活跃 Source，确保 stop 时能全部停止/断开
const whiteNoiseSources = new Set<AudioBufferSourceNode>();
const whiteNoiseSourceIds = new Map<AudioBufferSourceNode, number>();
let whiteNoiseNextId = 1;
// ====== Web Audio for 白噪音 END ======

// 开始播放白噪音（Web Audio，无缝循环，只有错误日志）
export function startWhiteNoise(): void {
  const settingStore = useSettingStore();
  if (!settingStore.settings.isWhiteNoiseEnabled) return;

  // 清理旧 Source（不影响持久 Gain）
  stopWhiteNoise();

  const src = soundPaths[settingStore.settings.whiteNoiseSoundTrack];

  try {
    const AC =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AC) return;

    if (!audioCtx) {
      audioCtx = new (AC as any)();
    }

    // 创建或复用全局 GainNode（只连接一次）
    if (!whiteNoiseGain && audioCtx) {
      whiteNoiseGain = audioCtx.createGain();
      whiteNoiseGain.connect(audioCtx.destination);
    }

    // 设置音量（WORK_TICK=1，其它=0.3）
    if (whiteNoiseGain) {
      whiteNoiseGain.gain.value =
        settingStore.settings.whiteNoiseSoundTrack === SoundType.WORK_TICK
          ? 1
          : 0.3;
    }

    if (audioCtx)
      audioCtx.resume().catch((e: any) => {
        console.log("[WN] audioCtx.resume() 错误:", e);
      });

    fetch(src)
      .then((res) => res.arrayBuffer())
      .then((buf) => {
        // 兼容两种 decodeAudioData 签名（Promise 或回调）
        return new Promise<AudioBuffer>((resolve, reject) => {
          const ctx = audioCtx;
          if (!ctx) return reject(new Error("audioCtx 不存在"));
          const anyCtx = ctx as any;
          try {
            if (typeof anyCtx.decodeAudioData === "function") {
              if (anyCtx.decodeAudioData.length === 1) {
                anyCtx.decodeAudioData(buf).then(resolve, reject);
              } else {
                (ctx as AudioContext).decodeAudioData(buf, resolve, reject);
              }
            } else {
              reject(new Error("decodeAudioData 不可用"));
            }
          } catch (e) {
            reject(e);
          }
        });
      })
      .then((audioBuffer) => {
        const s = useSettingStore();
        if (!audioCtx || !whiteNoiseGain) return;
        if (!s.settings.isWhiteNoiseEnabled) return;

        const source = audioCtx.createBufferSource();
        const id = whiteNoiseNextId++;
        whiteNoiseSources.add(source);
        whiteNoiseSourceIds.set(source, id);

        source.buffer = audioBuffer;
        source.loop = true;
        source.loopStart = 0;
        source.loopEnd = audioBuffer.duration;

        source.connect(whiteNoiseGain);

        try {
          source.start(0);
        } catch (e) {
          console.log("[WN] source.start(0) 错误:", e);
        }

        // 替换旧的“当前 Source”
        if (whiteNoiseSource && whiteNoiseSource !== source) {
          try {
            whiteNoiseSource.stop(0);
          } catch (e) {
            console.log("[WN] 停止旧 Source 错误:", e);
          }
          try {
            whiteNoiseSource.disconnect();
          } catch (e) {
            console.log("[WN] 断开旧 Source 错误:", e);
          }
          whiteNoiseSources.delete(whiteNoiseSource);
          whiteNoiseSourceIds.delete(whiteNoiseSource);
        }

        whiteNoiseSource = source;
      })
      .catch((e) => {
        console.log("[WN] startWhiteNoise 流程错误:", e);
      });
  } catch (e) {
    console.log("[WN] startWhiteNoise 外层错误:", e);
  }
}

export function stopWhiteNoise(): void {
  try {
    if (whiteNoiseGain) {
      try {
        whiteNoiseGain.gain.value = 0; // 立即静音
      } catch (e) {
        console.log("[WN] 设置增益为 0 错误:", e);
      }
    }

    for (const src of Array.from(whiteNoiseSources)) {
      try {
        src.stop(0);
      } catch (e) {
        console.log("[WN] source.stop(0) 错误:", e);
      }
      try {
        src.disconnect();
      } catch (e) {
        console.log("[WN] source.disconnect() 错误:", e);
      }
      whiteNoiseSources.delete(src);
      whiteNoiseSourceIds.delete(src);
    }

    whiteNoiseSource = null;
  } catch (e) {
    console.log("[WN] stopWhiteNoise 外层错误:", e);
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
