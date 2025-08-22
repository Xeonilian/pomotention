<!-- // src/views/Home/WeekPlanner.vue -->
<template>
  <div class="week-planner">
    <div class="grid">
      <div v-for="(day, idx) in days" :key="idx" class="day-col">
        <n-card size="small" class="day-card">
          <div class="day-header">
            <div class="dow">
              {{ dayNames[idx] }}
            </div>

            <div class="date">{{ formatMonthDay(day.startTs) }}</div>
          </div>

          <n-scrollbar style="max-height: 520px">
            <div class="items">
              <template v-if="day.items.length">
                <div
                  v-for="item in day.items.slice(0, MAX_PER_DAY)"
                  :key="item.key"
                  class="item"
                >
                  <span class="type-dot" :class="item.type"></span>

                  <span class="title" :title="item.title">
                    {{ item.title }}
                  </span>
                </div>

                <div v-if="day.items.length > MAX_PER_DAY" class="more">
                  {{ day.items.length - MAX_PER_DAY }} …
                </div>
              </template>

              <div v-else class="empty">无</div>
            </div>
          </n-scrollbar>
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NCard, NScrollbar } from "naive-ui";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";

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
  activityDueRange?: [number | null, string]; // [开始时间戳, 持续 min(字符串)]
};

const props = defineProps<{
  weekTodos: Todo[];
  weekSchedules: Schedule[];
  weekStartTs: number; // 周一 00:00:00（毫秒）
}>();

const MAX_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const dayStartTsList = computed(() => {
  const base = startOfDay(props.weekStartTs);
  return Array.from({ length: 7 }, (_, i) => base + i * DAY_MS);
});

const days = computed(() => {
  // 将 Todo 映射到统一结构
  const todoItems: UnifiedItem[] = (props.weekTodos || [])
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
      } as UnifiedItem;
    })
    .filter((x): x is UnifiedItem => !!x);

  // 将 Schedule 映射到统一结构
  const scheduleItems: UnifiedItem[] = (props.weekSchedules || [])
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
        location: s.location as any, // 如果后续要用可加到类型
        doneTime: s.doneTime,
        isUntaetigkeit: s.isUntaetigkeit as any,
        interruption: s.interruption,
        activityDueRange: s.activityDueRange,
      } as UnifiedItem;
    })
    .filter((x): x is UnifiedItem => !!x);

  const merged = [...todoItems, ...scheduleItems];

  // 分桶到 7 天
  const buckets: UnifiedItem[][] = Array.from({ length: 7 }, () => []);
  const weekStart = startOfDay(props.weekStartTs);
  const weekEnd = weekStart + 7 * DAY_MS;

  for (const item of merged) {
    if (item.ts < weekStart || item.ts >= weekEnd) continue;
    const idx = Math.floor((item.ts - weekStart) / DAY_MS);
    if (idx >= 0 && idx < 7) buckets[idx].push(item);
  }

  // 各天排序
  const result = buckets.map((arr, idx) => {
    const sorted = arr.slice().sort((a, b) => a.ts - b.ts);
    return {
      index: idx,
      startTs: dayStartTsList.value[idx],
      endTs: dayStartTsList.value[idx] + DAY_MS,
      items: sorted,
    };
  });

  return result;
});

function pickTodoTs(t: Todo): number | null {
  // 排序与分桶使用的时间戳优先级：startTime > dueDate > id
  return t.startTime ?? t.dueDate ?? t.id ?? null;
}

function pickScheduleTs(s: Schedule): number | null {
  // 优先使用 activityDueRange[0] 作为开始时间戳；若没有，则退回 id
  const startTs = s.activityDueRange?.[0];
  return startTs ?? s.id ?? null;
}

function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function formatMonthDay(ts: number) {
  const d = new Date(ts);
  return `${d.getDate()}`;
}
</script>

<style scoped>
.week-planner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: calc(100% - 18px);
}

.grid {
  flex: 1 1 auto; /* 占据剩余空间 */
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.day-card {
  display: flex;
  flex-direction: column;
  height: 100%; /* 关键：撑满格子高度（即 grid 的行高） */
  width: 120px;
}
.day-card :deep(.n-card__content) {
  padding: 8px 6px;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
}
.day-header .dow {
  font-weight: 600;
}
.day-header .date {
  color: var(--color-text-secondary);
  font-size: 14px;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.item {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-color);
}

.item .type-tag {
  flex-shrink: 0;
}

.item .time {
  flex-shrink: 0;
  color: var(--color-text-secondary);
  font-variant-numeric: tabular-nums;
  width: 44px;
  text-align: right;
}

.item .title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more {
  color: var(--color-text-secondary);
  font-size: 12px;
  margin-right: 4px;
}

.empty {
  color: var(--color-text-secondary);
  font-size: 12px;
}

/* 基础小圆点 */
.type-dot {
  display: inline-block;
  width: 6px; /* 点的直径，可按需调整 */
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 4px; /* 和时间之间的间距 */
}

/* 颜色：todo 蓝色，schedule 红色 */
.type-dot.todo {
  background-color: var(--color-text-secondary);
}
.type-dot.schedule {
  background-color: var(--color-blue);
}
</style>
