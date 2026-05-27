import type { TimerSessionRules } from "@/core/types/TimerSession";
import { DEFAULT_TIMER_SESSION_EMOJIS, DEFAULT_TIMER_SESSION_RULES } from "@/core/types/TimerSession";
import { clampEmojiText } from "@/services/timer/timerSessionClassifier";

/** 合并旧版 tomatoMinMinutes / cherryMinMinutes 配置 */
export function normalizeTimerSessionRules(raw: unknown): TimerSessionRules {
  const base = { ...DEFAULT_TIMER_SESSION_RULES, emojis: { ...DEFAULT_TIMER_SESSION_EMOJIS } };
  if (!raw || typeof raw !== "object") return base;

  const r = raw as Record<string, unknown>;
  const legacyEmojis = r.emojis && typeof r.emojis === "object" ? (r.emojis as Record<string, string>) : {};

  const emojis = {
    workVoid: clampEmojiText(String(legacyEmojis.workVoid ?? base.emojis.workVoid)),
    workBelow: clampEmojiText(String(legacyEmojis.workBelow ?? base.emojis.workBelow)),
    workTier1: clampEmojiText(String(legacyEmojis.workTier1 ?? base.emojis.workTier1)),
    workTier2: clampEmojiText(String(legacyEmojis.workTier2 ?? base.emojis.workTier2)),
    workTier3: clampEmojiText(String(legacyEmojis.workTier3 ?? base.emojis.workTier3)),
    breakShort: clampEmojiText(String(legacyEmojis.breakShort ?? base.emojis.breakShort)),
    breakTier1: clampEmojiText(String(legacyEmojis.breakTier1 ?? base.emojis.breakTier1)),
    breakTier2: clampEmojiText(String(legacyEmojis.breakTier2 ?? base.emojis.breakTier2)),
  };

  if (typeof r.workTier1Min === "number") {
    return {
      workTier1Min: Number(r.workTier1Min) || base.workTier1Min,
      workTier2Min: Number(r.workTier2Min) || base.workTier2Min,
      workTier3Min: Number(r.workTier3Min) || base.workTier3Min,
      breakTier1Min: Number(r.breakTier1Min) || base.breakTier1Min,
      breakTier2Min: Number(r.breakTier2Min) || base.breakTier2Min,
      emojis,
      statsShowDateLabel: r.statsShowDateLabel !== false,
    };
  }

  const cherry = Number(r.cherryMinMinutes) || 15;
  const tomato = Number(r.tomatoMinMinutes) || 25;
  const cloud = Number(r.cloudBreakMinMinutes) || 15;

  return {
    workTier1Min: cherry,
    workTier2Min: tomato,
    workTier3Min: 45,
    breakTier1Min: 5,
    breakTier2Min: cloud,
    emojis: {
      ...emojis,
      workTier1: emojis.workTier1 || "🍒",
      workTier2: emojis.workTier2 || "🍅",
      workTier3: emojis.workTier3 || "🍊",
      breakTier2: emojis.breakTier2 || "☁",
    },
    statsShowDateLabel: r.statsShowDateLabel !== false,
  };
}
