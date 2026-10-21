// 周可视化：饥/饱/精力/奖赏 → 从左边长出的 bar（时间=Y，1–10 分=宽）
import type { LifePointMark, LifeSleepRange } from "@/services/timetable/lifeRecordOverlays";

export type WeekScoreKind = "hunger" | "satiety" | "energy" | "reward";

export interface WeekScoreDot {
  time: number;
  value: number;
}

export interface WeekScoreSeries {
  kind: WeekScoreKind;
  color: string;
  fill: "empty" | "solid";
  shape: "bar" | "line";
  points: WeekScoreDot[];
}

export const WEEK_SCORE_SERIES_META: Omit<WeekScoreSeries, "points">[] = [
  { kind: "satiety", color: "var(--color-red)", fill: "solid", shape: "bar" },
  { kind: "hunger", color: "var(--color-red-light)", fill: "solid", shape: "bar" },
  { kind: "energy", color: "var(--color-yellow)", fill: "solid", shape: "line" },
  { kind: "reward", color: "var(--color-blue)", fill: "solid", shape: "line" },
];

function scoreOf(n: number | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.min(10, Math.max(1, Math.round(n)));
}

function pushDot(out: WeekScoreDot[], time: number, raw: number | undefined): void {
  const value = scoreOf(raw);
  if (value == null) return;
  out.push({ time, value });
}

/** 从生活点汇总序列；没数字的点不进图。活动/睡觉上的精力并进折线 */
export function collectWeekScoreSeries(points: LifePointMark[], sleeps: LifeSleepRange[] = []): WeekScoreSeries[] {
  const buckets: Record<WeekScoreKind, WeekScoreDot[]> = {
    hunger: [],
    satiety: [],
    energy: [],
    reward: [],
  };
  for (const mark of points) {
    if (mark.kind === "eat") {
      pushDot(buckets.hunger, mark.time, mark.hunger);
      pushDot(buckets.satiety, mark.time, mark.satiety);
    } else if (mark.kind === "toilet") {
      pushDot(buckets.energy, mark.endAt ?? mark.time, mark.energy);
    } else if (mark.kind === "energy") {
      pushDot(buckets.energy, mark.time, mark.energy);
    } else if (mark.kind === "reward") {
      pushDot(buckets.reward, mark.time, mark.reward);
    }
  }
  for (const sleep of sleeps) {
    const t = sleep.wakeAt ?? sleep.end ?? sleep.start;
    pushDot(buckets.energy, t, sleep.energy);
  }
  return WEEK_SCORE_SERIES_META.map((meta) => ({
    ...meta,
    points: buckets[meta.kind].sort((a, b) => a.time - b.time || a.value - b.value),
  })).filter((series) => series.points.length > 0);
}

/** 基线在左：1–10 分对应满宽的 1/10–10/10 */
export function scoreBarWidth(value: number, width: number): number {
  return (value / 10) * width;
}

export const WEEK_SCORE_BAR_H = 10;
export const WEEK_SCORE_BAR_GAP = 2;

export interface WeekScorePlacedBar {
  kind: WeekScoreKind;
  color: string;
  fill: "empty" | "solid";
  time: number;
  value: number;
  y: number;
}

const KIND_ORDER: Record<WeekScoreKind, number> = {
  hunger: 0,
  satiety: 1,
  energy: 2,
  reward: 3,
};

/**
 * 按时间尽量靠，但相邻 bar 强制留 gap；挤在一起时往后推，不要求时刻精确。
 */
export function placeWeekScoreBars(
  series: WeekScoreSeries[],
  timeToY: (time: number) => number,
  barH = WEEK_SCORE_BAR_H,
  gap = WEEK_SCORE_BAR_GAP,
  maxY = Number.POSITIVE_INFINITY,
): WeekScorePlacedBar[] {
  const flat: Omit<WeekScorePlacedBar, "y">[] = [];
  for (const s of series) {
    if (s.shape === "line") continue;
    for (const p of s.points) {
      flat.push({ kind: s.kind, color: s.color, fill: s.fill, time: p.time, value: p.value });
    }
  }
  flat.sort((a, b) => a.time - b.time || KIND_ORDER[a.kind] - KIND_ORDER[b.kind]);

  const out: WeekScorePlacedBar[] = [];
  let lastBottom = Number.NEGATIVE_INFINITY;
  for (const item of flat) {
    const preferred = timeToY(item.time) - barH / 2;
    const y = Math.min(Math.max(preferred, lastBottom + gap, 0), Math.max(0, maxY - barH));
    out.push({ ...item, y });
    lastBottom = y + barH;
  }
  return out;
}
