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

/** 番茄数 → 颜色 ratio（20 拉满；低段抬升） */
export const POMO_STANDARD_COUNT = 20;
export const POMO_STATS_BG_MAX_ALPHA = 0.45;
const POMO_RGB_FROM = { r: 0x99, g: 0x99, b: 0x99 };
const POMO_RGB_TO = { r: 0xdc, g: 0x1a, b: 0x1a }; // rgb(220 26 26)
const POMO_BG_FROM = { r: 0xef, g: 0xed, b: 0xed };
/** badge 不透明底 ≈ 白底上叠 rgb(220 26 26 / 45%) */
const POMO_BG_TO = {
  r: Math.round(255 * (1 - POMO_STATS_BG_MAX_ALPHA) + POMO_RGB_TO.r * POMO_STATS_BG_MAX_ALPHA),
  g: Math.round(255 * (1 - POMO_STATS_BG_MAX_ALPHA) + POMO_RGB_TO.g * POMO_STATS_BG_MAX_ALPHA),
  b: Math.round(255 * (1 - POMO_STATS_BG_MAX_ALPHA) + POMO_RGB_TO.b * POMO_STATS_BG_MAX_ALPHA),
};

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function rgbHex(r: number, g: number, b: number): string {
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function lerpRgb(
  from: { r: number; g: number; b: number },
  to: { r: number; g: number; b: number },
  t: number,
): string {
  return rgbHex(lerpChannel(from.r, to.r, t), lerpChannel(from.g, to.g, t), lerpChannel(from.b, to.b, t));
}

export function mapPomoCountToColorRatio(count: number): number {
  if (count <= 0) return 0;
  const n = Math.min(count, POMO_STANDARD_COUNT);
  if (n === 1) return 0.25;
  if (n === 2) return 0.3;
  const t = (n - 2) / (POMO_STANDARD_COUNT - 2);
  return 0.3 + Math.pow(t, 0.6) * 0.7;
}

/** 字色：#999 → rgb(220 26 26) */
export function getPomoColor(ratio: number): string {
  return lerpRgb(POMO_RGB_FROM, POMO_RGB_TO, clamp01(ratio));
}

/** 日程模式 badge 底：浅灰 → 白底叠 45% 红的实色等价 */
export function getPomoBadgeBgColor(ratio: number): string {
  return lerpRgb(POMO_BG_FROM, POMO_BG_TO, clamp01(ratio));
}

/** 统计模式整格底：透明白 → rgb(220 26 26 / ratio×45%) */
export function getStatsPomoBgColorHEX(ratio: number): string {
  const t = clamp01(ratio);
  const hex = (n: number) => n.toString(16).padStart(2, "0");
  const a = Math.round(t * POMO_STATS_BG_MAX_ALPHA * 255);
  return `#${hex(lerpChannel(0xff, POMO_RGB_TO.r, t))}${hex(lerpChannel(0xff, POMO_RGB_TO.g, t))}${hex(lerpChannel(0xff, POMO_RGB_TO.b, t))}${hex(a)}`;
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
