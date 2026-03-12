<!-- 年视图：4×3 月格，每天显示日期数字+点，每行开头周编号；点击月份/周编号跳转 -->
<template>
  <div class="year-planner">
    <div class="year-grid months-4x3">
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
              :class="{ 'day-dot--other-month': day && !day.isCurrentMonth, 'day-dot--today': day?.isToday }"
              :title="day ? formatDayTitle(day.startTs) : ''"
              @click="day ? handleDayClick(day.startTs) : undefined"
            >
              <template v-if="day">
                <span class="day-dot" :style="{ backgroundColor: getDotColor(day.startTs) }">
                  <span class="day-num">{{ day.dayOfMonth }}</span>
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
import { computed } from "vue";
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
const dateService = dataStore.dateService;

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

const GRAY = "#999999";
function getDotColor(dayStartTs: number): string {
  const start = yearStart.value;
  const dots = dataStore.yearDayDots;
  if (!dots || dots.length === 0) return GRAY;
  const idx = Math.floor((dayStartTs - start) / DAY_MS);
  if (idx < 0 || idx >= dots.length) return GRAY;
  const item = dots[idx];
  return item?.tagColor ?? GRAY;
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
  emit("date-select-day-view", dayStartTs);
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
}

.year-grid.months-4x3 {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: repeat(3, min-content);
  gap: 8px;
  padding: 2px;
  min-height: min-content;
}

.month-cell {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 6px;
  background: var(--color-background);
  overflow: visible;
}

.month-cell-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 6px;
  flex-shrink: 0;
  cursor: pointer;
}

.month-cell-title:hover {
  color: var(--color-blue);
}

.month-dots {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: visible;
}

.month-dots-row {
  display: grid;
  grid-template-columns: 22px repeat(7, minmax(0, 1fr));
  gap: 2px;
  align-items: center;
  min-height: 24px;
  flex-shrink: 0;
}

.month-dots-row.month-dots-header {
  font-size: 10px;
  color: var(--color-text);
}

.dot-header {
  text-align: center;
}

.dot-header.week-col {
  font-weight: 500;
}

.week-num-wrap {
  margin: 0;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 11px;
  line-height: 1;
  color: var(--color-text-secondary);
  font-weight: 600;
  text-align: center;
}

.week-num-wrap:hover {
  color: var(--color-blue);
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
  opacity: 0.4;
}

/* 今日：整格底色与圆点填充均为蓝色 */

.day-dot-wrap.day-dot--today .day-dot {
  background: var(--color-blue) !important;
  border-radius: 50%;
}
.day-dot-wrap.day-dot--today .day-num {
  color: #fff;
}

.day-num {
  font-size: 10px;
  line-height: 1;
  color: var(--color-text);
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
}

.day-dot--empty {
  background: transparent;
  cursor: default;
}

.day-dot-wrap:has(.day-dot--empty) {
  cursor: default;
}
</style>
