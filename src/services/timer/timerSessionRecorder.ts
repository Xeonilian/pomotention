import { useSettingStore } from "@/stores/useSettingStore";
import { useTimerSessionStore } from "@/stores/useTimerSessionStore";
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
