<!-- // src//MonthPlanner.vue -->
<template>
  <div class="month-planner">
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
          <div class="date-badge" :class="{ today: day.isToday }">
            {{ formatDay(day.startTs) }}
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

const emit = defineEmits<{
  "date-change": [timestamp: number];
  "item-change": [activityId?: number, taskId?: number];
}>();

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
};

const props = defineProps<{
  monthTodos: Todo[];
  monthSchedules: Schedule[];
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
      } as UnifiedItem;
    })
    .filter((x): x is UnifiedItem => !!x);

  const merged = [...todoItems, ...scheduleItems];

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

    return {
      index: idx,
      startTs: dayTs,
      endTs: dayTs + DAY_MS,
      items: sorted,
      isCurrentMonth: dayDate.getMonth() === currentMonth,
      isToday: dayTs === today,
    };
  });

  return result;
});

function pickTodoTs(t: Todo): number | null {
  return t.startTime ?? t.dueDate ?? t.id ?? null;
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
  emit("item-change", activityId, taskId);
};
</script>

<style scoped>
.month-planner {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
}

.grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr)); /* 7列（一周7天） */
  grid-auto-rows: minmax(100px, 1fr); /* 自动行高，最小100px */
  gap: 2px;
}

.day-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 100px;
  position: relative; /* 为绝对定位的日期徽章提供定位基准 */
  padding: 2px;
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
  top: 2px;
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
  background-color: transparent;
  color: var(--color-text-secondary);
}

.date-badge.today {
  background-color: var(--primary-color, #409eff);
  color: white;
  font-weight: 600;
}

.items {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
  overflow: hidden;
  padding-top: 2px; /* 给右上角日期留出一点空间 */
}

.item {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 11px;
  line-height: 1.2;
  color: var(--text-color);
  cursor: pointer;
  padding: 1px 2px;
  border-radius: 2px;
  transition: background-color 0.2s;
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
  color: var(--color-text-secondary);
  font-size: 10px;
  text-align: center;
  padding: 2px;
  margin-top: auto;
}

/* 基础小圆点 */
.type-dot {
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  flex-shrink: 0;
}

.type-dot.todo {
  background-color: var(--color-text-secondary);
}

.type-dot.schedule {
  background-color: var(--color-blue);
}
</style>
