<!-- // src/views/Home/WeekPlanner.vue -->
<template>
  <div class="week-planner">
    <div class="grid">
      <div v-for="(day, idx) in days" :key="idx" class="day-col">
        <n-card
          size="small"
          class="day-card"
          :class="[{ 'day-card--selected': selectedDate === day.startTs }]"
          @click="() => handleDateSelect(day.startTs)"
        >
          <div class="day-header">
            <div class="dow">
              {{ dayNames[idx] }}
            </div>
            <div
              class="date"
              :class="{ today: day.isToday }"
              @click="() => handleDateJump(day.startTs)"
            >
              {{ formatMonthDay(day.startTs) }}
            </div>
          </div>

          <div class="items">
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
                  :tag-ids="item.tagIds ?? []"
                  :isCloseable="false"
                  size="tiny"
                  :displayLength="Number(3)"
                  :showIdx="Number(2)"
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
              <div class="card-statistic">
                <span v-if="day.items.length > MAX_PER_DAY" class="more">
                  <span class="more-left">
                    +{{ day.items.length - MAX_PER_DAY }}</span
                  >
                  [<span
                    :style="{
                      color: getPomoColor(day.pomoRatio),
                    }"
                    >🍅&nbsp;
                  </span>
                  = {{ day.sumRealPomo }} 🍇 = {{ day.sumRealGrape }}]
                </span>
                <span v-else class="pom-sum"
                  >[<span
                    :style="{
                      color: getPomoColor(day.pomoRatio),
                    }"
                    >🍅
                  </span>
                  = {{ day.sumRealPomo }} 🍇 = {{ day.sumRealGrape }}]</span
                >
              </div>
            </template>

            <div v-else class="empty">无</div>
          </div>
        </n-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { NCard } from "naive-ui";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import TagRenderer from "../TagSystem/TagRenderer.vue";
import { timestampToTimeString } from "@/core/utils";

const props = defineProps<{
  weekTodos: Array<Todo & { tagIds?: number[] }>;
  weekSchedules: Array<Schedule & { tagIds?: number[] }>;
  weekStartTs: number; // 周一 00:00:00（毫秒）
  dayStartTs: number;
  activeId: number | null;
  selectedRowId: number | null;
}>();

const emit = defineEmits<{
  "date-change": [timestamp: number];
  "date-jump": [timestamp: number];
  "item-change": [id: number, activityId?: number, taskId?: number];
}>();

const today = startOfDay(Date.now());

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
  tagIds?: number[];
};

const selectedDate = computed(() => props.dayStartTs);
const selectedItem = ref(1);

const MAX_PER_DAY = 9;
const DAY_MS = 24 * 60 * 60 * 1000;

const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const STANDARD_POMO = 16;

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
        tagIds: t.tagIds,
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
        tagIds: s.tagIds,
      } as UnifiedItem;
    })
    .filter((x): x is UnifiedItem => !!x);

  const merged = [...scheduleItems, ...todoItems];

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
  const result = Array.from({ length: 7 }, (_, idx) => {
    const dayTs = weekStart + idx * DAY_MS;
    const sorted = buckets[idx].slice().sort((a, b) => a.ts - b.ts);

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

    const pomoRatio = Math.min(sumRealPomo / STANDARD_POMO, 1);

    return {
      index: idx,
      startTs: dayTs,
      endTs: dayTs + DAY_MS,
      items: sorted,
      sumRealPomo,
      sumRealGrape,
      pomoRatio,
      isToday: dayTs === today,
    };
  });

  return result;
});

function pickTodoTs(t: Todo): number | null {
  // 排序与分桶使用的时间戳优先级：startTime > dueDate > id
  return t.id ?? t.dueDate ?? t.startTime ?? null;
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

// 处理日期选择
const handleDateSelect = (day: number) => {
  selectedItem.value = -1;
  // 向父组件发送日期变化事件
  emit("date-change", day);
};

const handleDateJump = (day: number) => {
  selectedItem.value = -1;
  emit("date-jump", day);
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

function getPomoColor(ratio: number) {
  const clamp = (v: number, min = 0, max = 1) =>
    Math.min(max, Math.max(min, v));
  const r = clamp(ratio);

  // 起点与终点（#999 简写等于 #999999）
  const from = { r: 0x99, g: 0x99, b: 0x99 };
  const to = { r: 0xd6, g: 0x48, b: 0x64 };

  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

  const R = lerp(from.r, to.r, r);
  const G = lerp(from.g, to.g, r);
  const B = lerp(from.b, to.b, r);

  const hex = (n: number) => n.toString(16).padStart(2, "0");

  return `#${hex(R)}${hex(G)}${hex(B)}`;
}
</script>

<style scoped>
.week-planner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}

.grid {
  flex: 1 1 auto; /* 占据剩余空间 */
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.day-card--selected {
  border-color: var(--primary-color, #409eff) !important;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.day-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
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
}

.dow {
  font-weight: 600;
  white-space: nowrap;
}

.date {
  display: inline-flex; /* 或 display: flex */
  align-items: center; /* 垂直居中 */
  justify-content: center;
  font-size: 14px;
  min-width: 0; /* 关键：允许收缩到 0 */
  overflow: hidden;
  width: 20px;
  height: 20px;
  font-weight: 600;
  border-radius: 50%;
  z-index: 1;
  color: var(--color-text-secondary);
  background-color: var(--primary-color, #efeded4b);
}

.date.today {
  background-color: var(--color-blue);
  color: white;
  font-weight: 600;
}

.date:hover {
  cursor: pointer;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.item--selected {
  background-color: var(--color-blue-light);
  border-radius: 2px;
  padding: 2px;
}

.activity--selected {
  background-color: var(--color-red-light);
  border-radius: 2px;
  padding: 2px;
}

.item {
  display: flex;
  align-items: center;
  justify-content: baseline;
  vertical-align: middle;
  gap: 2px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-color);
}

.item .title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 基础小圆点 */
.type-dot {
  display: inline-block;
  width: 6px; /* 点的直径，可按需调整 */
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-right: 0px; /* 和时间之间的间距 */
}

/* 颜色：todo 蓝色，schedule 红色 */
.type-dot.todo {
  background-color: var(--color-text-secondary);
}
.type-dot.schedule {
  background-color: var(--color-blue);
}

.schedule-time {
  font-size: 11px;
  font-family: "consolas", monospace;
  color: var(--color-text);
  white-space: nowrap;
  border-radius: 2px;
  border: 1px solid var(--color-blue-light);
  box-shadow: 1px 1px 0px var(--color-background-dark);
  margin-left: 2px;
  line-height: 1.4;
}

.card-statistic {
  position: absolute;
  bottom: 0;
  width: 90%;
}

.card-statistic .more {
  display: flex;
  align-items: center;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-family: "Segoe UI Symbol", "Noto Emoji", "Twemoji Mozilla",
    "Apple Symbols", sans-serif;
  white-space: nowrap;
}

.more-left {
  margin-right: auto; /* 一定靠左 */
}

.pom-sum {
  display: block; /* 或保持默认块级 */
  margin-left: auto; /* 推向右侧 */
  width: max-content;
  color: var(--color-text-secondary);
  font-size: 12px;
  font-family: "Segoe UI Symbol", "Noto Emoji", "Twemoji Mozilla",
    "Apple Symbols", sans-serif;
}

.empty {
  color: var(--color-text-secondary);
  font-size: 12px;
}
</style>
