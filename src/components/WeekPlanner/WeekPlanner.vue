<!-- src/views/Home/WeekPlanner/WeekPlanner.vue -->
<template>
  <div class="week-planner">
    <div class="grid" ref="gridRef">
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
        :get-item-block-style="getItemBlockStyle"
        @date-change="handleDateSelect"
        @date-jump="handleDateJump"
        @item-change="handleItemSelect"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from "vue";
import WeekDayCard from "./WeekDayCard.vue";
import { useWeekData } from "@/composables/useWeekData";
import { useWeekBlock } from "@/composables/useWeekBlock";

// 1. 获取grid容器ref，用于计算实际高度
const gridRef = ref<HTMLDivElement | null>(null);
const targetHeight = ref(400); // 默认高度，后续会动态更新

// 计算grid容器的实际高度（考虑card的padding和header高度）
const calcGridHeight = () => {
  if (gridRef.value) {
    // 获取grid容器的可用高度
    // 减去day-card的padding (24px) 和 header高度 (约32px)
    const cardPadding = 24; // 上padding 6px + 下padding 6px
    const headerHeight = 32; // day-header的高度
    const availableHeight = gridRef.value.clientHeight - cardPadding - headerHeight;
    targetHeight.value = Math.max(availableHeight, 200); // 最小高度200px
  }
};

// 使用 ResizeObserver 监听容器高度变化
let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  // 初始计算
  nextTick(() => {
    calcGridHeight();

    // 监听窗口大小变化
    window.addEventListener("resize", calcGridHeight);

    // 使用 ResizeObserver 监听容器自身的大小变化
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

// 2. 组合式函数调用（传递响应式的targetHeight ref）
const { days, MAX_PER_DAY } = useWeekData();
const { layoutedWeekBlocks, hourStamps, timeGridHeight, getItemBlockStyle, getHourTickTop } = useWeekBlock(days, targetHeight);

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
  grid-auto-rows: minmax(100px, 1fr);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
}
</style>
