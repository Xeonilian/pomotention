import type { TimerSessionCategory, TimerSessionEndReason, TimerSessionRecord, TimerSessionRules } from "@/core/types/TimerSession";
import { HIIT_SESSION_EMOJI } from "@/core/types/TimerSession";
import {
  emojiForBreakTier,
  emojiForWorkTier,
  resolveBreakTierForStats,
  resolveWorkTierForStats,
} from "@/services/timer/timerSessionTierResolve";

export function clampEmojiText(value: string, maxChars = 2): string {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "";
  return [...trimmed].slice(0, maxChars).join("");
}

/** 按当前规则重算展示符号（与图表一致，不读 session 落库时的 emoji） */
export function statsDurationMinutesOf(session: { durationMs: number; statsDurationMin?: number }): number {
  if (session.statsDurationMin != null) return session.statsDurationMin;
  return durationMinutesOf(session);
}

export function resolveSessionDisplayEmoji(session: TimerSessionRecord, rules: TimerSessionRules): string {
  if (session.category === "work_hiit") return clampEmojiText(session.emoji || HIIT_SESSION_EMOJI);
  const kind: "work" | "break" = session.category === "break" ? "break" : "work";
  return classifyTimerSession(kind, statsDurationMinutesOf(session), session.endReason, rules).emoji;
}

export function classifyTimerSession(
  kind: "work" | "break",
  durationMinutes: number,
  endReason: TimerSessionEndReason,
  rules: TimerSessionRules,
): { category: TimerSessionCategory; emoji: string } {
  const e = rules.emojis;

  if (kind === "work") {
    if (endReason === "squash") {
      return { category: "work_void", emoji: clampEmojiText(e.workVoid) };
    }
    const tier = resolveWorkTierForStats(durationMinutes, rules);
    return { category: "work", emoji: clampEmojiText(emojiForWorkTier(tier, e)) };
  }

  const tier = resolveBreakTierForStats(durationMinutes, rules);
  return { category: "break", emoji: clampEmojiText(emojiForBreakTier(tier, e)) };
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

export function durationMinutesOf(session: { durationMs: number }): number {
  return session.durationMs / 60_000;
}

/** 正计时结束后 Stop：实际时长超过计划 */
export function isOvertimeEndSession(session: Pick<TimerSessionRecord, "endReason" | "durationMs" | "plannedDurationMin">): boolean {
  if (session.endReason === "overtime") return true;
  if (session.endReason !== "stop") return false;
  return session.durationMs > session.plannedDurationMin * 60_000;
}

export function formatTimerSessionEndReason(
  session: Pick<TimerSessionRecord, "category" | "endReason" | "durationMs" | "plannedDurationMin" | "statsDurationMin">,
): string {
  if (session.category === "work_hiit" && session.endReason === "stop") {
    const workMs =
      session.statsDurationMin != null ? session.statsDurationMin * 60_000 : session.durationMs;
    return `提前结束 · 实际工作 ${formatDurationMs(workMs)}`;
  }
  if (session.endReason === "completed") return "自然结束";
  if (session.endReason === "squash") return "提前结束（Squash）";
  if (isOvertimeEndSession(session)) return "正计时结束（Stop）";
  if (session.endReason === "stop") return "提前结束（Stop）";
  return "自然结束";
}

/** 统计用：有效工作段计 1 个番茄（≥ 短工作下限，不含 Squash / void） */
export function isTomatoWorkSession(
  session: { category: TimerSessionCategory; durationMs: number; statsDurationMin?: number },
  rules: TimerSessionRules,
): boolean {
  return session.category === "work" && statsDurationMinutesOf(session) >= rules.workTier1Min;
}

export function countEffectiveTomatoes(
  sessions: ReadonlyArray<{ category: TimerSessionCategory; durationMs: number; statsDurationMin?: number }>,
  rules: TimerSessionRules,
): number {
  let count = 0;
  for (const session of sessions) {
    if (isTomatoWorkSession(session, rules)) count += 1;
  }
  return count;
}
