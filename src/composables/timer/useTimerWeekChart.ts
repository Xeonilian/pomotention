import { shallowRef, watch, onMounted, onUnmounted, nextTick, type Ref, type ComputedRef, unref } from "vue";
import * as echarts from "echarts/core";
import { LineChart, BarChart } from "echarts/charts";
import { TooltipComponent, GridComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import type { ECharts } from "echarts/core";
import type { TimerSessionEmojis, TimerSessionStatsInclude } from "@/core/types/TimerSession";
import type { TimerWeekDayRow } from "@/services/timer/timerWeekUtils";
import { buildTimerWeekChartOption } from "@/services/timer/timerWeekChartOption";
import { useTagStore } from "@/stores/useTagStore";

echarts.use([LineChart, BarChart, TooltipComponent, GridComponent, CanvasRenderer]);

type WeekDaysSource = TimerWeekDayRow[] | Ref<TimerWeekDayRow[]> | ComputedRef<TimerWeekDayRow[]>;
type EmojisSource = TimerSessionEmojis | Ref<TimerSessionEmojis> | ComputedRef<TimerSessionEmojis>;
type StatsIncludeSource =
  | TimerSessionStatsInclude
  | Ref<TimerSessionStatsInclude>
  | ComputedRef<TimerSessionStatsInclude>;

export function useTimerWeekChart(
  chartRef: Ref<HTMLElement | undefined>,
  weekDays: WeekDaysSource,
  emojis: EmojisSource,
  statsInclude: StatsIncludeSource,
  untaggedColor: Ref<string> | ComputedRef<string> | (() => string),
) {
  const chartInstance = shallowRef<ECharts>();
  const tagStore = useTagStore();

  function render() {
    if (!chartInstance.value) return;
    const days = unref(weekDays);
    const emojiRules = unref(emojis);
    const include = unref(statsInclude);
    const untagged = typeof untaggedColor === "function" ? untaggedColor() : unref(untaggedColor);
    chartInstance.value.setOption(
      buildTimerWeekChartOption(days, emojiRules, include, (id) => tagStore.getTag(id), untagged),
      { notMerge: true },
    );
  }

  function resize() {
    chartInstance.value?.resize();
  }

  function init() {
    if (!chartRef.value) return;
    chartInstance.value?.dispose();
    chartInstance.value = echarts.init(chartRef.value);
    render();
    void nextTick(resize);
    if (!resizeObserver) {
      resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(chartRef.value);
    }
  }

  let resizeObserver: ResizeObserver | undefined;

  onMounted(() => {
    init();
    window.addEventListener("resize", resize);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", resize);
    resizeObserver?.disconnect();
    resizeObserver = undefined;
    chartInstance.value?.dispose();
    chartInstance.value = undefined;
  });

  watch(
    [
      () => unref(weekDays),
      () => unref(emojis),
      () => unref(statsInclude),
      () => (typeof untaggedColor === "function" ? untaggedColor() : unref(untaggedColor)),
    ],
    render,
    { deep: true },
  );

  watch(chartRef, (el) => {
    if (el) init();
  });

  return { resize };
}
