import type { ComposeOption } from "echarts/core";
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import type { GridComponentOption, LegendComponentOption, TooltipComponentOption, YAXisComponentOption } from "echarts/components";
import type { TimerSessionEmojis } from "@/core/types/TimerSession";
import type { TimerWeekDayRow } from "@/services/timer/timerWeekUtils";

type ChartOption = ComposeOption<
  LineSeriesOption | BarSeriesOption | TooltipComponentOption | LegendComponentOption | GridComponentOption | YAXisComponentOption
>;

/** 工作：越长越深红；休息：越长越深蓝 */
const WORK_LINE_COLORS = {
  workVoid: "#868e96",
  workBelow: "#ffc9c9",
  workTier1: "#ff8787",
  workTier2: "#f03e3e",
  workTier3: "#c92a2a",
} as const;

const BREAK_LINE_COLORS = {
  breakShort: "#d0ebff",
  breakTier1: "#74c0fc",
  breakTier2: "#1864ab",
} as const;

const WORK_MINUTES_FILL = "rgba(255, 182, 193, 0.52)";
const BREAK_MINUTES_FILL = "rgba(173, 216, 230, 0.48)";

type TierLineDef = {
  key: keyof typeof WORK_LINE_COLORS | keyof typeof BREAK_LINE_COLORS;
  emoji: string;
  color: string;
  counts: number[];
};

function buildTierLines(weekDays: TimerWeekDayRow[], emojis: TimerSessionEmojis): TierLineDef[] {
  const pick = (fn: (t: TimerWeekDayRow["totals"]) => number) => weekDays.map((d) => fn(d.totals));

  return [
    { key: "workVoid", emoji: emojis.workVoid, color: WORK_LINE_COLORS.workVoid, counts: pick((t) => t.voidCount) },
    { key: "workBelow", emoji: emojis.workBelow, color: WORK_LINE_COLORS.workBelow, counts: pick((t) => t.workBelow) },
    { key: "workTier1", emoji: emojis.workTier1, color: WORK_LINE_COLORS.workTier1, counts: pick((t) => t.workTier1) },
    { key: "workTier2", emoji: emojis.workTier2, color: WORK_LINE_COLORS.workTier2, counts: pick((t) => t.workTier2) },
    { key: "workTier3", emoji: emojis.workTier3, color: WORK_LINE_COLORS.workTier3, counts: pick((t) => t.workTier3) },
    { key: "breakShort", emoji: emojis.breakShort, color: BREAK_LINE_COLORS.breakShort, counts: pick((t) => t.breakShort) },
    { key: "breakTier1", emoji: emojis.breakTier1, color: BREAK_LINE_COLORS.breakTier1, counts: pick((t) => t.breakTier1) },
    { key: "breakTier2", emoji: emojis.breakTier2, color: BREAK_LINE_COLORS.breakTier2, counts: pick((t) => t.breakTier2) },
  ];
}

export function buildTimerWeekChartOption(weekDays: TimerWeekDayRow[], emojis: TimerSessionEmojis): ChartOption {
  const xLabels = weekDays.map((d) => d.label);
  const tierLines = buildTierLines(weekDays, emojis);
  const breakMinutes = weekDays.map((d) => d.totals.breakMinutes);
  const workMinutes = weekDays.map((d) => d.totals.workMinutes);

  const lineSeries: LineSeriesOption[] = tierLines.map((tier) => ({
    name: tier.emoji,
    type: "line",
    yAxisIndex: 0,
    data: tier.counts,
    showSymbol: true,
    symbolSize: 5,
    lineStyle: { width: 1.5, color: tier.color },
    itemStyle: { color: tier.color },
    emphasis: { focus: "series" },
  }));

  const barSeries: BarSeriesOption[] = [
    {
      name: "休息（分）",
      type: "bar",
      yAxisIndex: 1,
      stack: "minutes",
      data: breakMinutes,
      barMaxWidth: 14,
      itemStyle: { color: BREAK_MINUTES_FILL, borderRadius: [0, 0, 2, 2] },
    },
    {
      name: "工作（分）",
      type: "bar",
      yAxisIndex: 1,
      stack: "minutes",
      data: workMinutes,
      barMaxWidth: 14,
      itemStyle: { color: WORK_MINUTES_FILL, borderRadius: [2, 2, 0, 0] },
    },
  ];

  return {
    animation: false,
    grid: { left: 28, right: 30, top: 8, bottom: 52 },
    tooltip: {
      trigger: "axis",
      confine: true,
      textStyle: { fontSize: 11 },
    },
    legend: {
      type: "scroll",
      bottom: 0,
      left: 0,
      right: 0,
      itemWidth: 12,
      itemHeight: 8,
      textStyle: { fontSize: 10 },
      pageIconSize: 10,
      pageTextStyle: { fontSize: 10 },
    },
    xAxis: {
      type: "category",
      data: xLabels,
      axisLabel: { fontSize: 10 },
      axisTick: { alignWithLabel: true },
    },
    yAxis: [
      {
        type: "value",
        name: "次数",
        nameTextStyle: { fontSize: 9, padding: [0, 0, 0, 0] },
        position: "left",
        minInterval: 1,
        splitNumber: 3,
        axisLabel: { fontSize: 9 },
      },
      {
        type: "value",
        name: "分钟",
        nameTextStyle: { fontSize: 9 },
        position: "right",
        splitNumber: 3,
        axisLabel: { fontSize: 9 },
      },
    ],
    series: [...lineSeries, ...barSeries],
  };
}
