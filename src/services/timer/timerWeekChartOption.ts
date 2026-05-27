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

const HIDDEN_AXIS = {
  axisLabel: { show: false },
  axisTick: { show: false },
  axisLine: { show: false },
  splitLine: { show: false },
  name: "",
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

  const tierByEmoji = new Map(tierLines.map((t) => [t.emoji, t]));

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
      yAxisIndex: 1,
      stack: "pct",
      data: breakPct,
      barMaxWidth: 14,
      itemStyle: { color: BREAK_MINUTES_FILL, borderRadius: [0, 0, 2, 2] },
      silent: true,
      tooltip: { show: false },
    },
    {
      name: "__work_pct__",
      type: "bar",
      yAxisIndex: 1,
      stack: "pct",
      data: workPct,
      barMaxWidth: 14,
      itemStyle: { color: WORK_MINUTES_FILL, borderRadius: [2, 2, 0, 0] },
      silent: true,
      tooltip: { show: false },
    },
  ];

  return {
    animation: false,
    grid: { left: 8, right: 8, top: 8, bottom: 28 },
    tooltip: {
      trigger: "axis",
      confine: true,
      textStyle: { fontSize: 11 },
      formatter(params: unknown) {
        const items = (Array.isArray(params) ? params : [params]) as Array<{
          seriesType?: string;
          seriesName?: string;
          dataIndex?: number;
          value?: number | string;
        }>;
        const idx = items[0]?.dataIndex;
        if (idx == null || typeof idx !== "number") return "";
        const day = weekDays[idx];
        if (!day) return "";

        const { work, break: brk } = dayWorkBreakPercent(day.totals.workMinutes, day.totals.breakMinutes);
        const lines: string[] = [`<strong>${day.label}</strong>`];
        if (work + brk > 0) {
          lines.push(`工 ${work}% · 休 ${brk}%`);
        }

        for (const p of items) {
          if (p.seriesType !== "line") continue;
          const count = typeof p.value === "number" ? p.value : Number(p.value);
          if (!count) continue;
          const tier = tierByEmoji.get(String(p.seriesName ?? ""));
          if (!tier) continue;
          lines.push(`${tier.emoji} ${count}`);
        }

        return lines.join("<br/>");
      },
    },
    xAxis: {
      type: "category",
      data: xLabels,
      axisLabel: { fontSize: 10 },
      axisTick: { alignWithLabel: true, show: true },
      axisLine: { show: false },
    },
    yAxis: [
      {
        type: "value",
        position: "left",
        min: 0,
        max: countAxisMax,
        minInterval: 1,
        ...HIDDEN_AXIS,
      },
      {
        type: "value",
        position: "right",
        min: 0,
        max: 100,
        ...HIDDEN_AXIS,
      },
    ],
    series: [...lineSeries, ...barSeries],
  };
}
