import { useSettingStore } from "@/stores/useSettingStore";
import { useTimerSessionStore } from "@/stores/useTimerSessionStore";
import { HIIT_SESSION_EMOJI } from "@/core/types/TimerSession";
import type { TimerSessionEndDecision } from "@/services/timer/timerSessionEndPolicy";
import {
  timerSequenceRunBegin,
  timerSequenceRunClear,
  timerSequenceRunDiscardCompleted,
  timerSequenceRunHasCompletedSessions,
} from "@/services/timer/timerSequenceRunTracker";

export {
  timerSequenceRunBegin,
  timerSequenceRunClear,
  timerSequenceRunDiscardCompleted,
  timerSequenceRunHasCompletedSessions,
};

type ActiveKind = "work" | "break";

let active: {
  kind: ActiveKind;
  startedAt: number;
  plannedDurationMin: number;
} | null = null;

function resolveSessionStateMessage(kind: ActiveKind): string {
  if (kind === "break") {
    return "Take a break";
  }
  const custom = useSettingStore().settings.pomodoroStateMessage?.trim();
  if (custom) return custom;
  return "Ready to pomodoro!";
}

export function timerSessionGetActive(): {
  kind: ActiveKind;
  plannedDurationMin: number;
} | null {
  if (!active) return null;
  return { kind: active.kind, plannedDurationMin: active.plannedDurationMin };
}

/** 开始一段工作/休息（在 startWorking / startBreak 时调用） */
export function timerSessionBegin(kind: ActiveKind, plannedDurationMin: number): void {
  active = {
    kind,
    startedAt: Date.now(),
    plannedDurationMin,
  };
}

/** 结束当前段并写入持久化记录 */
export function timerSessionEnd(
  endReason: "completed" | "squash" | "stop" | "overtime",
  buttonLabel?: string,
  endedAt: number = Date.now(),
  opts?: { statsDurationMin?: number },
): void {
  if (!active) return;

  const { kind, startedAt, plannedDurationMin } = active;
  active = null;
  const stateMessage = resolveSessionStateMessage(kind);
  const settingStore = useSettingStore();
  const tagIds =
    kind === "work" && settingStore.settings.pomodoroTagIds?.length
      ? [...settingStore.settings.pomodoroTagIds]
      : undefined;

  useTimerSessionStore().addSession({
    kind,
    startedAt,
    endedAt,
    plannedDurationMin,
    stateMessage,
    tagIds,
    endReason,
    buttonLabel,
    statsDurationMin: opts?.statsDurationMin,
  });
}

/** 按策略结束当前段（cancelTimer 等调用） */
export function timerSessionEndWithDecision(decision: TimerSessionEndDecision, endedAt: number = Date.now()): void {
  timerSessionEnd(decision.endReason, decision.buttonLabel, endedAt, {
    statsDurationMin: decision.statsDurationMin,
  });
}

/** 异常复位时丢弃未闭合段，避免污染下一段 */
export function timerSessionDiscardActive(): void {
  active = null;
}

/** HIIT 等聚合模式：按总工作秒数记一条 💪 session */
export function timerSessionRecordAggregateWork(
  workSec: number,
  endReason: "completed" | "squash" | "stop" | "overtime",
  buttonLabel?: string,
  opts?: { plannedWorkSec?: number; hiitExpression?: string; startedAt?: number; endedAt?: number },
): void {
  if (workSec <= 0) return;

  const plannedWorkSec = opts?.plannedWorkSec ?? workSec;
  const endedAt = opts?.endedAt ?? Date.now();
  const startedAt = opts?.startedAt ?? endedAt - workSec * 1000;
  const statsDurationMin = workSec / 60;
  const settingStore = useSettingStore();
  const tagIds = settingStore.settings.pomodoroTagIds?.length ? [...settingStore.settings.pomodoroTagIds] : undefined;
  const stateMessage = opts?.hiitExpression?.trim() || resolveSessionStateMessage("work");

  useTimerSessionStore().addSession({
    kind: "work",
    category: "work_hiit",
    emoji: HIIT_SESSION_EMOJI,
    startedAt,
    endedAt,
    plannedDurationMin: plannedWorkSec / 60,
    stateMessage,
    tagIds,
    endReason,
    buttonLabel,
    statsDurationMin,
  });
}

/** Pizza「不计入」时在休息段停止：记一条工作作废 */
export function timerSessionRecordWorkVoid(buttonLabel: string): void {
  const now = Date.now();
  const settingStore = useSettingStore();
  const tagIds = settingStore.settings.pomodoroTagIds?.length ? [...settingStore.settings.pomodoroTagIds] : undefined;

  useTimerSessionStore().addSession({
    kind: "work",
    startedAt: now,
    endedAt: now,
    plannedDurationMin: 0,
    stateMessage: resolveSessionStateMessage("work"),
    tagIds,
    endReason: "squash",
    buttonLabel,
  });
}
