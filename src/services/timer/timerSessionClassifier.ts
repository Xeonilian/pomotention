import type { TimerSessionCategory, TimerSessionEndReason, TimerSessionRecord, TimerSessionRules } from "@/core/types/TimerSession";

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
    if (durationMinutes >= rules.workTier3Min) {
      return { category: "work", emoji: clampEmojiText(e.workTier3) };
    }
    if (durationMinutes >= rules.workTier2Min) {
      return { category: "work", emoji: clampEmojiText(e.workTier2) };
    }
    if (durationMinutes >= rules.workTier1Min) {
      return { category: "work", emoji: clampEmojiText(e.workTier1) };
    }
    // 未满档 1 的完成工作：与档 1 同符号，不设单独「不足」档
    return { category: "work", emoji: clampEmojiText(e.workTier1) };
  }

  if (durationMinutes >= rules.breakLongMin) {
    return { category: "break", emoji: clampEmojiText(e.breakLong) };
  }
  return { category: "break", emoji: clampEmojiText(e.breakShort) };
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

/** 统计用：≥ 第二档工作时长计为番茄数 */
export function isTomatoWorkSession(
  session: { category: TimerSessionCategory; durationMs: number; statsDurationMin?: number },
  rules: TimerSessionRules,
): boolean {
  return session.category === "work" && statsDurationMinutesOf(session) >= rules.workTier2Min;
}
