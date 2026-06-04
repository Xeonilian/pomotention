import type { ComposeOption } from "echarts/core";
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import type { GridComponentOption, TooltipComponentOption } from "echarts/components";
import type { Tag } from "@/core/types/Tag";
import type { TimerSessionEmojis, TimerSessionStatsInclude } from "@/core/types/TimerSession";
import type { TimerWeekDayRow } from "@/services/timer/timerWeekUtils";
import { buildTimerWeekTagStacks, type TimerWeekTagStackSeries } from "@/services/timer/timerWeekTagStats";

type ChartOption = ComposeOption<LineSeriesOption | BarSeriesOption | TooltipComponentOption | GridComponentOption>;

/** 工作：越长越深红；休息：越长越深蓝 */
const WORK_LINE_COLORS = {
  workVoid: "#868e96",
  workTier1: "#ff8787",
  workTier2: "#f03e3e",
  workTier3: "#c92a2a",
} as const;

const BREAK_LINE_COLORS = {
  breakShort: "#228be6",
  breakLong: "#1864ab",
} as const;

const COUNT_AXIS_MIN = 8;
const TOOLTIP_WIDTH_PX = 108;
const TOOLTIP_GRID_STYLE =
  "display:grid;grid-template-columns:1fr 1fr;column-gap:8px;row-gap:2px;align-items:center;font-variant-numeric:tabular-nums;";
const TOOLTIP_EMOJI_GRID_STYLE =
  "display:grid;grid-template-columns:1.4em auto;column-gap:6px;row-gap:6px;align-items:center;font-variant-numeric:tabular-nums;";
const TOOLTIP_EMOJI_STYLE = "display:flex;justify-content:center;align-items:center;width:1.4em;font-size:14px;line-height:1;";

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

function formatTooltipEmojiCell(emoji: string, count: number): string {
  return `<span style="${TOOLTIP_EMOJI_STYLE}">${emoji}</span><span>${count}</span>`;
}

type TooltipEmojiEntry = { emoji: string; count: number };

function formatTooltipContent(
  dayLabel: string,
  emojiEntries: TooltipEmojiEntry[],
  tagEntries: Array<{ name: string; minutes: number }>,
): string {
  const emojiCells = emojiEntries.map((entry) => formatTooltipEmojiCell(entry.emoji, entry.count));
  const emojiBlock = emojiCells.length ? `<div style="${TOOLTIP_EMOJI_GRID_STYLE}margin-top:4px;">${emojiCells.join("")}</div>` : "";

  const tagCells = tagEntries
    .filter((t) => t.minutes > 0)
    .map((t) => `<span>${t.name}</span><span style="white-space:nowrap;">${formatHours(t.minutes)} h</span>`);
  const tagBlock = tagCells.length ? `<div style="${TOOLTIP_GRID_STYLE}margin-top:6px;">${tagCells.join("")}</div>` : "";

  return (
    `<div style="display:flex;flex-direction:column;gap:4px;line-height:1.3;margin:0;">` +
    `<strong>${dayLabel}</strong>` +
    emojiBlock +
    tagBlock +
    `</div>`
  );
}

type TierLineDef = {
  key: keyof typeof WORK_LINE_COLORS | keyof typeof BREAK_LINE_COLORS;
  emoji: string;
  color: string;
  counts: number[];
};

function buildTierLines(weekDays: TimerWeekDayRow[], emojis: TimerSessionEmojis, statsInclude: TimerSessionStatsInclude): TierLineDef[] {
  const pick = (fn: (t: TimerWeekDayRow["totals"]) => number) => weekDays.map((d) => fn(d.totals));

  const defs: TierLineDef[] = [
    { key: "workVoid", emoji: emojis.workVoid, color: WORK_LINE_COLORS.workVoid, counts: pick((t) => t.voidCount) },
    { key: "workTier1", emoji: emojis.workTier1, color: WORK_LINE_COLORS.workTier1, counts: pick((t) => t.workTier1) },
    { key: "workTier2", emoji: emojis.workTier2, color: WORK_LINE_COLORS.workTier2, counts: pick((t) => t.workTier2) },
    { key: "workTier3", emoji: emojis.workTier3, color: WORK_LINE_COLORS.workTier3, counts: pick((t) => t.workTier3) },
    { key: "breakShort", emoji: emojis.breakShort, color: BREAK_LINE_COLORS.breakShort, counts: pick((t) => t.breakShort) },
    { key: "breakLong", emoji: emojis.breakLong, color: BREAK_LINE_COLORS.breakLong, counts: pick((t) => t.breakLong) },
  ];

  return defs.filter((d) => statsInclude[d.key as keyof TimerSessionStatsInclude]);
}

function weekMaxTierCount(tierLines: TierLineDef[]): number {
  let max = 0;
  for (const tier of tierLines) {
    for (const n of tier.counts) {
      if (n > max) max = n;
    }
  }
  return max;
}

function buildTagBarSeries(tagStacks: TimerWeekTagStackSeries[]): BarSeriesOption[] {
  return tagStacks.map((stack, index) => ({
    name: stack.name,
    type: "bar",
    yAxisIndex: 0,
    z: 1,
    stack: "tag_pct",
    data: stack.scaledValues,
    barMaxWidth: 14,
    itemStyle: {
      color: stack.color,
      borderRadius: index === tagStacks.length - 1 ? [2, 2, 0, 0] : 0,
    },
    silent: true,
    tooltip: { show: false },
  }));
}

// 双 Y 轴仅作刻度映射，不参与布局以免左右留白
const HIDDEN_AXIS = {
  show: false,
} as const;

export function buildTimerWeekChartOption(
  weekDays: TimerWeekDayRow[],
  emojis: TimerSessionEmojis,
  statsInclude: TimerSessionStatsInclude,
  getTag: (id: number) => Tag | undefined,
): ChartOption {
  const xLabels = weekDays.map((d) => d.label);
  const tierLines = buildTierLines(weekDays, emojis, statsInclude);
  const countAxisMax = Math.max(COUNT_AXIS_MIN, weekMaxTierCount(tierLines));
  const tagStacks = buildTimerWeekTagStacks(weekDays, getTag, countAxisMax);

  const lineSeries: LineSeriesOption[] = tierLines.map((tier) => ({
    name: tier.emoji,
    type: "line",
    yAxisIndex: 0,
    z: 3,
    data: tier.counts,
    showSymbol: true,
    symbol: "circle",
    symbolSize: 7,
    lineStyle: { width: 1.5, color: tier.color },
    itemStyle: {
      color: tier.color,
      borderColor: "#fff",
      borderWidth: 1.5,
    },
    emphasis: { focus: "series" },
  }));

  const barSeries = buildTagBarSeries(tagStacks);

  return {
    animation: false,
    grid: { left: 0, right: 0, top: 8, bottom: 28, containLabel: false },
    tooltip: {
      trigger: "axis",
      confine: true,
      renderMode: "html",
      extraCssText: `width:${TOOLTIP_WIDTH_PX}px;min-width:${TOOLTIP_WIDTH_PX}px;max-width:${TOOLTIP_WIDTH_PX}px;white-space:normal;box-sizing:border-box;font-family:ui-monospace,"Cascadia Code",Consolas,monospace;`,
      textStyle: { fontSize: 11, fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace' },
      formatter(params: unknown) {
        const items = (Array.isArray(params) ? params : [params]) as Array<{ dataIndex?: number }>;
        const idx = items[0]?.dataIndex;
        if (idx == null || typeof idx !== "number") return "";
        const day = weekDays[idx];
        if (!day) return "";

        const emojiEntries: TooltipEmojiEntry[] = [];
        for (const tier of tierLines) {
          const count = tier.counts[idx];
          if (!count) continue;
          emojiEntries.push({ emoji: tier.emoji, count });
        }

        const tagEntries = tagStacks.map((s) => ({
          name: s.name,
          minutes: s.minutesPerDay[idx] ?? 0,
        }));

        return formatTooltipContent(day.label, emojiEntries, tagEntries);
      },
    },
    xAxis: {
      type: "category",
      data: xLabels,
      boundaryGap: false,
      axisLabel: { fontSize: 10 },
      axisTick: { alignWithLabel: true, show: true },
      axisLine: { show: false },
    },
    yAxis: {
      type: "value",
      min: 0,
      max: countAxisMax,
      minInterval: 1,
      ...HIDDEN_AXIS,
    },
    series: [...barSeries, ...lineSeries],
  };
}
