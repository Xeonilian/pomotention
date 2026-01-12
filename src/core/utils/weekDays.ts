// src/views/Home/WeekPlanner/utils.ts
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

/**
 * 提取item的时间范围（兼容缺失字段）
 */
export function getItemWeekRange(item: UnifiedItem): { start: number; end: number } | null {
  if (!item.ts) return null;

  if (item.type === "todo") {
    const start = item.startWeek || item.ts;
    const end = item.doneWeek || start + 60 * 60 * 1000;
    return { start, end };
  } else {
    const start = item.activityDueRange?.[0] || item.ts;
    const durationMin = Number(item.activityDueRange?.[1]) || 30;
    const end = item.doneWeek || start + durationMin * 60 * 1000;
    return { start, end };
  }
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

/**
 * 生成兜底时间块（布局计算失败时使用）
 */
export function getFallbackWeekBlocks(items: UnifiedItem[], dayIndex: number): WeekBlockItem[] {
  return items.map((item) => {
    const range = getItemWeekRange(item);
    return {
      id: item.key,
      type: item.type,
      start: range?.start || item.ts,
      end: range?.end || item.ts + 3600000,
      dayIndex,
      item,
      column: 0,
      width: "100%",
      left: "0%",
    };
  });
}
