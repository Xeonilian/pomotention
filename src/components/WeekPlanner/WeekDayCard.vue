<!-- src/components/WeekPlanner/WeekDayCard.vue -->
<template>
  <n-card
    size="small"
    class="day-card"
    :class="[{ 'day-card--selected': selectedDate === day.startTs }, { 'day-card--drink-layer': drinkLayer }]"
    @click="() => onCardClick()"
  >
    <div class="day-header">
      <div class="dow" @click.stop="() => handleDateSelect(day.startTs)">
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
        @click.stop="() => handleDateSelectDayView(day.startTs)"
        @touchstart.stop="onWeekBadgeTouchStart"
        @touchend.stop="() => onWeekBadgeTouchEnd(day.startTs)"
        @touchcancel.stop="onWeekBadgeTouchCancel"
      >
        {{ formatMonthDay(day.startTs) }}
      </div>
    </div>

    <div class="items">
      <div class="time-grid-container" :style="{ height: timeGridHeight + 'px' }">
        <WeekDrinkWaterFill v-if="drinkLayer && drinkRatio > 0" :ratio="drinkRatio" :met="drinkMet" />

        <template v-if="!hideScheduleBlocks">
          <div
            v-for="sleep in lifeOverlay?.sleeps || []"
            :key="`life-sleep-${sleep.recordId}`"
            class="week-life-sleep"
            :style="getLifeSleepBandStyle(sleep, day.startTs)"
            :title="sleep.title"
            @click.stop="emit('item-change', sleep.todoId, undefined, sleep.taskId)"
          ></div>
        </template>

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

        <template v-if="!hideScheduleBlocks && day.items.length > 0">
          <WeekBlockItem
            v-for="block in layoutedWeekBlocks.get(day.index) || getFallbackWeekBlocks(day.items, day.index)"
            :key="block.id"
            :block="block"
            :day-start-ts="day.startTs"
            :get-item-block-style="getItemBlockStyle"
            @item-change="handleItemChange"
          />
        </template>

        <template v-if="drinkLayer">
          <div
            v-for="mark in drinkPoints"
            :key="`drink-point-${mark.recordId}`"
            class="week-life-point week-life-point--drink-layer"
            :style="getDrinkPointStyle(mark)"
            :title="mark.title"
            @click.stop="onDrinkPointClick(mark)"
          >
            <n-icon :size="isMobile ? 18 : 22" :component="LIFE_POINT_ICONS.drink" />
          </div>
        </template>
        <template v-else>
          <div
            v-for="mark in lifeOverlay?.points || []"
            :key="`life-point-${mark.kind}-${mark.recordId}`"
            class="week-life-point"
            :style="getLifePointStyle(mark, day.startTs)"
            :title="mark.title"
            @click.stop="emit('item-change', mark.todoId, undefined, mark.taskId)"
          >
            <n-icon :size="isMobile ? 14 : 16" :component="lifePointIcon(mark.kind)" />
          </div>
        </template>
      </div>

      <div v-if="drinkLayer" class="card-statistic card-statistic--drink">
        <span class="drink-sum" :class="{ 'drink-sum--met': drinkMet }">{{ drinkTotalMl }} ml</span>
      </div>
      <div v-else-if="!hideScheduleBlocks" class="card-statistic">
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
  </n-card>
</template>

<script setup lang="ts">
import { computed, inject, ref, type Component, type CSSProperties } from "vue";
import { NCard, NIcon } from "naive-ui";
import type { DayItem } from "@/core/types/Week";
import type { WeekBlockItem as WeekBlockItemType } from "@/core/types/Week";
import WeekBlockItem from "./WeekBlockItem.vue";
import WeekDrinkWaterFill from "@/components/WeekPlanner/WeekDrinkWaterFill.vue";
import { formatMonthDay, getPomoColor, getFallbackWeekBlocks } from "@/core/utils/weekDays";
import { getDateKey } from "@/core/utils";
import type { HolidayDisplay } from "@/services/planner/publicHolidays";
import { plannerHolidayMapKey } from "@/composables/planner/usePublicHolidays";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { storeToRefs } from "pinia";
import { useDevice } from "@/composables/platform/useDevice";
import { createTouchScheduledSingleAndDouble } from "@/composables/platform/useTouchScheduledSingleAndDouble";
import type { LifePointKind, LifePointMark, LifeSleepRange } from "@/services/timetable/lifeRecordOverlays";
import { Door20Filled, Drop20Filled, FoodApple20Filled } from "@vicons/fluent";
import { findLifeRecordTodoForDay, isDrinkGoalMet, sumLifeRecordAmountMl } from "@/services/lifeRecord/lifeRecordService";

const { isMobile } = useDevice();
const dataStore = useDataStore();
const settingStore = useSettingStore();
const { selectedDate, todoList, activityById, taskById, taskByActivityId } = storeToRefs(dataStore);

const holidayMap = inject(plannerHolidayMapKey, ref<Record<string, HolidayDisplay>>({}));

const LIFE_POINT_ICONS: Record<LifePointKind, Component> = {
  drink: Drop20Filled,
  eat: FoodApple20Filled,
  toilet: Door20Filled,
};

function lifePointIcon(kind: LifePointKind): Component {
  return LIFE_POINT_ICONS[kind];
}

type WeekBlockStyle =
  | { display: string }
  | {
      position: string;
      top: string;
      left: string;
      width: string;
      height: string;
      zIndex: number;
    };

const props = withDefaults(
  defineProps<{
    day: DayItem;
    dayNames: string[];
    timeGridHeight: number;
    hourStamps: number[];
    layoutedWeekBlocks: Map<number, WeekBlockItemType[]>;
    lifeOverlay?: { points: LifePointMark[]; sleeps: LifeSleepRange[] };
    MAX_PER_DAY: number;
    getHourTickTop: (hour: number) => number;
    getItemBlockStyle: (block: WeekBlockItemType, dayStartTs: number) => WeekBlockStyle;
    getLifeSleepBandStyle: (sleep: LifeSleepRange, dayStartTs: number) => CSSProperties;
    getLifePointStyle: (mark: LifePointMark, dayStartTs: number) => CSSProperties;
    hideScheduleBlocks?: boolean;
    drinkLayer?: boolean;
  }>(),
  { hideScheduleBlocks: false, drinkLayer: false },
);

const holidayForDay = computed(() => holidayMap.value[getDateKey(props.day.startTs)] ?? null);

const drinkTodo = computed(() =>
  props.drinkLayer ? findLifeRecordTodoForDay(todoList.value, activityById.value, "drink", props.day.startTs) : undefined,
);

const drinkTask = computed(() => {
  const todo = drinkTodo.value;
  if (!todo) return null;
  return (todo.taskId != null ? taskById.value.get(todo.taskId) : undefined) ?? taskByActivityId.value.get(todo.activityId!) ?? null;
});

const drinkPoints = computed(() => (props.lifeOverlay?.points ?? []).filter((p) => p.kind === "drink"));

const drinkTotalMl = computed(() => sumLifeRecordAmountMl(drinkTask.value?.lifeRecords ?? []));

const drinkRatio = computed(() => {
  if (drinkTotalMl.value <= 0) return 0;
  const goal = Math.max(drinkTask.value?.drinkGoalMl ?? settingStore.settings.drinkDailyGoalMl, 1);
  return Math.min(1, drinkTotalMl.value / goal);
});

const drinkMet = computed(() => {
  const goal = drinkTask.value?.drinkGoalMl ?? settingStore.settings.drinkDailyGoalMl;
  return isDrinkGoalMet(drinkTotalMl.value, goal);
});

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

function onCardClick() {
  handleDateSelect(props.day.startTs);
  if (!props.drinkLayer) return;
  const todo = drinkTodo.value;
  const task = drinkTask.value;
  if (todo && task?.id != null) {
    emit("item-change", todo.id, todo.activityId, task.id);
  }
}

function onDrinkPointClick(mark: LifePointMark) {
  handleDateSelect(props.day.startTs);
  emit("item-change", mark.todoId, undefined, mark.taskId);
}

/** 稳定伪随机 → 横向散落（淅沥），竖向仍由时刻决定 */
function drinkScatterUnit(mark: LifePointMark): number {
  const n = Math.sin(mark.recordId * 12.9898 + mark.time * 0.00017) * 43758.5453;
  return n - Math.floor(n);
}

function getDrinkPointStyle(mark: LifePointMark): CSSProperties {
  const base = props.getLifePointStyle(mark, props.day.startTs);
  const size = isMobile.value ? 20 : 24;
  // 落在列宽约 10%～90%
  const u = drinkScatterUnit(mark);
  const leftPct = 10 + u * 78;
  const rest = { ...base } as CSSProperties;
  delete rest.right;
  delete rest.left;
  delete rest.width;
  delete rest.height;
  return {
    ...rest,
    width: `${size}px`,
    height: `${size}px`,
    color: "var(--color-blue)",
    zIndex: 8,
    left: `calc(${leftPct.toFixed(2)}% - ${size / 2}px)`,
    right: "auto",
    transform: "translateX(0)",
  };
}

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

.dow {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-left: 2px;
  justify-self: start;
}

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
  background-color: var(--color-yellow-transparent);
  color: var(--color-blue);
}

.items {
  position: relative;
  min-width: 0;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.time-grid-container {
  position: relative;
  width: 100%;
  overflow: hidden;
}

.week-life-sleep {
  border-radius: 2px;
  pointer-events: auto;
}

.week-life-point {
  pointer-events: auto;
}

.week-life-point--drink-layer {
  opacity: 0.82;
}

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
  flex-shrink: 0;
  width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-statistic--drink {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  text-align: right;
}

.drink-sum {
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 600;
  opacity: 0.85;
}

.drink-sum--met {
  color: var(--color-blue);
  opacity: 1;
  font-weight: 600;
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

  :deep(.card-statistic) {
    transform: translateY(4px);
  }
}
</style>
