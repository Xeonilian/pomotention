import { useTimerSessionStore } from "@/stores/useTimerSessionStore";

let baselineCount = -1;

export function timerSequenceRunBegin(): void {
  baselineCount = useTimerSessionStore().sessions.length;
}

export function timerSequenceRunClear(): void {
  baselineCount = -1;
}

function runSessions() {
  const store = useTimerSessionStore();
  if (baselineCount < 0) return [];
  return store.sessions.slice(baselineCount);
}

export function timerSequenceRunHasCompletedSessions(): boolean {
  return runSessions().some((s) => s.endReason === "completed");
}

export function timerSequenceRunCompletedSessionIds(): string[] {
  return runSessions().filter((s) => s.endReason === "completed").map((s) => s.id);
}

/** 删除本 run 内已自然完成的 session（「不计入」时调用） */
export function timerSequenceRunDiscardCompleted(): void {
  const ids = timerSequenceRunCompletedSessionIds();
  if (ids.length) useTimerSessionStore().removeSessions(ids);
}
