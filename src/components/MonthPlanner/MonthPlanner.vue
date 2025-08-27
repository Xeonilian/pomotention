<!-- // src//MonthPlanner.vue -->
<template>
  <div class="month-planner">
    <div class="month-header">
      <n-card v-for="dayName in dayNames" :key="dayName" class="header-card">
        {{ dayName }}
      </n-card>
    </div>
    <div class="grid">
      <div v-for="(day, idx) in days" :key="idx" class="day-col">
        <n-card
          size="small"
          class="day-card"
          :class="[
            { 'day-card--selected': selectedDate === day.startTs },
            { 'day-card--other-month': !day.isCurrentMonth },
          ]"
          @click="() => handleDateSelect(day.startTs)"
        >
          <!-- 日期数字放在右上角 -->
          <div
            class="date-badge"
            :class="{ today: day.isToday }"
            @click="$emit('date-jump')"
          >
            {{ formatDay(day.startTs) }}
          </div>
          <div class="items">
            <div
              class="pomo-fill"
              :style="{
                height: '0%',
                background: getPomoGradient(day.pomoRatio * 0),
              }"
            />
            <template v-if="day.items.length">
              <div
                v-for="item in day.items.slice(0, MAX_PER_DAY)"
                :key="item.key"
                class="item"
                @click.stop="
                  () =>
                    handleItemSelect(
                      item.id,
                      item.ts,
                      item.activityId,
                      item.taskId
                    )
                "
              >
                <span class="type-dot" :class="item.type"></span>
                <TagRenderer
                  :tag-ids="normalizeTagIds(item.tagIds)"
                  :isCloseable="false"
                  size="tiny"
                  :displayLength="Number(0)"
                  :showIdx="Number(1)"
                  class="tag"
                />
                <span v-if="item.activityDueRange?.[0]" class="schedule-time">
                  {{ timestampToTimeString(item.activityDueRange?.[0]) }}
                </span>
                <span
                  class="title"
                  :title="item.title"
                  :class="[
                    { 'item--selected': selectedItem === item.id },
                    { 'activity--selected': activeId === item.activityId },
                  ]"
                >
                  {{ item.title }}
                </span>
              </div>
              <div v-if="day.items.length > MAX_PER_DAY" class="more">
                +{{ day.items.length - MAX_PER_DAY }}
                <span
                  class="pomo-gradient"
                  :style="{
                    color: getPomoGradient(day.pomoRatio),
                  }"
                >
                  &nbsp;🍅
                </span>
              </div>
            </template>
          </div>
        </n-card>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
// ... 脚本部分保持不变
import { computed, ref } from "vue";
import { NCard } from "naive-ui";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import TagRenderer from "../TagSystem/TagRenderer.vue";
import { timestampToTimeString } from "@/core/utils";

const emit = defineEmits<{
  "date-change": [timestamp: number];
  "date-jump": [];
  "item-change": [id: number, activityId?: number, taskId?: number];
}>();

const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const STANDARD_POMO = 12;

type UnifiedItem = {
  key: string;
  id: number;
  ts: number; // 用于分桶与排序的时间戳（毫秒）
  type: "todo" | "schedule";
  title: string;
  // 可选携带的原字段，便于后续交互扩展
  activityId?: number;
  activityTitle?: string;
  projectName?: string;
  taskId?: number;
  estPomo?: number[];
  realPomo?: number[];
  status?: "" | "delayed" | "ongoing" | "cancelled" | "done" | "suspended";
  pomoType?: "🍅" | "🍇" | "🍒";
  dueDate?: number;
  doneTime?: number;
  startTime?: number;
  interruption?: "I" | "E";
  positionIndex?: number;
  // schedule 专属
  activityDueRange?: [number | null, string];
  tagIds?: number[];
};
const props = defineProps<{
  monthTodos: Array<Todo & { tagIds?: number[] }>;
  monthSchedules: Array<Schedule & { tagIds?: number[] }>;
  monthStartTs: number; // 月初 00:00:00（毫秒）
  dayStartTs: number;
  selectedRowId: number | null;
  activeId: number | null;
}>();
const selectedDate = computed(() => props.dayStartTs);
const selectedItem = ref(1);
const MAX_PER_DAY = 4; // 每天最多显示4个项目
const DAY_MS = 24 * 60 * 60 * 1000;

const days = computed(() => {
  // 获取月份信息
  const monthStart = startOfMonth(props.monthStartTs);
  const monthEnd = endOfMonth(props.monthStartTs);
  const calendarStart = startOfWeek(monthStart); // 月视图显示完整周
  const calendarEnd = endOfWeek(monthEnd);
  // 计算日历天数
  const totalDays = Math.ceil((calendarEnd - calendarStart) / DAY_MS);
  // 将 Todo 映射到统一结构
  const todoItems: UnifiedItem[] = (props.monthTodos || [])
    .map((t) => {
      const ts = pickTodoTs(t);
      if (ts == null) return null;
      return {
        key: `todo-${t.id}`,
        id: t.id,
        ts,
        type: "todo",
        title: t.activityTitle || "-",
        activityId: t.activityId,
        activityTitle: t.activityTitle,
        projectName: t.projectName,
        taskId: t.taskId,
        estPomo: t.estPomo,
        realPomo: t.realPomo,
        status: t.status,
        pomoType: t.pomoType,
        dueDate: t.dueDate,
        doneTime: t.doneTime,
        startTime: t.startTime,
        interruption: t.interruption,
        positionIndex: t.positionIndex,
        tagIds: t.tagIds,
      } as UnifiedItem;
    })
    .filter((x): x is UnifiedItem => !!x);
  // 将 Schedule 映射到统一结构
  const scheduleItems: UnifiedItem[] = (props.monthSchedules || [])
    .map((s) => {
      const ts = pickScheduleTs(s);
      if (ts == null) return null;
      return {
        key: `schedule-${s.id}`,
        id: s.id,
        ts,
        type: "schedule",
        title: s.activityTitle || "-",
        activityId: s.activityId,
        activityTitle: s.activityTitle,
        projectName: s.projectName,
        taskId: s.taskId,
        status: s.status,
        location: s.location as any,
        doneTime: s.doneTime,
        isUntaetigkeit: s.isUntaetigkeit as any,
        interruption: s.interruption,
        activityDueRange: s.activityDueRange,
        tagIds: s.tagIds,
      } as UnifiedItem;
    })
    .filter((x): x is UnifiedItem => !!x);
  const merged = [...scheduleItems, ...todoItems];
  // 分桶到各天
  const buckets: UnifiedItem[][] = Array.from({ length: totalDays }, () => []);
  for (const item of merged) {
    const dayIndex = Math.floor((item.ts - calendarStart) / DAY_MS);
    if (dayIndex >= 0 && dayIndex < totalDays) {
      buckets[dayIndex].push(item);
    }
  }
  // 构建日历天数数据
  const today = startOfDay(Date.now());
  const currentMonth = new Date(props.monthStartTs).getMonth();

  const result = Array.from({ length: totalDays }, (_, idx) => {
    const dayTs = calendarStart + idx * DAY_MS;
    const dayDate = new Date(dayTs);
    const sorted = buckets[idx].slice().sort((a, b) => a.ts - b.ts);

    // 聚合当日 realPomo
    const sumRealPomo = sorted
      .filter((i) => i.type === "todo" && i.pomoType === "🍅")
      .reduce((sum, item) => {
        const arr = item.realPomo;
        if (!Array.isArray(arr) || arr.length === 0) return sum;
        const itemSum = arr.reduce((s, n) => s + (Number(n) || 0), 0);
        return sum + itemSum;
      }, 0);

    const sumRealGrape = sorted
      .filter((i) => i.type === "todo" && i.pomoType === "🍇")
      .reduce((sum, item) => {
        const arr = item.realPomo;
        if (!Array.isArray(arr) || arr.length === 0) return sum;
        const itemSum = arr.reduce((s, n) => s + (Number(n) || 0), 0);
        return sum + itemSum;
      }, 0);

    const ratio = Math.min(sumRealPomo / STANDARD_POMO, 1);

    return {
      index: idx,
      startTs: dayTs,
      endTs: dayTs + DAY_MS,
      items: sorted,
      isCurrentMonth: dayDate.getMonth() === currentMonth,
      isToday: dayTs === today,
      sumRealPomo,
      sumRealGrape,
      pomoRatio: ratio,
    };
  });
  return result;
});

function normalizeTagIds(ids?: number[] | null): number[] {
  return Array.isArray(ids) && ids.length > 0 ? ids : [0];
}

function pickTodoTs(t: Todo): number | null {
  return t.id ?? t.dueDate ?? t.startTime ?? null;
}

function pickScheduleTs(s: Schedule): number | null {
  const startTs = s.activityDueRange?.[0];
  return startTs ?? s.id ?? null;
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
function startOfMonth(ts: number) {
  const d = new Date(ts);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfMonth(ts: number) {
  const d = new Date(ts);
  d.setMonth(d.getMonth() + 1, 0); // 下个月的第0天 = 当月最后一天
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}
function startOfWeek(ts: number) {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // 周一为一周开始
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function endOfWeek(ts: number) {
  const d = new Date(ts);
  const day = d.getDay();
  const diff = day === 0 ? 0 : 7 - day; // 周日为一周结束
  d.setDate(d.getDate() + diff);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

function formatDay(ts: number) {
  const d = new Date(ts);
  return d.getDate().toString();
}

// 处理日期选择
const handleDateSelect = (day: number) => {
  selectedItem.value = -1;
  emit("date-change", day);
};

const handleItemSelect = (
  id: number,
  ts: number,
  activityId?: number,
  taskId?: number
) => {
  selectedItem.value = id;
  emit("date-change", ts);
  emit("item-change", id, activityId, taskId);
};

function getPomoGradient(ratio: number) {
  const clamped = Math.max(0, Math.min(1, ratio));
  const alpha = 0.1 + 0.9 * clamped; // 0 ~ 0.35，很淡的红
  return `rgba(245, 85, 45, ${alpha.toFixed(3)})`;
}
</script>
<style scoped>
.month-planner {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.month-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr); /* 创建7个等宽的列 */
  text-align: center;
  height: 22px;
  gap: 2px;
}
.header-card :deep(.n-card__content) {
  font-size: 14px;
  color: var(--color-text-primary);
  font-weight: 600;
  height: 20px;
  white-space: nowrap;
  padding: 0 !important;
}
.grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr)); /* 7列（一周7天） */
  grid-auto-rows: minmax(100px, 1fr); /* 自动行高，最小100px */
  gap: 2px;
}
.pomo-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0; /* 自下而上填充 */
  pointer-events: none; /* 不影响点击 */
  z-index: 0; /* 在内容之下 */
  border-radius: 2px;
}
.day-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 80px;
  position: relative; /* 为绝对定位的日期徽章提供定位基准 */
  overflow: hidden;
}
.day-card :deep(.n-card__content) {
  padding: 4px;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
}
.day-card--selected {
  border-color: var(--primary-color, #409eff) !important;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}
.day-card--other-month {
  opacity: 0.4;
}
/* 日期徽章 - 右上角绝对定位 */
.date-badge {
  position: absolute;
  top: 1px;
  right: 2px;
  font-weight: 500;
  font-size: 14px;
  width: 20px;
  height: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  z-index: 1;
  color: var(--color-text-secondary);
  background-color: var(--primary-color, #efeded4b);
  padding: 1px;
}
.date-badge.today {
  background-color: var(--color-blue);
  color: white;
}
.date-badge:hover {
  cursor: pointer;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
  overflow: visible;
  padding-top: 8px; /* 给右上角日期留出一点空间 */
}
.item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  line-height: 1.2;
  min-height: 15px;
  color: var(--text-color);
  cursor: pointer;
  padding: 1px 2px;
  border-radius: 2px;
  transition: background-color 0.2s;
  overflow: visible;
}
.item:hover {
  background-color: var(--color-hover, rgba(0, 0, 0, 0.05));
}
.item .title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}
.item--selected {
  background-color: var(--color-blue-light, rgba(64, 158, 255, 0.1)) !important;
}
.activity--selected {
  background-color: var(--color-red-light, rgba(255, 77, 77, 0.1)) !important;
}

.more {
  margin-left: auto;
  display: flex;
  color: var(--color-text-secondary);
  width: 55%;
  font-size: 10px;
  line-height: 10px;
  overflow: visible;
  white-space: nowrap;
}

/* 基础小圆点 没有了 */
.type-dot {
  display: inline-block;
  width: 4px;
  height: 4px;
  display: none;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 0px;
}

.type-dot.todo {
  background-color: var(--color-text-secondary);
}
.type-dot.schedule {
  background-color: var(--color-blue);
}

/* 提示点的tag的位置 */
.tag {
  height: 15px;
  width: 10px;
}

/* 提示点的tag的大小及位置 */
.tag :deep(.n-tag) {
  height: 6px;
  top: 4px;
  padding: 4px;
}

.schedule-time {
  margin-left: 1px;
  font-size: 11px;
  font-family: "consolas", monospace;
  color: var(--color-text);
  white-space: nowrap;
  border-radius: 2px;
  border: 1px solid var(--color-blue-light);
  background-color: var(--color-blue-light);
  padding-left: 1px;
  padding-right: 1px;
}

.pomo-gradient {
  display: block; /* 或保持默认块级 */
  margin-left: auto; /* 推向右侧 */
  font-family: "Segoe UI Symbol", "Noto Emoji", "Twemoji Mozilla",
    "Apple Symbols", sans-serif;
}
</style>
