/** 会话大类：作废工作 / 正常工作 / 休息 */
export type TimerSessionCategory = "work" | "work_void" | "break";

export type TimerSessionEndReason = "completed" | "squash" | "stop";

export interface TimerSessionRules {
  /** ≥ 此分钟数且正常结束 → 🍅 */
  tomatoMinMinutes: number;
  /** ≥ 此分钟数且正常结束、未达番茄 → 🍒 */
  cherryMinMinutes: number;
  /** 休息 ≥ 此分钟数 → ☁ */
  cloudBreakMinMinutes: number;
}

export const DEFAULT_TIMER_SESSION_RULES: TimerSessionRules = {
  tomatoMinMinutes: 25,
  cherryMinMinutes: 15,
  cloudBreakMinMinutes: 15,
};

export interface TimerSessionRecord {
  id: string;
  category: TimerSessionCategory;
  emoji: string;
  startedAt: number;
  endedAt: number;
  durationMs: number;
  plannedDurationMin: number;
  /** 开始时的状态文案（设置自定义或默认） */
  stateMessage: string;
  endReason: TimerSessionEndReason;
  /** 对应按钮点击标签（Work / Squash / Break / Stop） */
  buttonLabel?: string;
}
