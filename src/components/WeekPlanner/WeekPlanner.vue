<!-- src/views/Home/WeekPlanner/WeekPlanner.vue -->
<template>
  <div class="week-planner">
    <div class="grid">
      <WeekDayCard
        v-for="day in days"
        :key="day.index"
        :day="day"
        :day-names="dayNames"
        :time-grid-height="timeGridHeight"
        :hour-stamps="hourStamps"
        :layouted-week-blocks="layoutedWeekBlocks"
        :MAX_PER_DAY="MAX_PER_DAY"
        :get-hour-tick-top="getHourTickTop"
        :get-week-block-style="getWeekBlockStyle"
        @date-change="handleDateSelect"
        @date-jump="handleDateJump"
        @item-change="handleItemSelect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import WeekDayCard from "./WeekDayCard.vue";
import { useWeekData } from "@/composables/useWeekData";
import { useWeekBlock } from "@/composables/useWeekBlock";

// 1. 依赖注入

// 2. 组合式函数调用
const { days, MAX_PER_DAY } = useWeekData();
const { layoutedWeekBlocks, hourStamps, timeGridHeight, getWeekBlockStyle, getHourTickTop } = useWeekBlock(days);

// 3. 常量定义
const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

// 4. 事件派发
const emit = defineEmits<{
  "date-change": [timestamp: number];
  "date-jump": [timestamp: number];
  "item-change": [id: number, activityId?: number, taskId?: number];
}>();

// 5. 事件处理
const handleDateSelect = (ts: number) => {
  emit("date-change", ts);
};

const handleDateJump = (ts: number) => {
  emit("date-jump", ts);
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
}

.grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}
</style>
