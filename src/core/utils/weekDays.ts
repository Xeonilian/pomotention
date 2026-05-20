// src/views/Home/WeekPlanner/weekDays.ts
import type { UnifiedItem, WeekBlockItem } from "@/core/types/Week";

/**
 * 获取一天的起始时间戳（毫秒）
 */
export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * 格式化月日（仅显示日期数字）
 */
export function formatMonthDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getDate()}`;
}

/**
 * 获取时间戳对应的小时数（0-23）
 */
export function getHour(ts: number): number {
  return new Date(ts).getHours();
}

/** 周视图默认条块时长（分钟） */
export const DEFAULT_BLOCK_MIN = 30;
export const DEFAULT_BLOCK_MS = DEFAULT_BLOCK_MIN * 60 * 1000;

/**
 * 周视图时间范围（start/end 毫秒）
 *
 * 字段对应（s/e 为口语简称）：
 * - todo: startTime / doneTime，分桶用 ts（≈ id）
 * - schedule: activityDueRange[0] / doneTime，时长 activityDueRange[1]（分钟）
 *
 * 条块推断：
 * - s、e 都有 → 原样
 * - 仅有 s → e = s + 默认 30min（schedule 用预约时长）
 * - 仅有 e → s = e - 默认 30min
 */
export function getItemWeekRange(item: UnifiedItem): { start: number; end: number } | null {
  if (!item.ts) return null;

  if (item.type === "todo") {
    if (item.doneTime != null && item.startTime == null) {
      const end = item.doneTime;
      return { start: end - DEFAULT_BLOCK_MS, end };
    }
    const start = item.startTime ?? item.ts;
    return { start, end: item.doneTime ?? start + DEFAULT_BLOCK_MS };
  }

  const rangeStart = item.activityDueRange?.[0];
  if (item.doneTime != null && rangeStart == null) {
    const end = item.doneTime;
    return { start: end - DEFAULT_BLOCK_MS, end };
  }
  const start = rangeStart ?? item.ts;
  const durationMin = Number(item.activityDueRange?.[1]) || DEFAULT_BLOCK_MIN;
  return { start, end: item.doneTime ?? start + durationMin * 60 * 1000 };
}

/**
 * 判断两个时间块是否重叠
 */
export function isWeekBlockOverlapping(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return !(a.end <= b.start || b.end <= a.start);
}

/**
 * 生成pomo颜色（进度比例转渐变色）
 */
export function getPomoColor(ratio: number): string {
  const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const r = clamp(ratio);

  const from = { r: 0x99, g: 0x99, b: 0x99 };
  const to = { r: 0xd6, g: 0x48, b: 0x64 };

  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

  const R = lerp(from.r, to.r, r);
  const G = lerp(from.g, to.g, r);
  const B = lerp(from.b, to.b, r);

  const hex = (n: number) => n.toString(16).padStart(2, "0");

  return `#${hex(R)}${hex(G)}${hex(B)}`;
}

/** 布局未就绪时的兜底块 */
export function getFallbackWeekBlocks(items: UnifiedItem[], dayIndex: number): WeekBlockItem[] {
  return items.flatMap((item) => {
    const range = getItemWeekRange(item);
    if (!range) return [];
    return [
      {
        id: item.key,
        type: item.type,
        start: range.start,
        end: range.end,
        dayIndex,
        item,
        column: 0,
        width: "100%",
        left: "0%",
      },
    ];
  });
}
