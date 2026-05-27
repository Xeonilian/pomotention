import type { TimerSessionEmojis, TimerSessionRules, TimerSessionStatsInclude } from "@/core/types/TimerSession";

export type WorkTierKey = "tier1" | "tier2" | "tier3";
export type BreakTierKey = "short" | "long";

/** 统计规则中不可取消勾选的分档 */
export const LOCKED_STATS_INCLUDE_KEYS = ["workVoid", "workTier2", "breakShort"] as const;

export type LockedStatsIncludeKey = (typeof LOCKED_STATS_INCLUDE_KEYS)[number];

export function isLockedStatsIncludeKey(key: keyof TimerSessionStatsInclude): key is LockedStatsIncludeKey {
  return (LOCKED_STATS_INCLUDE_KEYS as readonly string[]).includes(key);
}

export function enforceLockedStatsInclude(include: TimerSessionStatsInclude): TimerSessionStatsInclude {
  return {
    ...include,
    workVoid: true,
    workTier2: true,
    breakShort: true,
  };
}

export function naturalWorkTier(durationMinutes: number, rules: TimerSessionRules): WorkTierKey {
  if (durationMinutes >= rules.workTier3Min) return "tier3";
  if (durationMinutes >= rules.workTier2Min) return "tier2";
  return "tier1";
}

export function naturalBreakTier(durationMinutes: number, rules: TimerSessionRules): BreakTierKey | null {
  if (durationMinutes >= rules.breakLongMin) return "long";
  if (durationMinutes >= rules.breakShortMin) return "short";
  return null;
}

function workTierIncludeKey(tier: WorkTierKey): keyof TimerSessionStatsInclude {
  if (tier === "tier3") return "workTier3";
  if (tier === "tier2") return "workTier2";
  return "workTier1";
}

/** 自然档未勾选时向下降落（Work 最低落到 tier2） */
export function resolveWorkTierForStats(durationMinutes: number, rules: TimerSessionRules): WorkTierKey {
  const natural = naturalWorkTier(durationMinutes, rules);
  const fallbacks: WorkTierKey[] =
    natural === "tier3" ? ["tier3", "tier2", "tier1"] : natural === "tier2" ? ["tier2", "tier1"] : ["tier1"];

  for (const tier of fallbacks) {
    if (rules.statsInclude[workTierIncludeKey(tier)]) return tier;
  }
  return "tier2";
}

/** 自然 long 未勾选时回落 short */
export function resolveBreakTierForStats(durationMinutes: number, rules: TimerSessionRules): BreakTierKey {
  const natural = naturalBreakTier(durationMinutes, rules);
  if (natural === "long" && rules.statsInclude.breakLong) return "long";
  return "short";
}

export function emojiForWorkTier(tier: WorkTierKey, emojis: TimerSessionEmojis): string {
  if (tier === "tier3") return emojis.workTier3;
  if (tier === "tier2") return emojis.workTier2;
  return emojis.workTier1;
}

export function emojiForBreakTier(tier: BreakTierKey, emojis: TimerSessionEmojis): string {
  return tier === "long" ? emojis.breakLong : emojis.breakShort;
}
