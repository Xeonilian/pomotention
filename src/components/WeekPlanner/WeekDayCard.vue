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
        @click.stop="onDateBadgeMouseClick"
        @dblclick.stop="onDateBadgeDblClick"
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
        <WeekScoreChart
          v-if="drinkLayer || lifeView"
          :points="lifeOverlay?.points || []"
          :sleeps="lifeOverlay?.sleeps || []"
          :height="timeGridHeight"
          :day-start-ts="day.startTs"
          :get-hour-tick-top="getHourTickTop"
        />

        <!-- 生活图层会藏 schedule，但 sleep 色带仍画；月亮钉在醒来那一行 -->
        <div
          v-for="sleep in lifeOverlay?.sleeps || []"
          :key="`life-sleep-${sleep.recordId}`"
          class="week-life-sleep"
          :style="sleepBandStyle(sleep)"
        >
          <div
            v-if="!isVizLayer() && sleep.wakeAt"
            class="week-life-sleep-moon"
            :style="{ width: pointIconSize + 'px', height: pointIconSize + 'px' }"
          >
            <NPopover
              v-if="!isMobile"
              trigger="hover"
              placement="top"
              to="body"
              :show-arrow="true"
              :style="lifeNotePopoverStyle"
              :content-style="lifeNoteContentStyle"
            >
              <template #trigger>
                <div class="week-life-point__hit" @click.stop>
                  <n-icon :size="pointIconSize" :component="WeatherMoon20Filled" />
                </div>
              </template>
              <p class="week-life-note">{{ formatLifeSleepCaption(sleep) }}</p>
            </NPopover>
            <div
              v-else-if="isMobile"
              class="week-life-point__hit"
              :data-life-note-key="`sleep-${sleep.recordId}`"
              @click.stop="onMobileLifeNoteTap($event, `sleep-${sleep.recordId}`, formatLifeSleepCaption(sleep))"
            >
              <n-icon :size="pointIconSize" :component="WeatherMoon20Filled" />
            </div>
            <div v-else class="week-life-point__hit" @click.stop="onSleepBandClick(sleep)">
              <n-icon :size="pointIconSize" :component="WeatherMoon20Filled" />
            </div>
          </div>
        </div>

        <template v-if="lifeView">
          <div
            v-for="mark in activityBands"
            :key="`life-act-${mark.recordId}`"
            class="week-life-activity"
            :style="activityBandStyle(mark)"
          />
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

        <div
          v-for="mark in visibleLifePoints"
          :key="`life-point-${mark.kind}-${mark.recordId}`"
          class="week-life-point"
          :class="{ 'week-life-point--drink-layer': drinkLayer }"
          :style="drinkLayer ? getLayerPointStyle(mark) : getLifePointStyle(mark, day.startTs)"
        >
          <NPopover
            v-if="!isMobile"
            trigger="hover"
            placement="top"
            to="body"
            :show-arrow="true"
            :style="lifeNotePopoverStyle"
            :content-style="lifeNoteContentStyle"
          >
            <template #trigger>
              <div class="week-life-point__hit" @click.stop>
                <span v-if="isScoreMark(mark)" class="week-life-energy" :style="{ fontSize: pointIconSize + 'px' }">
                  {{ scoreEmoji(mark) }}
                </span>
                <n-icon v-else :size="pointIconSize" :component="lifePointIcon(mark.kind)" />
              </div>
            </template>
            <p class="week-life-note">{{ formatLifePointCaption(mark) }}</p>
          </NPopover>
          <div
            v-else-if="isMobile"
            class="week-life-point__hit"
            :data-life-note-key="`point-${mark.kind}-${mark.recordId}`"
            @click.stop="onMobileLifeNoteTap($event, `point-${mark.kind}-${mark.recordId}`, formatLifePointCaption(mark))"
          >
            <span v-if="isScoreMark(mark)" class="week-life-energy" :style="{ fontSize: pointIconSize + 'px' }">
              {{ scoreEmoji(mark) }}
            </span>
            <n-icon v-else :size="pointIconSize" :component="lifePointIcon(mark.kind)" />
          </div>
          <div v-else class="week-life-point__hit" @click.stop="onLifePointClick(mark)">
            <span v-if="isScoreMark(mark)" class="week-life-energy" :style="{ fontSize: pointIconSize + 'px' }">
              {{ scoreEmoji(mark) }}
            </span>
            <n-icon v-else :size="pointIconSize" :component="lifePointIcon(mark.kind)" />
          </div>
        </div>
      </div>

      <div v-if="drinkLayer" class="card-statistic card-statistic--drink">
        <span class="drink-sum" :class="{ 'drink-sum--met': drinkMet }" :title="`${drinkTotalMl} ml`">{{ drinkSumLabel }}</span>
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
import { NCard, NIcon, NPopover } from "naive-ui";
import type { DayItem } from "@/core/types/Week";
import type { WeekBlockItem as WeekBlockItemType } from "@/core/types/Week";
import WeekBlockItem from "./WeekBlockItem.vue";
import WeekDrinkWaterFill from "@/components/WeekPlanner/WeekDrinkWaterFill.vue";
import WeekScoreChart from "@/components/WeekPlanner/WeekScoreChart.vue";
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
import { formatLifePointCaption, formatLifeSleepCaption } from "@/services/timetable/lifeRecordOverlays";
import { getEnergyScoreEmoji, getRewardScoreEmoji } from "@/core/scoreEmojis";
import { Door20Filled, Drop20Filled, FoodApple20Filled, WeatherMoon20Filled } from "@vicons/fluent";
import type { DrinkKind } from "@/core/types/Task";
import { findLifeRecordTaskForDay, isDrinkGoalMet, sumLifeRecordAmountMl } from "@/services/lifeRecord/lifeRecordService";
import { collectWeekScoreSeries } from "@/services/timetable/weekScoreChart";

const { isMobile } = useDevice();
const dataStore = useDataStore();
const settingStore = useSettingStore();
const { selectedDate, activityById, taskList } = storeToRefs(dataStore);

const holidayMap = inject(plannerHolidayMapKey, ref<Record<string, HolidayDisplay>>({}));

const LIFE_POINT_ICONS: Record<Exclude<LifePointKind, "energy" | "reward">, Component> = {
  drink: Drop20Filled,
  eat: FoodApple20Filled,
  toilet: Door20Filled,
};

function lifePointIcon(kind: LifePointKind): Component {
  if (kind === "energy" || kind === "reward") return Drop20Filled;
  return LIFE_POINT_ICONS[kind];
}
function isScoreMark(mark: LifePointMark): boolean {
  return mark.kind === "energy" || mark.kind === "reward";
}
function scoreEmoji(mark: LifePointMark): string {
  if (mark.kind === "reward") return getRewardScoreEmoji(mark.reward ?? 1);
  return getEnergyScoreEmoji(mark.energy ?? 1);
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
    /** 生活可视化：日期 badge 进 sheet；格子只选中 */
    lifeView?: boolean;
  }>(),
  { hideScheduleBlocks: false, drinkLayer: false, lifeView: false },
);

const holidayForDay = computed(() => holidayMap.value[getDateKey(props.day.startTs)] ?? null);

const drinkTask = computed(() =>
  props.drinkLayer ? (findLifeRecordTaskForDay(taskList.value, "drink", props.day.startTs, activityById.value) ?? null) : null,
);

const drinkTotalMl = computed(() => sumLifeRecordAmountMl(drinkTask.value?.lifeRecords ?? []));
/** 手机周列窄：用升一位小数，桌面仍 ml */
const drinkSumLabel = computed(() => (isMobile.value ? `${(drinkTotalMl.value / 1000).toFixed(1)} L` : `${drinkTotalMl.value} ml`));

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
  "open-day-sheet": [dayStart: number];
  "life-note-tap": [payload: { key: string; text: string; top: number; bottom: number }];
}>();

const handleDateSelect = (ts: number) => {
  emit("date-select", ts);
};

const handleDateSelectDayView = (ts: number) => {
  emit("date-select-day-view", ts);
};

/** 可视化：只有日期 badge 进 sheet；格子只选中这天 */
function onDateBadgeClick(ts: number) {
  if (props.lifeView) {
    handleDateSelect(ts);
    emit("open-day-sheet", ts);
    return;
  }
  handleDateSelectDayView(ts);
}

/** 与 MainLayout 退出按钮一致：220ms 区分单击 / 双击 */
const BADGE_CLICK_DELAY_MS = 220;
let badgeClickTimer: ReturnType<typeof setTimeout> | null = null;

function clearBadgeClickTimer() {
  if (badgeClickTimer) {
    clearTimeout(badgeClickTimer);
    badgeClickTimer = null;
  }
}

function onDateBadgeMouseClick() {
  if (isMobile.value) return;
  if (!props.lifeView) {
    handleDateSelectDayView(props.day.startTs);
    return;
  }
  clearBadgeClickTimer();
  badgeClickTimer = setTimeout(() => {
    badgeClickTimer = null;
    onDateBadgeClick(props.day.startTs);
  }, BADGE_CLICK_DELAY_MS);
}

function onDateBadgeDblClick() {
  if (isMobile.value) return;
  clearBadgeClickTimer();
  handleDateSelectDayView(props.day.startTs);
}

function onCardClick() {
  handleDateSelect(props.day.startTs);
  if (props.lifeView) return;
  if (!props.drinkLayer) return;
  const task = drinkTask.value;
  if (task?.id != null) {
    emit("item-change", props.day.startTs, task.sourceId, task.id);
  }
}

const pointIconSize = computed(() => {
  if (props.drinkLayer) return isMobile.value ? 9 : 11;
  return isMobile.value ? 11 : 16;
});

function isVizLayer(): boolean {
  return !!(props.drinkLayer || props.lifeView);
}

/** 普通周：不画水滴和活动门（做什么从精力点开）。生活图层只补水滴 */
const visibleLifePoints = computed(() => {
  const points = props.lifeOverlay?.points ?? [];
  if (isVizLayer()) return points.filter((mark) => mark.kind === "drink");
  return points.filter((mark) => mark.kind === "eat" || mark.kind === "energy" || mark.kind === "reward");
});

const activityBands = computed(() =>
  (props.lifeOverlay?.points ?? []).filter((mark) => mark.kind === "toilet" && mark.endAt != null && mark.endAt > mark.time),
);

function activityBandStyle(mark: LifePointMark): CSSProperties {
  const endAt = mark.endAt;
  if (endAt == null) return { display: "none" };
  const style = props.getLifeSleepBandStyle(
    {
      recordId: mark.recordId,
      taskId: mark.taskId,
      todoId: mark.todoId,
      title: mark.title,
      note: mark.note,
      start: mark.time,
      end: endAt,
    },
    props.day.startTs,
  );
  return { ...style, backgroundColor: "var(--color-yellow-light)" };
}

function sleepBandStyle(sleep: LifeSleepRange): CSSProperties {
  const style = { ...props.getLifeSleepBandStyle(sleep, props.day.startTs) };
  // 非可视化只留月亮；可视化用底色，不画 icon
  if (!isVizLayer()) style.backgroundColor = "transparent";
  return style;
}

/** 与 TaskTracker 时间轴 popover 同策略：挂 body，避免周列 overflow 裁切 */
const lifeNotePopoverStyle = { maxWidth: "calc(100vw - 80px)", boxSizing: "border-box" } as const;
const lifeNoteContentStyle = { maxWidth: "100%", boxSizing: "border-box" } as const;

function onLifePointClick(mark: LifePointMark) {
  handleDateSelect(props.day.startTs);
  if (props.lifeView) return;
  if (mark.kind === "energy" || mark.kind === "reward") return;
  emit("item-change", props.day.startTs, undefined, mark.taskId);
}

function onSleepBandClick(sleep: LifeSleepRange) {
  handleDateSelect(props.day.startTs);
  if (props.lifeView) return;
  emit("item-change", props.day.startTs, undefined, sleep.taskId);
}

function onMobileLifeNoteTap(e: MouseEvent, key: string, text: string) {
  const el = e.currentTarget as HTMLElement | null;
  if (!el || !text) return;
  const rect = el.getBoundingClientRect();
  emit("life-note-tap", { key, text, top: rect.top, bottom: rect.bottom });
}

/** 生活图层水滴：水蓝、咖啡褐、饮品淡橙、酒淡红 */
const DRINK_DROP_COLOR: Record<DrinkKind, string> = {
  water: "rgba(64, 152, 252, 0.722)",
  coffee: "rgba(123, 79, 25, 0.8)",
  beverage: "rgba(255, 197, 110, 1)",
  wine: "rgba(196, 12, 49, 0.822)",
};

const DRINK_NEAR_MS = 20 * 60 * 1000;
const DRINK_X_MARGIN = 0.1;
const DRINK_X_GAP = 0.14;

function hashUnit(recordId: number, time: number): number {
  const n = Math.sin(recordId * 12.9898 + time * 0.00017) * 43758.5453;
  return n - Math.floor(n);
}

/** 这一时刻精力 / 奖赏折线所在的横向比例（0–1），含水滴不该压住的点 */
function blockedScoreFractions(points: LifePointMark[], sleeps: LifeSleepRange[], time: number): number[] {
  const blocked: number[] = [];
  const series = collectWeekScoreSeries(points, sleeps).filter((s) => s.kind === "energy" || s.kind === "reward");
  for (const row of series) {
    for (const dot of row.points) {
      if (Math.abs(dot.time - time) <= DRINK_NEAR_MS) blocked.push(dot.value / 10);
    }
    for (let i = 0; i < row.points.length - 1; i++) {
      const a = row.points[i];
      const b = row.points[i + 1];
      if (a == null || b == null || b.time === a.time || time < a.time || time > b.time) continue;
      const t = (time - a.time) / (b.time - a.time);
      blocked.push((a.value + (b.value - a.value) * t) / 10);
    }
  }
  return blocked;
}

/** 水滴横向比例。左右有散列，但躲开同一时刻的精力 / 奖赏 */
function placeDrinkFractions(points: LifePointMark[], sleeps: LifeSleepRange[]): Map<number, number> {
  const drinks = points.filter((p) => p.kind === "drink").sort((a, b) => a.time - b.time || a.recordId - b.recordId);
  const placed: { time: number; x: number }[] = [];
  const out = new Map<number, number>();
  const span = 1 - DRINK_X_MARGIN * 2;
  for (const drink of drinks) {
    const blocked = blockedScoreFractions(points, sleeps, drink.time);
    for (const prev of placed) {
      if (Math.abs(prev.time - drink.time) <= DRINK_NEAR_MS) blocked.push(prev.x);
    }
    let best = DRINK_X_MARGIN + hashUnit(drink.recordId, drink.time) * span;
    let bestDist = blocked.length === 0 ? 1 : Math.min(...blocked.map((b) => Math.abs(b - best)));
    for (let i = 1; i < 8 && bestDist < DRINK_X_GAP; i++) {
      const x = DRINK_X_MARGIN + hashUnit(drink.recordId, drink.time + i * 997) * span;
      const dist = Math.min(...blocked.map((b) => Math.abs(b - x)));
      if (dist > bestDist) {
        best = x;
        bestDist = dist;
      }
    }
    placed.push({ time: drink.time, x: best });
    out.set(drink.recordId, best);
  }
  return out;
}

const drinkFractions = computed(() => placeDrinkFractions(props.lifeOverlay?.points ?? [], props.lifeOverlay?.sleeps ?? []));

function drinkDropColor(mark: LifePointMark): string {
  const kind = mark.drinkKind ?? "water";
  return DRINK_DROP_COLOR[kind] ?? DRINK_DROP_COLOR.water;
}

function getLayerPointStyle(mark: LifePointMark): CSSProperties {
  const base = props.getLifePointStyle(mark, props.day.startTs);
  const rest = { ...base } as CSSProperties;
  delete rest.right;
  delete rest.left;
  delete rest.transform;
  const size = pointIconSize.value;
  const x = drinkFractions.value.get(mark.recordId) ?? 0.5;
  return {
    ...rest,
    width: `${size}px`,
    height: `${size}px`,
    color: drinkDropColor(mark),
    zIndex: 8,
    left: `calc(${x * 100}% - ${size / 2}px)`,
    right: "auto",
    transform: "translateX(0)",
  };
}

const weekBadgeTouch = createTouchScheduledSingleAndDouble(
  (ts) => {
    if (props.lifeView) {
      onDateBadgeClick(ts);
      return;
    }
    handleDateSelect(ts);
  },
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

/* 生活图层：月亮钉在醒来线，允许探出时间格（不裁半个） */
.day-card--drink-layer {
  overflow: visible;
}
.day-card--drink-layer :deep(.n-card__content) {
  overflow: visible;
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
  background-color: var(--color-blue-transparent);
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
.day-card--drink-layer .time-grid-container {
  overflow: visible;
}

.week-life-sleep {
  border-radius: 2px;
  pointer-events: none;
  overflow: visible;
}

.week-life-activity {
  border-radius: 2px;
  pointer-events: none;
}

.week-life-sleep-moon {
  position: absolute;
  left: 50%;
  bottom: 0;
  z-index: 8;
  color: var(--color-yellow-dark);
  pointer-events: auto;
  transform: translate(-50%, 50%);
}

.week-life-point {
  pointer-events: auto;
}

.week-life-sleep :deep(.n-popover-trigger),
.week-life-point :deep(.n-popover-trigger) {
  display: block;
  width: 100%;
  height: 100%;
}

.week-life-point__hit {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.week-life-energy {
  line-height: 1;
  user-select: none;
}

.week-life-note {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  max-width: 100%;
  box-sizing: border-box;
  color: var(--color-text-primary, #333);
}

.week-life-point--drink-layer {
  opacity: 1;
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
  font-weight: 500;
  opacity: 0.85;
}

.drink-sum--met {
  color: var(--color-blue);
  opacity: 1;
  font-weight: 500;
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
