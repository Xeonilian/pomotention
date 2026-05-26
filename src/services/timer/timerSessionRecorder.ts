import { useSettingStore } from "@/stores/useSettingStore";
import { useTimerSessionStore } from "@/stores/useTimerSessionStore";

type ActiveKind = "work" | "break";

let active: {
  kind: ActiveKind;
  startedAt: number;
  plannedDurationMin: number;
  stateMessage: string;
} | null = null;

function resolveStateMessage(): string {
  const custom = useSettingStore().settings.pomodoroStateMessage?.trim();
  if (custom) return custom;
  return "Ready to pomodoro!";
}

/** 开始一段工作/休息（在 startWorking / startBreak 时调用） */
export function timerSessionBegin(kind: ActiveKind, plannedDurationMin: number): void {
  active = {
    kind,
    startedAt: Date.now(),
    plannedDurationMin,
    stateMessage: resolveStateMessage(),
  };
}

/** 结束当前段并写入持久化记录 */
export function timerSessionEnd(
  endReason: "completed" | "squash" | "stop",
  buttonLabel?: string,
  endedAt: number = Date.now(),
): void {
  if (!active) return;

  const { kind, startedAt, plannedDurationMin, stateMessage } = active;
  active = null;

  useTimerSessionStore().addSession({
    kind,
    startedAt,
    endedAt,
    plannedDurationMin,
    stateMessage,
    endReason,
    buttonLabel,
  });
}

/** 异常复位时丢弃未闭合段，避免污染下一段 */
export function timerSessionDiscardActive(): void {
  active = null;
}
