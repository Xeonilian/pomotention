import type { TimerSessionRules, TimerSessionStatsInclude } from "@/core/types/TimerSession";
import {
  DEFAULT_TIMER_SESSION_EMOJIS,
  DEFAULT_TIMER_SESSION_RULES,
  DEFAULT_TIMER_SESSION_STATS_INCLUDE,
  TIMER_SESSION_RULE_LIMITS,
} from "@/core/types/TimerSession";
import { clampEmojiText } from "@/services/timer/timerSessionClassifier";

function clampTierMin(value: unknown, key: keyof typeof TIMER_SESSION_RULE_LIMITS, fallback: number): number {
  const { min, max } = TIMER_SESSION_RULE_LIMITS[key];
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function coerceThresholds(r: TimerSessionRules): Pick<
  TimerSessionRules,
  "workTier1Min" | "workTier2Min" | "workTier3Min" | "breakShortMin" | "breakLongMin"
> {
  const base = DEFAULT_TIMER_SESSION_RULES;
  let w1 = clampTierMin(r.workTier1Min, "workTier1Min", base.workTier1Min);
  let w2 = clampTierMin(r.workTier2Min, "workTier2Min", base.workTier2Min);
  let w3 = clampTierMin(r.workTier3Min, "workTier3Min", base.workTier3Min);
  let bs = clampTierMin(r.breakShortMin, "breakShortMin", base.breakShortMin);
  let bl = clampTierMin(r.breakLongMin, "breakLongMin", base.breakLongMin);

  if (w2 <= w1) w2 = Math.min(TIMER_SESSION_RULE_LIMITS.workTier2Min.max, w1 + 1);
  if (w3 <= w2) w3 = Math.min(TIMER_SESSION_RULE_LIMITS.workTier3Min.max, w2 + 1);
  if (bl <= bs) bl = Math.min(TIMER_SESSION_RULE_LIMITS.breakLongMin.max, bs + 1);

  return {
    workTier1Min: clampTierMin(w1, "workTier1Min", base.workTier1Min),
    workTier2Min: clampTierMin(w2, "workTier2Min", base.workTier2Min),
    workTier3Min: clampTierMin(w3, "workTier3Min", base.workTier3Min),
    breakShortMin: clampTierMin(bs, "breakShortMin", base.breakShortMin),
    breakLongMin: clampTierMin(bl, "breakLongMin", base.breakLongMin),
  };
}

function parseStatsInclude(r: Record<string, unknown>): TimerSessionStatsInclude {
  const raw = r.statsInclude && typeof r.statsInclude === "object" ? (r.statsInclude as Record<string, unknown>) : {};
  const base = DEFAULT_TIMER_SESSION_STATS_INCLUDE;
  return {
    workVoid: typeof raw.workVoid === "boolean" ? raw.workVoid : base.workVoid,
    workTier1: typeof raw.workTier1 === "boolean" ? raw.workTier1 : base.workTier1,
    workTier2: typeof raw.workTier2 === "boolean" ? raw.workTier2 : base.workTier2,
    workTier3: typeof raw.workTier3 === "boolean" ? raw.workTier3 : base.workTier3,
    breakShort: typeof raw.breakShort === "boolean" ? raw.breakShort : base.breakShort,
    breakLong: typeof raw.breakLong === "boolean" ? raw.breakLong : base.breakLong,
  };
}

/** 合并旧版 tomatoMinMinutes / cherryMinMinutes / 三档休息 配置 */
export function normalizeTimerSessionRules(raw: unknown): TimerSessionRules {
  const base = {
    ...DEFAULT_TIMER_SESSION_RULES,
    emojis: { ...DEFAULT_TIMER_SESSION_EMOJIS },
    statsInclude: { ...DEFAULT_TIMER_SESSION_STATS_INCLUDE },
  };
  if (!raw || typeof raw !== "object") return base;

  const r = raw as Record<string, unknown>;
  const legacyEmojis = r.emojis && typeof r.emojis === "object" ? (r.emojis as Record<string, string>) : {};

  const emojis = {
    workVoid: clampEmojiText(String(legacyEmojis.workVoid ?? base.emojis.workVoid)),
    workTier1: clampEmojiText(String(legacyEmojis.workTier1 ?? base.emojis.workTier1)),
    workTier2: clampEmojiText(String(legacyEmojis.workTier2 ?? base.emojis.workTier2)),
    workTier3: clampEmojiText(String(legacyEmojis.workTier3 ?? base.emojis.workTier3)),
    breakShort: clampEmojiText(String(legacyEmojis.breakShort ?? base.emojis.breakShort)),
    breakLong: clampEmojiText(
      String(legacyEmojis.breakLong ?? legacyEmojis.breakTier2 ?? base.emojis.breakLong),
    ),
  };

  const statsInclude = parseStatsInclude(r);

  if (typeof r.workTier1Min === "number") {
    const thresholds = coerceThresholds({
      ...base,
      workTier1Min: Number(r.workTier1Min) || base.workTier1Min,
      workTier2Min: Number(r.workTier2Min) || base.workTier2Min,
      workTier3Min: Number(r.workTier3Min) || base.workTier3Min,
      breakShortMin:
        typeof r.breakShortMin === "number"
          ? Number(r.breakShortMin)
          : typeof r.breakTier1Min === "number"
            ? Number(r.breakTier1Min)
            : base.breakShortMin,
      breakLongMin:
        typeof r.breakLongMin === "number"
          ? Number(r.breakLongMin)
          : typeof r.breakTier2Min === "number"
              ? Number(r.breakTier2Min)
              : base.breakLongMin,
    });
    return { ...thresholds, emojis, statsInclude };
  }

  const cherry = Number(r.cherryMinMinutes) || 15;
  const tomato = Number(r.tomatoMinMinutes) || 25;
  const cloud = Number(r.cloudBreakMinMinutes) || 15;

  const thresholds = coerceThresholds({
    ...base,
    workTier1Min: cherry,
    workTier2Min: tomato,
    workTier3Min: 45,
    breakShortMin: 5,
    breakLongMin: cloud,
  });

  return {
    ...thresholds,
    emojis: {
      ...emojis,
      workTier1: emojis.workTier1 || "🍒",
      workTier2: emojis.workTier2 || "🍅",
      workTier3: emojis.workTier3 || "🍉",
      breakLong: emojis.breakLong || "☁",
    },
    statsInclude,
  };
}

export { coerceThresholds as coerceTimerSessionThresholds };
