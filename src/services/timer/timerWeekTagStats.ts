import type { Tag } from "@/core/types/Tag";
import type { TimerWeekDayRow } from "@/services/timer/timerWeekUtils";
import { statsDurationMinutesOf } from "@/services/timer/timerSessionClassifier";

/** 无首标签的会话归入该桶 */
export const TIMER_UNTAGGED_TAG_ID = 0;

const UNTAGGED_LABEL = "-";
const UNTAGGED_COLOR = "#8e969c";

export type TimerWeekTagStackSeries = {
  tagId: number;
  name: string;
  color: string;
  /** 按 count 轴刻度映射后的堆叠高度（7 天） */
  scaledValues: number[];
  /** 原始分钟数（7 天） */
  minutesPerDay: number[];
};

function firstTagId(tagIds: number[] | undefined): number {
  const ids = tagIds ?? [];
  return ids.length > 0 ? ids[0]! : TIMER_UNTAGGED_TAG_ID;
}

function resolveTagColor(tag: Tag | undefined, untaggedColor: string): string {
  if (!tag) return untaggedColor;
  return tag.backgroundColor || tag.color || UNTAGGED_COLOR;
}

function resolveTagName(tagId: number, getTag: (id: number) => Tag | undefined): string {
  if (tagId === TIMER_UNTAGGED_TAG_ID) return UNTAGGED_LABEL;
  return getTag(tagId)?.name ?? UNTAGGED_LABEL;
}

export function buildTimerWeekTagStacks(
  weekDays: TimerWeekDayRow[],
  getTag: (id: number) => Tag | undefined,
  countAxisMax: number,
  untaggedColor: string,
): TimerWeekTagStackSeries[] {
  const dayCount = weekDays.length;
  const minutesByTag = new Map<number, number[]>();

  weekDays.forEach((day, dayIdx) => {
    const dayTotals = new Map<number, number>();

    for (const session of day.sessions) {
      if (session.category !== "work" && session.category !== "work_hiit") continue;
      const mins = statsDurationMinutesOf(session);
      if (mins <= 0) continue;
      const tagId = firstTagId(session.tagIds);
      dayTotals.set(tagId, (dayTotals.get(tagId) ?? 0) + mins);
    }

    for (const [tagId, mins] of dayTotals) {
      if (!minutesByTag.has(tagId)) {
        minutesByTag.set(tagId, Array(dayCount).fill(0));
      }
      minutesByTag.get(tagId)![dayIdx] = mins;
    }
  });

  const series: TimerWeekTagStackSeries[] = [];

  for (const [tagId, minutesPerDay] of minutesByTag) {
    const hasData = minutesPerDay.some((m) => m > 0);
    if (!hasData) continue;

    const scaledValues = minutesPerDay.map((mins, dayIdx) => {
      const daySessions = weekDays[dayIdx]?.sessions ?? [];
      let dayTotal = 0;
      const dayMap = new Map<number, number>();
      for (const s of daySessions) {
        if (s.category !== "work" && s.category !== "work_hiit") continue;
        const m = statsDurationMinutesOf(s);
        if (m <= 0) continue;
        const id = firstTagId(s.tagIds);
        dayMap.set(id, (dayMap.get(id) ?? 0) + m);
        dayTotal += m;
      }
      if (dayTotal <= 0) return 0;
      return (mins / dayTotal) * countAxisMax;
    });

    series.push({
      tagId,
      name: resolveTagName(tagId, getTag),
      color: resolveTagColor(tagId === TIMER_UNTAGGED_TAG_ID ? undefined : getTag(tagId), untaggedColor),
      scaledValues,
      minutesPerDay,
    });
  }

  return series.sort((a, b) => {
    const sumA = a.minutesPerDay.reduce((x, y) => x + y, 0);
    const sumB = b.minutesPerDay.reduce((x, y) => x + y, 0);
    return sumB - sumA;
  });
}
