<!-- 周可视化 bar：基线在左，饥浅饱和深红 -->
<template>
  <div ref="wrapRef" class="week-score-chart">
    <svg v-if="width > 0" :viewBox="`0 0 ${width} ${height}`" overflow="visible">
      <line
        v-for="i in gridTicks"
        :key="`g-${i}`"
        :x1="(i * width) / 10"
        :x2="(i * width) / 10"
        y1="0"
        :y2="height"
        class="week-score-chart__grid"
      />
      <g v-for="s in drawn" :key="s.kind">
        <rect
          v-for="(b, i) in s.bars"
          :key="`${s.kind}-${i}`"
          :x="0"
          :y="b.y"
          :width="b.w"
          :height="BAR_H"
          :fill="s.fill === 'solid' ? s.color : 'none'"
          :stroke="s.fill === 'empty' ? s.color : 'none'"
        />
      </g>
      <g v-for="line in scoreLines" :key="`line-${line.kind}`">
        <polyline
          v-if="line.path"
          :points="line.path"
          fill="none"
          stroke="var(--color-text-primary)"
          stroke-width="0.8"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle v-for="(p, i) in line.dots" :key="i" :cx="p.x" :cy="p.y" :r="dotR" :fill="line.color" />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useDevice } from "@/composables/platform/useDevice";
import type { LifePointMark, LifeSleepRange } from "@/services/timetable/lifeRecordOverlays";
import { collectWeekScoreSeries, placeWeekScoreBars, scoreBarWidth, WEEK_SCORE_BAR_H } from "@/services/timetable/weekScoreChart";

const { isMobile } = useDevice();
const gridTicks = computed(() => (isMobile.value ? [5] : [2, 4, 6, 8]));
const dotR = computed(() => (isMobile.value ? 3.6 : 5.2));

const BAR_H = WEEK_SCORE_BAR_H;

const props = defineProps<{
  points: LifePointMark[];
  sleeps?: LifeSleepRange[];
  height: number;
  dayStartTs: number;
  getHourTickTop: (hour: number) => number;
}>();

const wrapRef = ref<HTMLElement | null>(null);
const width = ref(0);
let ro: ResizeObserver | null = null;

onMounted(() => {
  const el = wrapRef.value;
  const measure = () => {
    width.value = el?.clientWidth ?? 0;
  };
  measure();
  if (el && typeof ResizeObserver !== "undefined") {
    ro = new ResizeObserver(measure);
    ro.observe(el);
  }
});

onUnmounted(() => {
  ro?.disconnect();
  ro = null;
});

const DAY_MS = 24 * 60 * 60 * 1000;

function hourOffset(ts: number): number {
  if (ts >= props.dayStartTs + DAY_MS) return 24;
  if (ts <= props.dayStartTs) return 0;
  const d = new Date(ts);
  return d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
}

const seriesAll = computed(() => collectWeekScoreSeries(props.points, props.sleeps ?? []));

const drawn = computed(() => {
  const w = width.value;
  if (w <= 0) return [];
  const placed = placeWeekScoreBars(seriesAll.value, (time) => props.getHourTickTop(hourOffset(time)), BAR_H, undefined, props.height);
  const byKind = new Map<string, { kind: string; color: string; fill: "empty" | "solid"; bars: { w: number; y: number }[] }>();
  for (const b of placed) {
    const row = byKind.get(b.kind) ?? { kind: b.kind, color: b.color, fill: b.fill, bars: [] };
    row.bars.push({ w: Math.max(scoreBarWidth(b.value, w), 2), y: b.y });
    byKind.set(b.kind, row);
  }
  return [...byKind.values()];
});

const scoreLines = computed(() => {
  const w = width.value;
  if (w <= 0) return [];
  return seriesAll.value
    .filter((s) => s.shape === "line")
    .map((s) => {
      const dots = s.points.map((p) => ({
        x: scoreBarWidth(p.value, w),
        y: props.getHourTickTop(hourOffset(p.time)),
      }));
      return {
        kind: s.kind,
        color: s.color,
        dots,
        path: dots.length >= 2 ? dots.map((d) => `${d.x},${d.y}`).join(" ") : "",
      };
    });
});
</script>

<style scoped>
.week-score-chart {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
  overflow: visible;
}
.week-score-chart svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.week-score-chart__grid {
  stroke: var(--color-text-secondary);
  stroke-opacity: 0.12;
  stroke-width: 1;
}
</style>
