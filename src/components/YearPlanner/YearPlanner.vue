<!-- 年视图：4×3 月格，每天显示日期数字+点，每行开头周编号；点击月份/周编号跳转 -->
<template>
  <div class="year-planner">
    <div class="year-grid months-nxn">
      <div v-for="month in months" :key="month.monthIndex" class="month-cell">
        <div class="month-cell-title" title="点击进入月视图" @click="handleMonthTitleClick(month.monthStartTs)">
          {{ month.title }}
        </div>
        <div class="month-dots">
          <div class="month-dots-row month-dots-header">
            <span class="dot-header week-col"></span>
            <span v-for="(dn, i) in dayNames" :key="`${dn}-${i}`" class="dot-header">{{ dn }}</span>
          </div>
          <div v-for="(row, rowIdx) in month.rows" :key="rowIdx" class="month-dots-row">
            <button type="button" class="week-num-wrap" title="点击进入周视图" @click="handleWeekClick(row.weekStartTs)">
              {{ row.weekNum }}
            </button>
            <button
              v-for="(day, colIdx) in row.days"
              :key="day ? day.startTs : `empty-${rowIdx}-${colIdx}`"
              type="button"
              class="day-dot-wrap"
              :class="{
                'day-dot--today': day && day.isCurrentMonth && day.isToday,
                'day-dot--selected': day && day.isCurrentMonth && selectedDate === day.startTs,
                'day-dot--other-month': day && !day.isCurrentMonth,
              }"
              :title="day ? formatDayTitle(day.startTs) : ''"
              @click="onYearDayClick(day)"
              @dblclick.stop="onYearDayDblClick(day, $event)"
              @touchstart.stop="onYearDayTouchStart(day, $event)"
              @touchend.stop="onYearDayTouchEnd(day, $event)"
              @touchcancel.stop="onYearDayTouchCancel()"
            >
              <template v-if="day && day.isCurrentMonth">
                <span class="day-dot" :class="yearHolidayDotClass(day.startTs)" :style="getDotBgStyle(day.startTs)">
                  <span class="day-num" :style="getDayNumStyle(day.startTs)">{{ day.dayOfMonth }}</span>
                </span>
              </template>
              <!-- 邻月日期：可见弱化格；勿用 day-dot--empty，否则整格被 :has 规则隐藏 -->
              <span v-else-if="day" class="day-dot day-dot--outside-month">
                <span class="day-num">{{ day.dayOfMonth }}</span>
              </span>
              <span v-else class="day-dot day-dot--empty" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject, ref } from "vue";
import { storeToRefs } from "pinia";
import { createTouchScheduledSingleAndDouble } from "@/composables/useTouchScheduledSingleAndDouble";
import { useDataStore } from "@/stores/useDataStore";
import { useDevice } from "@/composables/useDevice";
import { getDateKey } from "@/core/utils";
import type { HolidayDisplay } from "@/services/publicHolidays";
import { plannerHolidayMapKey } from "@/composables/usePublicHolidays";

const holidayMap = inject(plannerHolidayMapKey, ref<Record<string, HolidayDisplay>>({}));

const emit = defineEmits<{
  "date-select-day-view": [timestamp: number];
  "navigate-to-month": [monthStartTs: number];
  "navigate-to-week": [weekStartTs: number];
}>();

const DAY_MS = 24 * 60 * 60 * 1000;
// 周一至周日单字母
const dayNames = ["M", "T", "W", "T", "F", "S", "S"];
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const dataStore = useDataStore();
const { selectedTaskId, firstTaggedTaskIdForAppDate, selectedDate } = storeToRefs(dataStore);
const dateService = dataStore.dateService;
const { isMobile } = useDevice();

type MonthDay = { startTs: number; dayOfMonth: number; isCurrentMonth: boolean; isToday: boolean } | null;
type MonthRow = { weekNum: number; weekStartTs: number; days: MonthDay[] };

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function endOfMonth(ts: number) {
  const d = new Date(ts);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
function startOfWeek(ts: number) {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function endOfWeek(ts: number) {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

// ISO 周编号
function getISOWeekNumber(ts: number): number {
  const d = new Date(ts);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const isoYear = date.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(isoYear, 0, 4));
  return 1 + Math.round(((+date - +firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

const yearStart = computed(() => {
  const v = dateService.yearStartTs;
  const ts = typeof v === "object" && v != null && "value" in v ? (v as { value: number }).value : v;
  return typeof ts === "number" && !Number.isNaN(ts) ? ts : new Date(new Date().getFullYear(), 0, 1).getTime();
});
const todayStart = computed(() => startOfDay(Date.now()));

function getDotStyle(dayStartTs: number): { backgroundColor?: string; color?: string } {
  const start = yearStart.value;
  const dots = dataStore.yearDayDots;
  // 没有 dots 时走 CSS 默认底色
  if (!dots || dots.length === 0) return {};
  const idx = Math.floor((dayStartTs - start) / DAY_MS);
  if (idx < 0 || idx >= dots.length) return {};
  const item = dots[idx];
  // 没有 tagColor 时走 CSS 默认底色
  const bg = item?.tagColor ?? undefined;
  const fg = item?.textColor ?? undefined;
  if (!bg && !fg) return {};
  return { backgroundColor: bg, color: fg };
}

// 圆点底色样式（只取背景色）
function getDotBgStyle(dayStartTs: number): { backgroundColor?: string } {
  const { backgroundColor } = getDotStyle(dayStartTs);
  return backgroundColor ? { backgroundColor } : {};
}

// 日期文字样式（只取前景色）
function getDayNumStyle(dayStartTs: number): { color?: string } {
  const { color } = getDotStyle(dayStartTs);
  return color ? { color } : {};
}

function formatDayTitle(ts: number): string {
  const d = new Date(ts);
  const base = d.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
  const h = holidayMap.value[getDateKey(ts)];
  return h ? `${base} · ${h.label}` : base;
}

/** 年视图格子：法定节假日浅红底，调休补班灰底，节气浅绿底 */
function yearHolidayDotClass(ts: number): string {
  const h = holidayMap.value[getDateKey(ts)];
  if (!h) return "";
  if (h.kind === "transfer_workday") return "day-dot--holiday-transfer";
  if (h.kind === "solar_term") return "day-dot--holiday-solar";
  return "day-dot--holiday-public";
}

const months = computed(() => {
  const start = yearStart.value;
  const y = new Date(start).getFullYear();
  const result: {
    monthIndex: number;
    title: string;
    monthStartTs: number;
    rows: MonthRow[];
  }[] = [];

  for (let m = 0; m < 12; m++) {
    const monthStartTs = new Date(y, m, 1).getTime();
    const calendarStart = startOfWeek(monthStartTs);
    const calendarEnd = endOfWeek(endOfMonth(monthStartTs));
    const totalDays = Math.ceil((calendarEnd - calendarStart) / DAY_MS);
    const currentMonth = m;
    const rows: MonthRow[] = [];
    let days: MonthDay[] = [];

    for (let i = 0; i < totalDays; i++) {
      const dayTs = calendarStart + i * DAY_MS;
      const dayDate = new Date(dayTs);
      const isCurrentMonth = dayDate.getMonth() === currentMonth;
      const isToday = dayTs === todayStart.value;
      const dayOfMonth = dayDate.getDate();
      days.push({ startTs: dayTs, dayOfMonth, isCurrentMonth, isToday });
      if (days.length === 7) {
        const weekStartTs = startOfWeek(days[0]!.startTs);
        rows.push({ weekNum: getISOWeekNumber(weekStartTs), weekStartTs, days });
        days = [];
      }
    }
    if (days.length > 0) {
      while (days.length < 7) days.push(null);
      const weekStartTs = startOfWeek(days[0]?.startTs ?? calendarStart);
      rows.push({ weekNum: getISOWeekNumber(weekStartTs), weekStartTs, days });
    }

    result.push({
      monthIndex: m,
      title: monthNames[m],
      monthStartTs,
      rows,
    });
  }
  return result;
});

function handleDayClick(dayStartTs: number) {
  // 使用 dataStore 直接更新当前选中日期，并让 TaskTracker 选中这一天对应的 task
  dateService.setAppDate(dayStartTs);
  dataStore.setSelectedDate(dayStartTs);
  selectedTaskId.value = firstTaggedTaskIdForAppDate.value ?? null;
}

function handleDayDblClick(dayStartTs: number) {
  emit("date-select-day-view", dayStartTs);
}

/** 年视图可滚动：位移超过阈值则取消本次选日/双触判定，避免划动误点 */
const YEAR_SCROLL_CANCEL_PX = 22; // 阈值太低会误判为滚动，太高则用户难以精确点击

const yearDayTouch = createTouchScheduledSingleAndDouble(handleDayClick, handleDayDblClick);
let yearTouchPanCancelled = false;
let yearTouchPanTeardown: (() => void) | null = null;

function attachYearTouchPanGuard(e: TouchEvent) {
  yearTouchPanTeardown?.();
  yearTouchPanCancelled = false;
  const t0 = e.touches[0];
  if (!t0) return;
  const sx = t0.clientX;
  const sy = t0.clientY;
  const onMove = (ev: TouchEvent) => {
    const t = ev.touches[0];
    if (!t) return;
    if (Math.hypot(t.clientX - sx, t.clientY - sy) > YEAR_SCROLL_CANCEL_PX) {
      yearTouchPanCancelled = true;
      yearDayTouch.touchCancel();
    }
  };
  const teardown = () => {
    document.removeEventListener("touchmove", onMove);
    document.removeEventListener("touchend", teardown);
    document.removeEventListener("touchcancel", teardown);
    yearTouchPanTeardown = null;
  };
  yearTouchPanTeardown = teardown;
  document.addEventListener("touchmove", onMove, { passive: true });
  document.addEventListener("touchend", teardown);
  document.addEventListener("touchcancel", teardown);
}

function onYearDayClick(day: MonthDay | null) {
  if (!day?.isCurrentMonth || isMobile.value) return;
  handleDayClick(day.startTs);
}

function onYearDayDblClick(day: MonthDay | null, e: MouseEvent) {
  if (!day?.isCurrentMonth || isMobile.value) return;
  e.preventDefault();
  handleDayDblClick(day.startTs);
}

function onYearDayTouchStart(day: MonthDay | null, e: TouchEvent) {
  if (!day?.isCurrentMonth || !isMobile.value) return;
  yearDayTouch.touchStart(e);
  attachYearTouchPanGuard(e);
}

function onYearDayTouchEnd(day: MonthDay | null, e: TouchEvent) {
  if (!day?.isCurrentMonth || !isMobile.value) return;
  e.stopPropagation();
  yearTouchPanTeardown?.();
  const skip = yearTouchPanCancelled;
  yearTouchPanCancelled = false;
  if (skip) return;
  yearDayTouch.touchEnd(day.startTs);
}

function onYearDayTouchCancel() {
  if (!isMobile.value) return;
  yearTouchPanTeardown?.();
  yearTouchPanCancelled = false;
  yearDayTouch.touchCancel();
}

function handleMonthTitleClick(monthStartTs: number) {
  emit("navigate-to-month", monthStartTs);
}

function handleWeekClick(weekStartTs: number) {
  emit("navigate-to-week", weekStartTs);
}
</script>

<style scoped>
/* 仅最外层滚动，内部月份不被裁剪 */
.year-planner {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: auto;
  user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  -webkit-touch-callout: none;
  touch-action: pan-x pan-y;
}

.year-grid.months-nxn {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(2, min-content);
  gap: 8px;
  padding: 2px;
  min-height: min-content;
}

.month-cell {
  display: flex;
  flex-direction: column;
  padding: 1px;
  overflow: visible;
}

.month-cell-title {
  font-family: Consolas, "Courier New", Courier, monospace;
  font-size: 14px;
  font-weight: 600;
  flex-shrink: 0;
  cursor: pointer;
}

.month-cell-title:hover {
  color: var(--color-blue);
}

.month-dots {
  display: flex;
  flex-direction: column;

  overflow: visible;
}

.month-dots-row {
  display: grid;
  grid-template-columns: 22px repeat(7, minmax(0, 1fr));
  align-items: center;
  min-height: 24px;
  flex-shrink: 0;
}

.month-dots-row.month-dots-header {
  font-size: 12px;
  color: var(--color-text-secondary);
  font-family: Consolas, "Courier New", Courier, monospace;
}

.dot-header {
  text-align: center;
}

.dot-header.week-col {
  font-weight: 500;
  padding-left: 2px;
}

.week-num-wrap {
  margin: 0;
  padding-left: 2px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  color: var(--color-text-secondary);
  font-weight: 500;
  text-align: center;
  font-family: Consolas, "Courier New", Courier, monospace;
}

.week-num-wrap:hover {
  color: var(--color-blue);
  font-weight: 600;
  font-size: 12px;
}

.day-dot-wrap {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  gap: 0;
  min-height: 20px;
}

/* 邻月：圆点与数字弱化（原先邻月走了 day-dot--empty，整格被隐藏，other-month 样式无效） */
.day-dot-wrap.day-dot--other-month {
  cursor: default;
}

.day-dot-wrap.day-dot--other-month .day-dot--outside-month {
  background-color: var(--color-background);
}

.day-dot-wrap.day-dot--other-month .day-num {
  color: var(--color-background);
}

.day-dot-wrap:hover .day-num {
  color: var(--color-blue);
}

/* 今日：整格底色与圆点填充均为蓝色 */

.day-dot-wrap.day-dot--today .day-dot {
  color: white !important;
  background-color: var(--color-blue);
  font-weight: 600;
  z-index: 10;
}

.day-dot-wrap.day-dot--today .day-num {
  color: #fff;
}

/* 与月/周视图一致：当前选中日期（点击后由 store 驱动，触控也稳定） */
.day-dot-wrap.day-dot--selected .day-dot {
  box-shadow:
    0 0 0 1px var(--color-blue),
    0 2px 6px var(--color-blue-light);
  z-index: 5;
}

.day-dot-wrap.day-dot--today.day-dot--selected .day-dot {
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.95),
    0 2px 6px rgba(64, 158, 255, 0.35);
}

.day-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  flex-shrink: 0;
  min-width: 20px;
  min-height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-background-light);
  transition: transform 0.12s ease-out;
}

.day-dot.day-dot--holiday-public {
  background-color: var(--color-red-light-transparent) !important;
}

.day-dot.day-dot--holiday-public .day-num {
  color: var(--color-red) !important;
}

.day-dot.day-dot--holiday-transfer {
  background-color: rgba(100, 100, 110, 0.34) !important;
}

.day-dot.day-dot--holiday-transfer .day-num {
  color: var(--color-text-secondary) !important;
}

.day-dot.day-dot--holiday-solar {
  background-color: var(--color-green-light-transparent) !important;
}

.day-dot.day-dot--holiday-solar .day-num {
  color: var(--color-green) !important;
}

.day-num {
  font-size: 12px;
  color: var(--color-background);
  font-weight: bold;
  font-family: Consolas, "Courier New", Courier, monospace;
}

.day-dot--empty {
  display: none;
  background: transparent;
  cursor: default;
}

.day-dot-wrap:has(.day-dot--empty) {
  display: none;
  cursor: default;
}

/* 触控按下瞬间反馈（不依赖 hover）；邻月不可点，无缩放反馈 */
.day-dot-wrap:not(.day-dot--other-month):active .day-dot {
  transform: scale(1.1);
}

/* 仅真实可悬停设备使用 hover，避免手机伪 hover 不稳定 */
@media (hover: hover) and (pointer: fine) {
  .day-dot-wrap:not(.day-dot--other-month) .day-dot:hover {
    cursor: pointer;
    background-color: var(--color-blue-light);
    color: var(--color-blue) !important;
    border-radius: 50%;
    transform: scale(1.1);
  }
}

/* 小屏：宽度 < 1000px 时整体压缩为 4×3 月格，但保持圆点原始尺寸，避免被压扁 */
@media (max-width: 1000px) {
  .year-grid.months-nxn {
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(3, min-content);
    gap: 2px;
  }
}
@media (max-width: 800px) {
  .year-grid.months-nxn {
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(4, min-content);
    gap: 3px;
  }

  .day-dot {
    width: 16px;
    height: 16px;
    min-width: 16px;
    min-height: 16px;
  }
  .day-num {
    font-size: 12px;
  }

  .month-dots-row {
    max-height: 16px;
  }
}

@media (max-width: 600px) {
  .year-grid.months-nxn {
    gap: 2px;
  }
  .day-dot {
    width: 15px;
    height: 15px;
    min-width: 15px;
    min-height: 15px;
  }
  .day-num {
    font-size: 9px;
  }

  .month-dots-row {
    max-height: 15px;
  }
}

/* 极小屏：宽度 < 400px 时隐藏星期几表头行，同样不改变圆点尺寸 #TODO */
@media (max-width: 430px) {
  .year-grid.months-nxn {
    grid-template-columns: repeat(2, 1fr);
    grid-template-rows: repeat(6, min-content);
    gap: 3px;
  }
  .month-dots-row.month-dots-header {
    display: none;
  }
  .day-dot {
    width: 16px;
    height: 16px;
  }

  .day-num {
    font-size: 10px;
  }

  .month-dots-row {
    max-height: 16px;
  }
}

/* 组件实际宽度 < 250px 时进一步缩小圆点（侧栏等窄容器） */
@container (max-width: 249px) {
  .day-dot {
    width: 14px;
    height: 14px;
    min-width: 14px;
    min-height: 14px;
  }
  .day-num {
    font-size: 9px;
  }
}
</style>
