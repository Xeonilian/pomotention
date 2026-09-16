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
        @date-select="handleDateSelect"
        @date-select-day-view="handleDateSelectDayView"
        @item-change="handleItemSelect"
      />
    </div>
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
  }>(),
  { hideScheduleBlocks: false, drinkLayer: false },
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
