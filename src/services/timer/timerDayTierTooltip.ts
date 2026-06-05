import type { TimerSessionEmojis, TimerSessionStatsInclude } from "@/core/types/TimerSession";
import type { TimerDayTotals } from "@/services/timer/timerWeekUtils";

type DayTierTooltipDef = {
  includeKey: keyof TimerSessionStatsInclude;
  countOf: (totals: TimerDayTotals) => number;
  emojiOf: (emojis: TimerSessionEmojis) => string;
};

/** 日 hover：先工作，后休息，最后 Squash */
const DAY_TIER_TOOLTIP_DEFS: DayTierTooltipDef[] = [
  { includeKey: "workTier1", countOf: (t) => t.workTier1, emojiOf: (e) => e.workTier1 },
  { includeKey: "workTier2", countOf: (t) => t.workTier2, emojiOf: (e) => e.workTier2 },
  { includeKey: "workTier3", countOf: (t) => t.workTier3, emojiOf: (e) => e.workTier3 },
  { includeKey: "breakShort", countOf: (t) => t.breakShort, emojiOf: (e) => e.breakShort },
  { includeKey: "breakLong", countOf: (t) => t.breakLong, emojiOf: (e) => e.breakLong },
  { includeKey: "workVoid", countOf: (t) => t.voidCount, emojiOf: (e) => e.workVoid },
];

export type DayTierTooltipEntry = { emoji: string; count: number };

export function buildDayTierTooltipEntries(
  totals: TimerDayTotals,
  emojis: TimerSessionEmojis,
  statsInclude: TimerSessionStatsInclude,
): DayTierTooltipEntry[] {
  return DAY_TIER_TOOLTIP_DEFS.filter((def) => statsInclude[def.includeKey])
    .map((def) => ({ emoji: def.emojiOf(emojis), count: def.countOf(totals) }))
    .filter((entry) => entry.count > 0);
}
