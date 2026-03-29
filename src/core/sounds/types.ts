/** 声音类型枚举 */
export enum SoundType {
  WORK_START = "work_start",
  WORK_MIDDLE = "work_middle",
  WORK_END = "work_end",
  BREAK_START = "break_start",
  BREAK_END = "break_end",
  WHITE_NOISE_RAIN = "white_noise_rain",
  WHITE_NOISE_BIRD_SEA = "white_noise_bird_sea",
  /** 休息段 HTML 占位专用（近静音循环），不参与用户白噪音轨切换 */
  WHITE_NOISE_BREAK = "white_noise_break",
  PHASE_R1 = "phase_r1",
  PHASE_W1 = "phase_w1",
  PHASE_W2 = "phase_w2",
  PHASE_R2 = "phase_r2",
  PHASE_T = "phase_t",
  PHASE_BREAK = "phase_break",
  WORK_TICK = "work_tick",
}

/** 声音文件路径 */
export const soundPaths: Record<SoundType, string> = {
  [SoundType.WORK_START]: "/sounds/work_start.wav",
  [SoundType.WORK_MIDDLE]: "/sounds/work_middle.wav",
  [SoundType.WORK_END]: "/sounds/work_end.wav",
  [SoundType.BREAK_START]: "/sounds/break_start.wav",
  [SoundType.BREAK_END]: "/sounds/break_end.wav",
  [SoundType.WHITE_NOISE_RAIN]: "/sounds/white_noise_rain.wav",
  [SoundType.WHITE_NOISE_BIRD_SEA]: "/sounds/white_noise_bird_sea.wav",
  [SoundType.WHITE_NOISE_BREAK]: "/sounds/white_noise_break.wav",
  [SoundType.PHASE_R1]: "/sounds/phase_r1.wav",
  [SoundType.PHASE_W1]: "/sounds/phase_w1.wav",
  [SoundType.PHASE_W2]: "/sounds/phase_w2.wav",
  [SoundType.PHASE_R2]: "/sounds/phase_r2.wav",
  [SoundType.PHASE_T]: "/sounds/phase_t.wav",
  [SoundType.PHASE_BREAK]: "/sounds/break_middle.wav",
  [SoundType.WORK_TICK]: "/sounds/work_tick.wav",
};

/** soundPaths 内全部类型，供预取与遍历 */
export const ALL_SOUND_TYPES = Object.values(SoundType).filter((v): v is SoundType => typeof v === "string");
