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
              :class="{ 'day-dot--today': day && day.isCurrentMonth && day.isToday }"
              :title="day && day.isCurrentMonth ? formatDayTitle(day.startTs) : ''"
              @click="day && day.isCurrentMonth ? handleDayClick(day.startTs) : undefined"
              @dblclick.stop="day && day.isCurrentMonth ? handleDayDblClick(day.startTs) : undefined"
              @touchstart.stop="day && day.isCurrentMonth ? handleDayTouchStart($event, day.startTs) : undefined"
              @touchend.stop="day && day.isCurrentMonth ? handleDayTouchEnd($event, day.startTs) : undefined"
              @touchcancel.stop="day && day.isCurrentMonth ? handleDayTouchCancel() : undefined"
            >
              <template v-if="day && day.isCurrentMonth">
                <span class="day-dot" :style="getDotBgStyle(day.startTs)">
                  <span class="day-num" :style="getDayNumStyle(day.startTs)">{{ day.dayOfMonth }}</span>
                </span>
              </template>
              <span v-else class="day-dot day-dot--empty" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import { useLongPress } from "@/composables/useLongPress";
import { useDataStore } from "@/stores/useDataStore";

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
const { selectedTaskId, firstTaggedTaskIdForAppDate } = storeToRefs(dataStore);
const dateService = dataStore.dateService;
const dayLongPressHandler = ref<ReturnType<typeof useLongPress> | null>(null);

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
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

type MonthDay = { startTs: number; dayOfMonth: number; isCurrentMonth: boolean; isToday: boolean } | null;
type MonthRow = { weekNum: number; weekStartTs: number; days: MonthDay[] };

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

function handleDayTouchStart(e: TouchEvent, dayStartTs: number) {
  // 阻止长按触发系统复制/文本选择
  e.preventDefault();
  if (!dayLongPressHandler.value) {
    dayLongPressHandler.value = useLongPress({
      delay: 600,
      onLongPress: () => {
        emit("date-select-day-view", dayStartTs);
      },
    });
  }
  const handler = dayLongPressHandler.value;
  if (handler) {
    handler.onLongPressStart(e);
  }
}

function handleDayTouchEnd(e: TouchEvent, dayStartTs: number) {
  e.stopPropagation();
  dayLongPressHandler.value?.onLongPressEnd();
  handleDayClick(dayStartTs);
}

function handleDayTouchCancel() {
  dayLongPressHandler.value?.onLongPressCancel();
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
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: auto;
  user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  -webkit-touch-callout: none;
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  gap: 0;
  min-height: 24px;
}

.day-dot-wrap.day-dot--other-month .day-num,
.day-dot-wrap.day-dot--other-month .day-dot {
  color: var(--color-background);
  background-color: var(--color-background-light);
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

.day-num {
  font-size: 10px;
  line-height: 1;
  color: var(--color-background);
  font-weight: 600;
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
  background-color: var(--color-background-dark);
}

.day-dot--empty {
  background: transparent;
  cursor: default;
}

.day-dot-wrap:has(.day-dot--empty) {
  cursor: default;
}

/* hover 只作用在固定尺寸的圆点上，避免 button 宽度导致椭圆 */
.day-dot-wrap:hover .day-dot {
  cursor: pointer;
  background-color: var(--color-blue-light);
  color: var(--color-blue);
  border-radius: 50%;
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
    font-size: 11px;
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

/* 极小屏：宽度 < 400px 时隐藏星期几表头行，同样不改变圆点尺寸 */
@media (max-width: 410px) {
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
    min-width: 16px;
    min-height: 16px;
  }
  .day-num {
    font-size: 10px;
  }

  .month-dots-row {
    max-height: 16px;
  }
}
</style>
