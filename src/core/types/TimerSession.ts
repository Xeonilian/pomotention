/** 会话大类：作废工作 / 正常工作 / 休息 */
export type TimerSessionCategory = "work" | "work_void" | "break";

export type TimerSessionEndReason = "completed" | "squash" | "stop" | "overtime";

/** 展示用符号，每项最多 2 个字符（含 emoji） */
export interface TimerSessionEmojis {
  workVoid: string;
  workTier1: string;
  workTier2: string;
  workTier3: string;
  breakShort: string;
  breakLong: string;
}

/** 各分档是否计入统计（图表折线与计数） */
export interface TimerSessionStatsInclude {
  workVoid: boolean;
  workTier1: boolean;
  workTier2: boolean;
  workTier3: boolean;
  breakShort: boolean;
  breakLong: boolean;
}

export interface TimerSessionRules {
  workTier1Min: number;
  workTier2Min: number;
  workTier3Min: number;
  /** short break 计数下限（分钟，含） */
  breakShortMin: number;
  /** long break 计数下限（分钟，含） */
  breakLongMin: number;
  emojis: TimerSessionEmojis;
  statsInclude: TimerSessionStatsInclude;
}

/** 各档阈值可填范围（分钟，含） */
export const TIMER_SESSION_RULE_LIMITS = {
  workTier1Min: { min: 15, max: 24 },
  workTier2Min: { min: 25, max: 44 },
  workTier3Min: { min: 45, max: 60 },
  breakShortMin: { min: 3, max: 10 },
  breakLongMin: { min: 11, max: 60 },
} as const;

export const DEFAULT_TIMER_SESSION_EMOJIS: TimerSessionEmojis = {
  workVoid: "🥫",
  workTier1: "🍒",
  workTier2: "🍅",
  workTier3: "🍉",
  breakShort: "☕",
  breakLong: "🍰",
};

export const DEFAULT_TIMER_SESSION_STATS_INCLUDE: TimerSessionStatsInclude = {
  workVoid: true,
  workTier1: true,
  workTier2: true,
  workTier3: true,
  breakShort: true,
  breakLong: true,
};

export const DEFAULT_TIMER_SESSION_RULES: TimerSessionRules = {
  workTier1Min: 15,
  workTier2Min: 25,
  workTier3Min: 45,
  breakShortMin: 5,
  breakLongMin: 15,
  emojis: { ...DEFAULT_TIMER_SESSION_EMOJIS },
  statsInclude: { ...DEFAULT_TIMER_SESSION_STATS_INCLUDE },
};

export interface TimerSessionRecord {
  id: string;
  category: TimerSessionCategory;
  emoji: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  /** 统计分档用时长（分钟）；缺省取 durationMs。序列提前停止且计入时用 plannedDurationMin */
  statsDurationMin?: number;
  plannedDurationMin: number;
  stateMessage: string;
  tagIds?: number[];
  endReason: TimerSessionEndReason;
  buttonLabel?: string;
}
