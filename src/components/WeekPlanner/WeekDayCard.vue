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
        {{ isMobile ? dayNames[day.index][0] : dayNames[day.index] }}
      </div>
      <div class="week-day-holiday-mid">
        <span v-if="holidayForDay" class="week-day-holiday" :class="'week-day-holiday--' + holidayForDay.kind" :title="holidayForDay.label">
          {{ isMobile ? holidayForDay.label.slice(0, 1) : holidayForDay.label }}
        </span>
      </div>
      <div
        class="date"
        :class="{ today: day.isToday }"
        @click.stop="() => handleDateSelect(day.startTs)"
        @dblclick.stop="() => handleDateSelectDayView(day.startTs)"
        @touchstart.stop="onWeekBadgeTouchStart"
        @touchend.stop="() => onWeekBadgeTouchEnd(day.startTs)"
        @touchcancel.stop="onWeekBadgeTouchCancel"
      >
        {{ formatMonthDay(day.startTs) }}
      </div>
    </div>

    <div class="items">
      <!-- 时间轴网格容器（始终显示） -->
      <div class="time-grid-container" :style="{ height: timeGridHeight + 'px' }">
        <!-- 小时刻度线（始终显示） -->
        <div class="hour-ticks">
          <div
            v-for="(hour, hourIdx) in hourStamps"
            :key="hour"
            class="hour-tick"
            :class="{ 'hour-tick--major': [12].includes(hour) }"
            :style="{ top: getHourTickTop(hour) + 'px' }"
          >
            <div class="tick-line" :class="{ 'tick-line--major': [6, 9, 12, 15, 18, 21].includes(hour) }"></div>
            <span
              v-if="(!isMobile && hourIdx !== hourStamps.length - 1) || (isMobile && [6, 9, 12, 15, 18, 21].includes(hour))"
              class="hour-label"
              :class="{ 'hour-label--major': [6, 9, 12, 15, 18, 21].includes(hour) }"
            >
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

        <!-- 统计信息-->
        <div class="card-statistic">
          <span class="pom-sum">
            <template v-if="isMobile">🍅 {{ day.sumRealPomo }}</template>
            <template v-else>
              [
              <span :style="{ color: getPomoColor(day.pomoRatio) }">🍅</span>
              = {{ day.sumRealPomo }} 🍇 = {{ day.sumRealGrape }}]
            </template>
          </span>
        </div>
      </div>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { NCard } from "naive-ui";
import type { DayItem } from "@/core/types/Week";
import type { WeekBlockItem as WeekBlockItemType } from "@/core/types/Week";
import WeekBlockItem from "./WeekBlockItem.vue";
import { formatMonthDay, getPomoColor, getFallbackWeekBlocks } from "@/core/utils/weekDays";
import { getDateKey } from "@/core/utils";
import type { HolidayDisplay } from "@/services/publicHolidays";
import { plannerHolidayMapKey } from "@/composables/usePublicHolidays";
import { useDataStore } from "@/stores/useDataStore";
import { storeToRefs } from "pinia";
import { useDevice } from "@/composables/useDevice";
import { createTouchScheduledSingleAndDouble } from "@/composables/useTouchScheduledSingleAndDouble";
const { isMobile } = useDevice();
const dataStore = useDataStore();
const { selectedDate } = storeToRefs(dataStore);

const holidayMap = inject(plannerHolidayMapKey, ref<Record<string, HolidayDisplay>>({}));

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

const props = defineProps<{
  day: DayItem;
  dayNames: string[];
  timeGridHeight: number;
  hourStamps: number[];
  layoutedWeekBlocks: Map<number, WeekBlockItemType[]>;
  MAX_PER_DAY: number;
  getHourTickTop: (hour: number) => number;
  getItemBlockStyle: (block: WeekBlockItemType, dayStartTs: number) => WeekBlockStyle;
}>();

const holidayForDay = computed(() => holidayMap.value[getDateKey(props.day.startTs)] ?? null);

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

const weekBadgeTouch = createTouchScheduledSingleAndDouble(
  (ts) => handleDateSelect(ts),
  (ts) => handleDateSelectDayView(ts),
);

function onWeekBadgeTouchStart(e: TouchEvent) {
  if (!isMobile.value) return;
  weekBadgeTouch.touchStart(e);
}

function onWeekBadgeTouchEnd(dayStartTs: number) {
  if (!isMobile.value) return;
  weekBadgeTouch.touchEnd(dayStartTs);
}

function onWeekBadgeTouchCancel() {
  if (!isMobile.value) return;
  weekBadgeTouch.touchCancel();
}

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
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  width: 100%;
  min-width: 0;
}

.week-day-holiday-mid {
  min-width: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.week-day-holiday {
  font-size: 10px;
  font-weight: 600;
  line-height: 1.15;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  color: var(--color-red);
}

.week-day-holiday--solar_term {
  color: var(--color-green);
}

.week-day-holiday--transfer_workday {
  color: var(--color-red);
}

/* 左侧星期 */
.dow {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 2px;
  justify-self: start;
}

/* 核心修改 .date：空间不足时自动隐藏 */
.date {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  overflow: hidden;
  width: 20px;
  height: 20px;
  font-weight: 600;
  border-radius: 50%;
  z-index: 1;
  color: var(--color-text-secondary);
  background-color: var(--color-background-light);
  flex-shrink: 0;
  position: relative;
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
  color: var(--color-blue);
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

.tick-line--major {
  background-color: var(--color-text-secondary);
}

.hour-label {
  font-size: 10px;
  line-height: 10px;
  color: var(--color-text-secondary);
  opacity: 0.6;
  font-family: "consolas", monospace;
}

.hour-label--major {
  color: var(--color-text-secondary);
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

@media (max-width: 430px) {
  .day-card :deep(.n-card__content) {
    padding: 0px !important;
  }

  .day-header {
    margin: 3px 1px 6px;
  }

  .pom-sum {
    font-size: 10px;
    transform: translateY(1px);
    padding-right: 2px;
  }

  .hour-label {
    display: none;
  }

  .hour-label.hour-label--major {
    display: inline-block;
  }
  .date {
    font-size: 12px;
    width: 18px;
    height: 18px;
    margin-right: 4px;
  }
}
</style>
