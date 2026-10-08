<!-- Home 计划表头部：日期、跑马灯、工具按钮与前后翻页 -->
<template>
  <div class="planner-header" @click.stop="emit('cleanSelection')">
    <div class="planner-header-left">
      <!-- 年入口：仅显示年份，点击进入年视图；在年视图时也只显示年份 -->
      <div class="day-info">
        <template v-if="settingStore.settings.viewSet !== 'year'">
          <span @click="emit('yearJump')" class="day-status" title="进入年视图">
            {{
              settingStore.settings.showTimetable && isMobile
                ? ""
                : settingStore.settings.viewSet === "month" || settingStore.settings.viewSet === "week"
                  ? dateService.displayYearInfo
                  : isMobile
                    ? dateService.displayYearInfo.slice(2) + "-"
                    : dateService.displayYearInfo + "-"
            }}
          </span>
        </template>
        <template v-else>
          <span @click="emit('dayJump')" class="day-status" title="进入日视图">
            {{ dateService.displayYearInfo }}
          </span>
          <span @click="emit('dateSet', 'today')" class="global-pomo">
            <span class="today-pomo">🍅{{ periodPomoCount }}</span>
            <span class="total-pomo">/{{ globalRealPomo }}</span>
          </span>
        </template>
      </div>
      <div
        v-if="settingStore.settings.viewSet === 'day'"
        class="day-info"
        :class="{
          'day-info--public-holiday': !!displayHolidayLabel,
        }"
      >
        <span @click="emit('weekJump')" class="day-status">{{ dateService.displayDateInfo }}</span>
        <span class="planner-day-holiday-name" :class="{ 'is-empty': !displayHolidayLabel }">{{ displayHolidayLabel }}</span>
        <span @click="emit('dateSet', 'today')" class="global-pomo">
          <span class="today-pomo">🍅{{ currentDatePomoCount }}</span>
          <span class="total-pomo">/{{ globalRealPomo }}</span>
        </span>
      </div>
      <div v-if="settingStore.settings.viewSet === 'week'" class="day-info">
        <span @click="emit('monthJump')" class="day-status">&nbsp;{{ dateService.displayWeekInfo }}</span>
        <span @click="emit('dateSet', 'today')" class="global-pomo">
          <span class="today-pomo">🍅{{ periodPomoCount }}</span>
          <span class="total-pomo">/{{ globalRealPomo }}</span>
        </span>
      </div>
      <div v-if="settingStore.settings.viewSet === 'month'" class="day-info">
        <span @click="emit('weekJump')" class="day-status">&nbsp;{{ dateService.displayMonthInfo }}</span>
        <span
          class="global-pomo"
          title="单击回到今天；点番茄切换统计/日程"
          @click="emit('dateSet', 'today')"
        >
          <span class="today-pomo" title="切换统计/日程" @click.stop="emit('toggleMonthStats')">🍅{{ periodPomoCount }}</span>
          <span class="total-pomo">/{{ globalRealPomo }}</span>
        </span>
      </div>
    </div>
    <div
      class="marquee"
      :class="{ 'marquee-empty': settingStore.settings.marquee === '' }"
      v-if="!isEditing"
      @click="startEdit"
      title="点击编辑跑马灯"
    >
      <n-marquee v-if="settingStore.settings.marquee !== ''" class="marquee__inner">
        {{ settingStore.settings.marquee }}&nbsp;
      </n-marquee>
    </div>
    <input
      v-else
      v-model="editValue"
      class="marquee marquee-input"
      @keydown.enter="saveEdit"
      @keydown.esc="cancelEdit"
      @blur="cancelEdit"
      ref="inputRef"
    />
    <div class="button-group" :class="{ 'button-group--mobile': isMobile }">
      <!-- 手机：工具栏限宽横滑，日期 < > 紧挨其后不挤出 -->
      <div class="toolbar-scroll-area" :class="{ 'is-mobile-scroll': isMobile }">
        <HomeToolbarButtons />

        <n-button
          title="重复活动"
          v-if="!isMobile"
          @click="emit('repeatActivity')"
          text
          type="default"
          size="small"
          :disabled="selectedRowId === null"
        >
          <template #icon>
            <n-icon><ArrowRepeatAll20Regular /></n-icon>
          </template>
        </n-button>
        <n-button
          v-if="!isMobile"
          type="default"
          size="small"
          text
          @click="emit('icsExport')"
          title="导出 ICS / 二维码"
          :disabled="selectedRowId === null"
        >
          <template #icon>
            <n-icon>
              <QrCode20Regular />
            </n-icon>
          </template>
        </n-button>
        <n-date-picker
          v-if="!isMobile"
          :value="queryDate"
          type="date"
          placeholder="日期选择"
          @update:value="onQueryPicked"
          class="search-date"
          placement="bottom"
          @click="emit('dateSet', 'today')"
          title="输入示例：2026-01-01"
        >
          <template #date-icon></template>
        </n-date-picker>
        <n-button v-if="!isMobile" size="small" text @click.stop="emit('viewSet')" title="切换视图">
          <template #icon>
            <n-icon color="var(--color-text-primary)">
              <CalendarSettings20Regular />
            </n-icon>
          </template>
        </n-button>
      </div>
      <div class="date-nav-buttons">
        <n-button size="small" text @click="emit('dateSet', 'prev')" :title="prevTitle">
          <template #icon>
            <n-icon>
              <ChevronLeft20Regular />
            </n-icon>
          </template>
        </n-button>

        <n-button size="small" text @click="emit('dateSet', 'next')" :title="nextTitle">
          <template #icon>
            <n-icon>
              <ChevronRight20Regular />
            </n-icon>
          </template>
        </n-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, nextTick, ref, toValue, watch } from "vue";
import {
  ArrowRepeatAll20Regular,
  CalendarSettings20Regular,
  ChevronLeft20Regular,
  ChevronRight20Regular,
  QrCode20Regular,
} from "@vicons/fluent";
import HomeToolbarButtons from "@/components/home/HomeToolbarButtons.vue";
import { useDevice } from "@/composables/platform/useDevice";
import { usePomodoroStats } from "@/composables/planner/usePomodoroStats";
import { plannerHolidayMapKey, plannerHolidayRangeKey, type HolidayLoadedRange } from "@/composables/planner/usePublicHolidays";
import { getDateKey } from "@/core/utils";
import type { HolidayDisplay } from "@/services/planner/publicHolidays";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";

defineProps<{
  /** 当前选中的计划行；空则禁用重复与导出 */
  selectedRowId: number | null;
}>();

const emit = defineEmits<{
  cleanSelection: [];
  yearJump: [];
  dayJump: [];
  weekJump: [];
  monthJump: [];
  dateSet: [direction: "prev" | "next" | "today" | "query", queryTs?: number];
  viewSet: [];
  repeatActivity: [];
  icsExport: [];
  toggleMonthStats: [];
}>();

const settingStore = useSettingStore();
const dataStore = useDataStore();
const dateService = dataStore.dateService;
const { isMobile } = useDevice();
const { currentDatePomoCount, periodPomoCount, globalRealPomo } = usePomodoroStats();

const holidayByDateKey = inject(plannerHolidayMapKey, ref<Record<string, HolidayDisplay>>({}));
const holidayLoadedRange = inject(plannerHolidayRangeKey, ref<HolidayLoadedRange | null>(null));

/**
 * 已覆盖当前日则给出节日名（可为空）；区间还是上一天时返回 null，先沿用上一帧。
 * Pinia 内 ref 可能已解包，用 toValue。
 */
const settledHolidayLabel = computed<string | null>(() => {
  if (!settingStore.settings.showPublicHolidays) return "";
  const raw = toValue(dateService.appDateTimestamp as Parameters<typeof toValue>[0]);
  const ts = typeof raw === "number" && !Number.isNaN(raw) ? raw : undefined;
  if (ts == null) return "";
  const range = holidayLoadedRange.value;
  if (!range || ts < range.start || ts >= range.end) return null;
  return holidayByDateKey.value[getDateKey(ts)]?.label ?? "";
});

const displayHolidayLabel = ref("");
watch(
  settledHolidayLabel,
  (label) => {
    if (label == null) return;
    displayHolidayLabel.value = label;
  },
  { immediate: true },
);

const prevTitle = computed(() => {
  const view = settingStore.settings.viewSet;
  if (view === "day") return "上一天";
  if (view === "week") return "上一周";
  if (view === "year") return "上一年";
  return "上一月";
});

const nextTitle = computed(() => {
  const view = settingStore.settings.viewSet;
  if (view === "day") return "下一天";
  if (view === "week") return "下一周";
  if (view === "year") return "下一年";
  return "下一月";
});

/** 日期选择器只作一次性跳转，选完即清空 */
const queryDate = ref<number | null>(null);
function onQueryPicked(value: number | null) {
  if (value != null) emit("dateSet", "query", value);
  queryDate.value = null;
}

/** 跑马灯就地编辑 */
const isEditing = ref(false);
const editValue = ref("");
const inputRef = ref<HTMLInputElement | null>(null);

function startEdit() {
  editValue.value = settingStore.settings.marquee;
  isEditing.value = true;
  nextTick(() => {
    inputRef.value?.focus();
  });
}

function saveEdit() {
  settingStore.settings.marquee = editValue.value;
  isEditing.value = false;
}

function cancelEdit() {
  isEditing.value = false;
}
</script>

<style scoped>
.planner-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  margin: 8px 8px 4px 0px;
  width: 100%;
  white-space: nowrap;
  /* visible：标签 TagRenderer hover scale 不被裁切；跑马灯等子项自行 overflow */
  overflow: visible;
  text-overflow: ellipsis;
}

.planner-header-left {
  display: flex;
  align-items: center;
  margin-left: 6px;
}

.marquee {
  flex: 1;
  margin-left: 8px;
  min-width: 0;
  font-size: 16px;
  color: var(--color-text);
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
  overflow: hidden;
  white-space: nowrap;
  cursor: pointer;
  outline: none;
}

.marquee-input {
  border: 1px solid var(--color-blue);
  outline: none;
}
.marquee-empty:before {
  content: "💡";
}
.search-date {
  max-width: 100px !important;
}

/* 禁止随父级 flex 收缩，保持按钮组尺寸 */
.button-group {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
  background-color: var(--color-background);
  z-index: 5;
  margin-right: 6px;
  order: 999;
}

/* 手机：整组仍靠右紧凑；只允许被挤时收缩，不拉满中间空隙 */
.button-group--mobile {
  flex: 0 1 auto;
  min-width: 0;
}

.toolbar-scroll-area {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

/* 手机：限宽后溢出横滑；不用 width:0/flex:1，避免与 < > 被拉开贴边 */
.toolbar-scroll-area.is-mobile-scroll {
  max-width: min(46vw, 168px);
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  overscroll-behavior-x: contain;
  scrollbar-width: none;
}

.toolbar-scroll-area.is-mobile-scroll::-webkit-scrollbar {
  display: none;
  height: 0;
  width: 0;
}

.toolbar-scroll-area.is-mobile-scroll :deep(.home-toolbar-buttons) {
  flex-shrink: 0;
  min-width: max-content;
}

.date-nav-buttons {
  display: flex;
  flex-shrink: 0;
  gap: 6px;
  align-items: center;
}

@media (max-width: 430px) {
  .button-group {
    gap: 6px;
  }
  .global-pomo {
    margin-left: 2px !important;
  }
}

.day-info {
  display: flex;
  align-items: center;
  min-width: 0;
  z-index: 2;
  font-weight: 600;
  background-color: var(--color-background);
}

/* 节假日当日：日视图日期整行（含番茄统计）用红色强调 */
.day-info.day-info--public-holiday .planner-day-holiday-name {
  color: var(--color-red);
}

.planner-day-holiday-name {
  margin-left: 6px;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  max-width: 44vw;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 430px) {
  /* 节日名略收，优先保住右侧日期切换 */
  .planner-day-holiday-name {
    max-width: 28vw;
    flex-shrink: 1;
  }
}

/* 非节日：节点留着，左右间距由日期和番茄承担 */
.planner-day-holiday-name.is-empty {
  margin-left: 0;
  max-width: 0;
  min-width: 0;
  flex-shrink: 0;
  overflow: hidden;
}

.day-status {
  font-size: 18px;
  font-family: Consolas, "Courier New", Courier, Monaco, "Liberation Mono", "Menlo", monospace;
  color: var(--color-text);
  cursor: pointer;
  background-color: var(--color-background);
}

.global-pomo {
  display: inline-flex;
  align-items: center;
  font-size: 16px;
  color: var(--color-text);
  background: var(--color-background-light-transparent);
  padding: 2px 4px;
  border-radius: 12px;
  font-family: Consolas, "Courier New", Courier, monospace;
  font-weight: 500;
  margin-left: 12px;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
}

.global-pomo * {
  user-select: none;
  -webkit-user-select: none;
}

.today-pomo {
  color: var(--color-blue);
  font-family: Consolas, "Courier New", Courier, monospace;
  font-weight: 500;
}

.search-date :deep(.n-input) {
  --n-height: 25px !important;
  font-size: 12px;
  padding-top: 1px;
  padding-bottom: 1px;
}

.search-date :deep(.n-input-wrapper) {
  padding-left: 6px;
  padding-right: 6px;
}

@media (max-width: 650px) {
  .marquee {
    display: none;
  }

  .marquee-input {
    display: block;
  }

  .today-pomo,
  .total-pomo {
    font-size: 14px;
    padding-left: 0;
    padding-right: 0;
  }
}
</style>
