<!-- src/views/Home/WeekPlanner/WeekPlanner.vue -->
<template>
  <div class="week-planner" :class="{ 'week-planner--life-layer': hideScheduleBlocks }">
    <div class="grid" ref="gridRef">
      <WeekDayCard
        v-for="day in days"
        :key="day.index"
        :day="day"
        :day-names="dayNames"
        :time-grid-height="timeGridHeight"
        :hour-stamps="hourStamps"
        :layouted-week-blocks="layoutedWeekBlocks"
        :life-overlay="lifeOverlaysByDay.get(day.index)"
        :MAX_PER_DAY="MAX_PER_DAY"
        :get-hour-tick-top="getHourTickTop"
        :get-item-block-style="getItemBlockStyle"
        :get-life-sleep-band-style="getLifeSleepBandStyle"
        :get-life-point-style="getLifePointStyle"
        :hide-schedule-blocks="hideScheduleBlocks"
        :drink-layer="drinkLayer"
        :life-view="lifeView"
        @date-select="handleDateSelect"
        @date-select-day-view="handleDateSelectDayView"
        @item-change="handleItemSelect"
        @open-day-sheet="handleOpenDaySheet"
        @life-note-tap="onLifeNoteTap"
      />
    </div>
    <Teleport to="body">
      <div
        v-if="mobileLifeNote"
        class="wl-panel"
        :class="{ 'wl-panel--below': mobileLifeNote.placement === 'below' }"
        :style="mobileLifeNote.placement === 'below' ? { top: `${mobileLifeNote.edge}px` } : { bottom: `${mobileLifeNote.edge}px` }"
        @click.stop
      >
        <p class="wl-note">{{ mobileLifeNote.text }}</p>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import WeekDayCard from "./WeekDayCard.vue";
import { useWeekData } from "@/composables/planner/useWeekData";
import { useWeekBlock } from "@/composables/planner/useWeekBlock";

withDefaults(
  defineProps<{
    /** 任一生活图层开着 → 藏普通时间块 */
    hideScheduleBlocks?: boolean;
    /** 喝水图层 */
    drinkLayer?: boolean;
    /** 生活可视化开着：大格子点击进整合 sheet */
    lifeView?: boolean;
  }>(),
  { hideScheduleBlocks: false, drinkLayer: false, lifeView: false },
);

const gridRef = ref<HTMLDivElement | null>(null);
const targetHeight = ref(400);

const calcGridHeight = () => {
  if (gridRef.value) {
    const cardPadding = 24;
    const headerHeight = 32;
    const availableHeight = gridRef.value.clientHeight - cardPadding - headerHeight;
    targetHeight.value = Math.max(availableHeight, 200);
  }
};

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  document.addEventListener("click", onDocClickCapture, true);
  nextTick(() => {
    calcGridHeight();
    window.addEventListener("resize", calcGridHeight);
    if (gridRef.value) {
      resizeObserver = new ResizeObserver(() => {
        calcGridHeight();
      });
      resizeObserver.observe(gridRef.value);
    }
  });
});

onUnmounted(() => {
  closeMobileLifeNote();
  document.removeEventListener("click", onDocClickCapture, true);
  window.removeEventListener("resize", calcGridHeight);
  if (resizeObserver && gridRef.value) {
    resizeObserver.unobserve(gridRef.value);
    resizeObserver.disconnect();
  }
});

const { days, MAX_PER_DAY } = useWeekData();
const { layoutedWeekBlocks, hourStamps, timeGridHeight, getItemBlockStyle, getHourTickTop, lifeOverlaysByDay, getLifeSleepBandStyle, getLifePointStyle } =
  useWeekBlock(days, targetHeight);

const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const emit = defineEmits<{
  "date-select": [timestamp: number];
  "date-select-day-view": [timestamp: number];
  "item-change": [id: number, activityId?: number, taskId?: number];
  "open-day-sheet": [dayStart: number];
}>();

const handleDateSelect = (ts: number) => {
  emit("date-select", ts);
};
const handleDateSelectDayView = (ts: number) => {
  emit("date-select-day-view", ts);
};
const handleItemSelect = (id: number, activityId?: number, taskId?: number) => {
  emit("item-change", id, activityId, taskId);
};
const handleOpenDaySheet = (dayStart: number) => {
  closeMobileLifeNote();
  emit("open-day-sheet", dayStart);
};

type MobileLifeNote = { key: string; text: string; placement: "above" | "below"; edge: number };
const mobileLifeNote = ref<MobileLifeNote | null>(null);
const LIFE_NOTE_FLIP_TOP = 96;
const LIFE_NOTE_PANEL_GAP = 6;

function closeMobileLifeNote() {
  mobileLifeNote.value = null;
}

function onLifeNoteTap(payload: { key: string; text: string; top: number; bottom: number }) {
  if (mobileLifeNote.value?.key === payload.key) {
    closeMobileLifeNote();
    return;
  }
  const placement = payload.top < LIFE_NOTE_FLIP_TOP ? "below" : "above";
  const edge =
    placement === "below" ? payload.bottom + LIFE_NOTE_PANEL_GAP : window.innerHeight - payload.top + LIFE_NOTE_PANEL_GAP;
  mobileLifeNote.value = { key: payload.key, text: payload.text, placement, edge };
}

function onDocClickCapture(e: Event) {
  if (!mobileLifeNote.value) return;
  const el = e.target as HTMLElement | null;
  if (!el) return;
  if (el.closest(".wl-panel")) return;
  if (el.closest("[data-life-note-key]")) return;
  closeMobileLifeNote();
}
</script>

<style scoped>
.week-planner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  overflow: hidden;
}

.grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
  grid-auto-rows: minmax(100px, 1fr);

  scrollbar-width: thin;
}

@media (max-width: 430px) {
  .grid {
    gap: 1px;
  }
}
</style>

<style>
/* 手机生活备注：水平贴屏幕，垂直跟着图标（与 Task 时间轴同策略） */
.wl-panel {
  position: fixed;
  left: 12px;
  right: 12px;
  z-index: 10001;
  box-sizing: border-box;
  padding: 8px 12px;
  border-radius: 6px;
  background: var(--color-bg-base, #fff);
  color: var(--color-text-primary, #333);
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.16);
}

.wl-note {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  max-width: 100%;
  box-sizing: border-box;
}
</style>
