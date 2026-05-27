import type { ComposeOption } from "echarts/core";
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import type { GridComponentOption, TooltipComponentOption } from "echarts/components";
import type { TimerSessionEmojis, TimerSessionStatsInclude } from "@/core/types/TimerSession";
import type { TimerWeekDayRow } from "@/services/timer/timerWeekUtils";

type ChartOption = ComposeOption<LineSeriesOption | BarSeriesOption | TooltipComponentOption | GridComponentOption>;

/** 工作：越长越深红；休息：越长越深蓝 */
const WORK_LINE_COLORS = {
  workVoid: "#868e96",
  workTier1: "#ff8787",
  workTier2: "#f03e3e",
  workTier3: "#c92a2a",
} as const;

const BREAK_LINE_COLORS = {
  breakShort: "#d0ebff",
  breakLong: "#1864ab",
} as const;

const WORK_MINUTES_FILL = "rgba(255, 182, 193, 0.52)";
const BREAK_MINUTES_FILL = "rgba(173, 216, 230, 0.48)";

const COUNT_AXIS_MIN = 8;
const TOOLTIP_WIDTH_PX = 108;
const TOOLTIP_GRID_STYLE =
  "display:grid;grid-template-columns:1fr 1fr;column-gap:8px;row-gap:2px;align-items:center;font-variant-numeric:tabular-nums;";
const TOOLTIP_EMOJI_STYLE = "font-size:14px;line-height:1;";

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

function formatTooltipEmojiCell(emoji: string, count: number): string {
  return `<span style="display:inline-flex;align-items:center;gap:3px;white-space:nowrap;"><span style="${TOOLTIP_EMOJI_STYLE}">${emoji}</span><span>${count}</span></span>`;
}

type TooltipEmojiEntry = { emoji: string; count: number };

function formatTooltipContent(
  dayLabel: string,
  workMinutes: number,
  breakMinutes: number,
  emojiEntries: TooltipEmojiEntry[],
): string {
  const hourCells = [
    `<span>Work</span><span style="white-space:nowrap;">${formatHours(workMinutes)} h</span>`,
    `<span>Break</span><span style="white-space:nowrap;">${formatHours(breakMinutes)} h</span>`,
  ];

  const emojiCells: string[] = [];
  for (let i = 0; i < emojiEntries.length; i += 2) {
    emojiCells.push(formatTooltipEmojiCell(emojiEntries[i].emoji, emojiEntries[i].count));
    emojiCells.push(
      emojiEntries[i + 1] ? formatTooltipEmojiCell(emojiEntries[i + 1].emoji, emojiEntries[i + 1].count) : "<span></span>",
    );
  }

  const hoursBlock = `<div style="${TOOLTIP_GRID_STYLE}">${hourCells.join("")}</div>`;
  const emojiBlock = emojiCells.length
    ? `<div style="${TOOLTIP_GRID_STYLE}margin-top:6px;">${emojiCells.join("")}</div>`
    : "";

  return (
    `<div style="display:flex;flex-direction:column;gap:4px;line-height:1.3;margin:0;">` +
    `<strong>${dayLabel}</strong>` +
    hoursBlock +
    emojiBlock +
    `</div>`
  );
}

type TierLineDef = {
  key: keyof typeof WORK_LINE_COLORS | keyof typeof BREAK_LINE_COLORS;
  emoji: string;
  color: string;
  counts: number[];
};

function buildTierLines(
  weekDays: TimerWeekDayRow[],
  emojis: TimerSessionEmojis,
  statsInclude: TimerSessionStatsInclude,
): TierLineDef[] {
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

function dayWorkBreakPercent(workMinutes: number, breakMinutes: number): { work: number; break: number } {
  const total = workMinutes + breakMinutes;
  if (total <= 0) return { work: 0, break: 0 };
  return {
    work: Math.round((workMinutes / total) * 100),
    break: Math.round((breakMinutes / total) * 100),
  };
}

// 双 Y 轴仅作刻度映射，不参与布局以免左右留白
const HIDDEN_AXIS = {
  show: false,
} as const;

export function buildTimerWeekChartOption(
  weekDays: TimerWeekDayRow[],
  emojis: TimerSessionEmojis,
  statsInclude: TimerSessionStatsInclude,
): ChartOption {
  const xLabels = weekDays.map((d) => d.label);
  const tierLines = buildTierLines(weekDays, emojis, statsInclude);
  const countAxisMax = Math.max(COUNT_AXIS_MIN, weekMaxTierCount(tierLines));

  const breakPct = weekDays.map((d) => dayWorkBreakPercent(d.totals.workMinutes, d.totals.breakMinutes).break);
  const workPct = weekDays.map((d) => dayWorkBreakPercent(d.totals.workMinutes, d.totals.breakMinutes).work);
  const pctToAxis = (pct: number) => (pct / 100) * countAxisMax;

  const lineSeries: LineSeriesOption[] = tierLines.map((tier) => ({
    name: tier.emoji,
    type: "line",
    yAxisIndex: 0,
    data: tier.counts,
    showSymbol: true,
    symbol: "circle",
    symbolSize: 6,
    lineStyle: { width: 1.5, color: tier.color },
    itemStyle: { color: tier.color, borderColor: tier.color, borderWidth: 0 },
    emphasis: { focus: "series" },
  }));

  const barSeries: BarSeriesOption[] = [
    {
      name: "__break_pct__",
      type: "bar",
      yAxisIndex: 0,
      stack: "pct",
      data: breakPct.map(pctToAxis),
      barMaxWidth: 14,
      itemStyle: { color: BREAK_MINUTES_FILL, borderRadius: [0, 0, 2, 2] },
      silent: true,
      tooltip: { show: false },
    },
    {
      name: "__work_pct__",
      type: "bar",
      yAxisIndex: 0,
      stack: "pct",
      data: workPct.map(pctToAxis),
      barMaxWidth: 14,
      itemStyle: { color: WORK_MINUTES_FILL, borderRadius: [2, 2, 0, 0] },
      silent: true,
      tooltip: { show: false },
    },
  ];

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

        return formatTooltipContent(day.label, day.totals.workMinutes, day.totals.breakMinutes, emojiEntries);
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
    series: [...lineSeries, ...barSeries],
  };
}
