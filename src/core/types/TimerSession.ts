/** 会话大类：作废工作 / 正常工作 / 休息 */
export type TimerSessionCategory = "work" | "work_void" | "break";

export type TimerSessionEndReason = "completed" | "squash" | "stop";

/** 展示用符号，每项最多 2 个字符（含 emoji） */
export interface TimerSessionEmojis {
  workVoid: string;
  workBelow: string;
  workTier1: string;
  workTier2: string;
  workTier3: string;
  breakShort: string;
  breakTier1: string;
  breakTier2: string;
}

export interface TimerSessionRules {
  workTier1Min: number;
  workTier2Min: number;
  workTier3Min: number;
  breakTier1Min: number;
  breakTier2Min: number;
  emojis: TimerSessionEmojis;
  /** 统计页是否显示日期与星期（等宽字体） */
  statsShowDateLabel: boolean;
}

export const DEFAULT_TIMER_SESSION_EMOJIS: TimerSessionEmojis = {
  workVoid: "🥫",
  workBelow: "🫧",
  workTier1: "🍒",
  workTier2: "🍅",
  workTier3: "🍊",
  breakShort: "☕",
  breakTier1: "🍵",
  breakTier2: "☁",
};

export const DEFAULT_TIMER_SESSION_RULES: TimerSessionRules = {
  workTier1Min: 15,
  workTier2Min: 25,
  workTier3Min: 45,
  breakTier1Min: 5,
  breakTier2Min: 15,
  emojis: { ...DEFAULT_TIMER_SESSION_EMOJIS },
  statsShowDateLabel: true,
};

export interface TimerSessionRecord {
  id: string;
  category: TimerSessionCategory;
  emoji: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  plannedDurationMin: number;
  stateMessage: string;
  endReason: TimerSessionEndReason;
  buttonLabel?: string;
}
