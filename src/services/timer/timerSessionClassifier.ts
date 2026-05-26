import type { TimerSessionCategory, TimerSessionEndReason, TimerSessionRules } from "@/core/types/TimerSession";

export function classifyTimerSession(
  kind: "work" | "break",
  durationMinutes: number,
  endReason: TimerSessionEndReason,
  rules: TimerSessionRules,
): { category: TimerSessionCategory; emoji: string } {
  if (kind === "work") {
    if (endReason === "squash" || endReason === "stop") {
      return { category: "work_void", emoji: "🥫" };
    }
    if (durationMinutes >= rules.tomatoMinMinutes) {
      return { category: "work", emoji: "🍅" };
    }
    if (durationMinutes >= rules.cherryMinMinutes) {
      return { category: "work", emoji: "🍒" };
    }
    return { category: "work", emoji: "🫧" };
  }

  if (durationMinutes >= rules.cloudBreakMinMinutes) {
    return { category: "break", emoji: "☁" };
  }
  return { category: "break", emoji: "☕" };
}

export function formatDurationMs(ms: number): string {
  const totalSec = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}小时${m}分${s}秒`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}
