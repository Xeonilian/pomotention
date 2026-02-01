<!-- src/components/WeekPlanner/WeekDayCard.vue -->
<template>
  <n-card
    size="small"
    class="day-card"
    :class="[{ 'day-card--selected': selectedDate === day.startTs }]"
    @click="() => handleDateSelect(day.startTs)"
  >
    <div class="day-header">
      <div class="dow">
        {{ dayNames[day.index] }}
      </div>
      <div class="date" :class="{ today: day.isToday }" @click="() => handleDateSelectDayView(day.startTs)">
        {{ formatMonthDay(day.startTs) }}
      </div>
    </div>

    <div class="items">
      <!-- 时间轴网格容器（始终显示） -->
      <div class="time-grid-container" :style="{ height: timeGridHeight + 'px' }">
        <!-- 小时刻度线（始终显示） -->
        <div class="hour-ticks">
          <div v-for="(hour, hourIdx) in hourStamps" :key="hour" class="hour-tick" :style="{ top: getHourTickTop(hour) + 'px' }">
            <div class="tick-line"></div>
            <span v-if="hourIdx !== hourStamps.length - 1" class="hour-label">
              {{ hour.toString().padStart(2, "0") }}
            </span>
          </div>
        </div>

        <!-- 时间块（仅在有数据时显示） -->
        <template v-if="day.items.length > 0">
          <WeekBlockItem
            v-for="block in layoutedWeekBlocks.get(day.index) || getFallbackWeekBlocks(day.items, day.index)"
            :key="block.id"
            :block="block"
            :day-start-ts="day.startTs"
            :get-item-block-style="getItemBlockStyle"
            @item-change="handleItemChange"
          />
        </template>

        <!-- 统计信息 删除more设置-->
        <div class="card-statistic">
          <span class="pom-sum">
            [
            <span :style="{ color: getPomoColor(day.pomoRatio) }">🍅</span>
            = {{ day.sumRealPomo }} 🍇 = {{ day.sumRealGrape }}]
          </span>
        </div>
      </div>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { NCard } from "naive-ui";
import type { DayItem } from "@/core/types/Week";
import type { WeekBlockItem as WeekBlockItemType } from "@/core/types/Week";
import WeekBlockItem from "./WeekBlockItem.vue";
import { formatMonthDay, getPomoColor, getFallbackWeekBlocks } from "@/core/utils/weekDays";
import { useDataStore } from "@/stores/useDataStore";
import { storeToRefs } from "pinia";

const dataStore = useDataStore();
const { selectedDate } = storeToRefs(dataStore);
// 定义两种返回类型的联合类型
type WeekBlockStyle =
  | { display: string } // 只包含 display 的情况
  | {
      // 包含位置属性的情况
      position: string;
      top: string;
      left: string;
      width: string;
      height: string;
      zIndex: number;
    };

// 定义props
defineProps<{
  day: DayItem;
  dayNames: string[];
  timeGridHeight: number;
  hourStamps: number[];
  layoutedWeekBlocks: Map<number, WeekBlockItemType[]>;
  MAX_PER_DAY: number;
  getHourTickTop: (hour: number) => number;
  getItemBlockStyle: (block: WeekBlockItemType, dayStartTs: number) => WeekBlockStyle;
}>();

// 定义emit
const emit = defineEmits<{
  "date-select": [timestamp: number];
  "date-select-day-view": [timestamp: number];
  "item-change": [id: number, activityId?: number, taskId?: number];
}>();

// 事件处理
const handleDateSelect = (ts: number) => {
  emit("date-select", ts);
};

const handleDateSelectDayView = (ts: number) => {
  emit("date-select-day-view", ts);
};

const handleItemChange = (id: number, _ts: number, activityId?: number, taskId?: number) => {
  // emit("date-select", ts);
  emit("item-change", id, activityId, taskId);
};
</script>

<style scoped>
.day-card--selected {
  border-color: var(--primary-color, #409eff) !important;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.day-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  z-index: 10;
}
.day-card :deep(.n-card__content) {
  padding: 6px 6px;
}
.day-header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  margin-bottom: 6px;
  white-space: nowrap;
  width: 100%;
  flex-wrap: nowrap;
  overflow: hidden;
}

/* 调整 .dow 占满可用空间，挤压 .date 到边缘 */
.dow {
  font-weight: 600;
  white-space: nowrap;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 核心修改 .date：空间不足时自动隐藏 */
.date {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  overflow: hidden;
  width: 20px;
  height: 20px;
  font-weight: 600;
  border-radius: 50%;
  z-index: 1;
  color: var(--color-text-secondary);
  background-color: var(--primary-color, #efeded4b);
  flex-shrink: 0;
  position: relative;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.date.today {
  background-color: var(--color-blue);
  color: white;
  font-weight: 600;
  z-index: 0;
}

.date:hover {
  cursor: pointer;
  background-color: var(--color-blue-transparent);
  color: var(--color-background);
}

.items {
  position: relative;
  min-width: 0;
  flex: 1;
  min-height: 0;
}

/* 时间轴网格容器 */
.time-grid-container {
  position: relative;
  width: 100%;
}

/* 小时刻度线 */
.hour-ticks {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.hour-tick {
  position: absolute;
  left: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  padding-right: 4px;
}

.tick-line {
  height: 1px;
  width: 100%;
  background-color: var(--color-text-secondary);
  opacity: 0.2;
  margin-bottom: 2px;
}

.hour-label {
  font-size: 10px;
  line-height: 10px;
  color: var(--color-text-secondary);
  opacity: 0.6;
  font-family: "consolas", monospace;
}

.card-statistic {
  position: absolute;
  bottom: -20px;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pom-sum {
  display: block;
  margin-left: auto;
  width: max-content;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-family: "Segoe UI Symbol", "Noto Emoji", "Twemoji Mozilla", "Apple Symbols", sans-serif;
}

.empty {
  color: var(--color-text-secondary);
  font-size: 12px;
  padding: 10px 0;
  text-align: center;
}
</style>
