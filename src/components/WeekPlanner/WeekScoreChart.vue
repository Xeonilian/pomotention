<!-- 周可视化：饥/饱 bar + 精力/奖赏折线；趋势可点开记录 -->
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
      <g v-for="b in placedBars" :key="`bar-${b.kind}-${b.recordId}-${b.y}`">
        <rect
          class="week-score-chart__hit"
          :x="0"
          :y="b.y"
          :width="b.w"
          :height="BAR_H"
          :fill="b.fill === 'solid' ? b.color : 'none'"
          :stroke="b.fill === 'empty' ? b.color : 'none'"
          @click.stop="onBarClick($event, b)"
        />
      </g>
      <g v-for="line in scoreLines" :key="`line-${line.kind}`">
        <polyline
          v-if="line.path"
          class="week-score-chart__line"
          :points="line.path"
          fill="none"
          :stroke="line.kind === 'energy' ? 'var(--color-text-secondary)' : 'var(--color-text-primary)'"
          stroke-width="0.8"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <circle
          v-for="(p, i) in line.dots"
          :key="i"
          class="week-score-chart__hit"
          :cx="p.x"
          :cy="p.y"
          :r="dotR"
          :fill="line.color"
          @click.stop="onDotClick($event, p)"
        />
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useDevice } from "@/composables/platform/useDevice";
import type { LifePointMark, LifeSleepRange } from "@/services/timetable/lifeRecordOverlays";
import {
  collectWeekScoreSeries,
  placeWeekScoreBars,
  scoreBarWidth,
  WEEK_SCORE_BAR_H,
  type WeekScoreDot,
  type WeekScoreKind,
  type WeekScorePlacedBar,
  type WeekScoreRefKind,
} from "@/services/timetable/weekScoreChart";

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
  /** 生活图层才开点击；喝水层只看趋势 */
  interactive?: boolean;
}>();

const emit = defineEmits<{
  "score-tap": [payload: { key: string; recordId: number; refKind: WeekScoreRefKind; scoreKind: WeekScoreKind; top: number; bottom: number }];
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

const placedBars = computed(() => {
  const w = width.value;
  if (w <= 0) return [] as WeekScorePlacedBar[];
  return placeWeekScoreBars(seriesAll.value, (time) => props.getHourTickTop(hourOffset(time)), BAR_H, undefined, props.height, w);
});

type LineDot = WeekScoreDot & { x: number; y: number; scoreKind: WeekScoreKind };

const scoreLines = computed(() => {
  const w = width.value;
  if (w <= 0) return [];
  return seriesAll.value
    .filter((s) => s.shape === "line")
    .map((s) => {
      const dots: LineDot[] = s.points.map((p) => ({
        ...p,
        scoreKind: s.kind,
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

function emitTap(e: MouseEvent, key: string, recordId: number, refKind: WeekScoreRefKind, scoreKind: WeekScoreKind) {
  if (!props.interactive) return;
  const el = e.currentTarget as SVGGraphicsElement | null;
  const rect = el?.getBoundingClientRect();
  if (!rect) return;
  emit("score-tap", { key, recordId, refKind, scoreKind, top: rect.top, bottom: rect.bottom });
}

function onBarClick(e: MouseEvent, b: WeekScorePlacedBar) {
  emitTap(e, `score-${b.kind}-${b.recordId}`, b.recordId, b.refKind, b.kind);
}

function onDotClick(e: MouseEvent, p: LineDot) {
  emitTap(e, `score-${p.scoreKind}-${p.recordId}`, p.recordId, p.refKind, p.scoreKind);
}
</script>

<style scoped>
.week-score-chart {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 3;
  overflow: visible;
}
.week-score-chart svg {
  display: block;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.week-score-chart__grid {
  stroke: var(--color-text-secondary);
  stroke-opacity: 0.12;
  stroke-width: 1;
  pointer-events: none;
}

.week-score-chart__line {
  pointer-events: none;
}

.week-score-chart__hit {
  pointer-events: auto;
  cursor: pointer;
}
</style>
