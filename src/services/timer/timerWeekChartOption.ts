import type { ComposeOption } from "echarts/core";
import type { BarSeriesOption, LineSeriesOption } from "echarts/charts";
import type { GridComponentOption, TooltipComponentOption } from "echarts/components";
import type { Tag } from "@/core/types/Tag";
import type { TimerSessionEmojis } from "@/core/types/TimerSession";
import type { TimerWeekDayRow } from "@/services/timer/timerWeekUtils";
import { buildTimerWeekTagStacks, type TimerWeekTagStackSeries } from "@/services/timer/timerWeekTagStats";

type ChartOption = ComposeOption<LineSeriesOption | BarSeriesOption | TooltipComponentOption | GridComponentOption>;

const TAG_AXIS_MAX = 8;
const TOMATO_AXIS_MIN = 4;
const BAR_MAX_WIDTH = 16;
const TOOLTIP_WIDTH_PX = 108;
const TOOLTIP_GRID_STYLE =
  "display:grid;grid-template-columns:1fr 1fr;column-gap:8px;row-gap:2px;align-items:center;font-variant-numeric:tabular-nums;";
const TOOLTIP_TOMATO_STYLE = "display:flex;align-items:center;gap:6px;margin-top:2px;font-variant-numeric:tabular-nums;";

const HIDDEN_AXIS = {
  show: false,
} as const;

function formatHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

function readCssColor(varName: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || fallback;
}

function formatTooltipContent(
  dayLabel: string,
  tomatoEmoji: string,
  tomatoCount: number,
  tagEntries: Array<{ name: string; minutes: number }>,
): string {
  const tomatoBlock =
    `<div style="${TOOLTIP_TOMATO_STYLE}">` +
    `<span style="font-size:14px;line-height:1;">${tomatoEmoji}</span>` +
    `<span>${tomatoCount}</span>` +
    `</div>`;

  const tagCells = tagEntries
    .filter((t) => t.minutes > 0)
    .map((t) => `<span>${t.name}</span><span style="white-space:nowrap;">${formatHours(t.minutes)} h</span>`);
  const tagBlock = tagCells.length ? `<div style="${TOOLTIP_GRID_STYLE}margin-top:6px;">${tagCells.join("")}</div>` : "";

  return (
    `<div style="display:flex;flex-direction:column;gap:4px;line-height:1.3;margin:0;">` +
    `<strong>${dayLabel}</strong>` +
    tomatoBlock +
    tagBlock +
    `</div>`
  );
}

function buildTagBarSeries(tagStacks: TimerWeekTagStackSeries[]): BarSeriesOption[] {
  return tagStacks.map((stack, index) => ({
    name: stack.name,
    type: "bar",
    yAxisIndex: 0,
    z: 1,
    stack: "tag_pct",
    data: stack.scaledValues,
    barMaxWidth: BAR_MAX_WIDTH,
    itemStyle: {
      color: stack.color,
      borderRadius: index === tagStacks.length - 1 ? [2, 2, 0, 0] : 0,
    },
    silent: true,
    tooltip: { show: false },
  }));
}

function weekMaxTomatoCount(dailyTomatoCounts: number[]): number {
  let max = 0;
  for (const count of dailyTomatoCounts) {
    if (count > max) max = count;
  }
  return max;
}

export function buildTimerWeekChartOption(
  weekDays: TimerWeekDayRow[],
  emojis: TimerSessionEmojis,
  dailyTomatoCounts: number[],
  getTag: (id: number) => Tag | undefined,
  untaggedColor: string,
): ChartOption {
  const xLabels = weekDays.map((d) => d.label);
  const tagStacks = buildTimerWeekTagStacks(weekDays, getTag, TAG_AXIS_MAX, untaggedColor);
  const barSeries = buildTagBarSeries(tagStacks);
  const tomatoAxisMax = Math.max(TOMATO_AXIS_MIN, weekMaxTomatoCount(dailyTomatoCounts));
  const tomatoEmoji = emojis.workTier2;
  const tomatoLineColor = readCssColor("--color-red", "rgb(214, 72, 100)");

  const tomatoLineSeries: LineSeriesOption = {
    name: "tomato",
    type: "line",
    yAxisIndex: 1,
    z: 3,
    data: dailyTomatoCounts,
    showSymbol: true,
    symbol: "circle",
    symbolSize: 7,
    lineStyle: { width: 1.5, color: tomatoLineColor },
    itemStyle: {
      color: tomatoLineColor,
      borderWidth: 0,
    },
    emphasis: { focus: "series" },
  };

  return {
    animation: false,
    grid: { left: 0, right: 0, top: 8, bottom: 28, containLabel: false },
    tooltip: {
      trigger: "axis",
      confine: true,
      renderMode: "html",
      backgroundColor: "#ffffff",
      borderColor: "#efefef",
      borderWidth: 1,
      extraCssText:
        `width:${TOOLTIP_WIDTH_PX}px;min-width:${TOOLTIP_WIDTH_PX}px;max-width:${TOOLTIP_WIDTH_PX}px;` +
        "white-space:normal;box-sizing:border-box;" +
        "font-family:ui-monospace,\"Cascadia Code\",Consolas,monospace;" +
        "background:#ffffff!important;color:#333639!important;box-shadow:0 2px 8px rgba(0,0,0,0.12);",
      textStyle: { fontSize: 11, color: "#333639", fontFamily: 'ui-monospace, "Cascadia Code", Consolas, monospace' },
      formatter(params: unknown) {
        const items = (Array.isArray(params) ? params : [params]) as Array<{ dataIndex?: number }>;
        const idx = items[0]?.dataIndex;
        if (idx == null || typeof idx !== "number") return "";
        const day = weekDays[idx];
        if (!day) return "";

        const tagEntries = tagStacks.map((s) => ({
          name: s.name,
          minutes: s.minutesPerDay[idx] ?? 0,
        }));

        return formatTooltipContent(day.label, tomatoEmoji, dailyTomatoCounts[idx] ?? 0, tagEntries);
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
    yAxis: [
      {
        type: "value",
        min: 0,
        max: TAG_AXIS_MAX,
        minInterval: 1,
        ...HIDDEN_AXIS,
      },
      {
        type: "value",
        min: 0,
        max: tomatoAxisMax,
        minInterval: 1,
        ...HIDDEN_AXIS,
      },
    ],
    series: [...barSeries, tomatoLineSeries],
  };
}
