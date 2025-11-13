// src/stores/useDataStore.ts
import { defineStore } from "pinia";
import { ref, computed, watch } from "vue"; // 补：watch 需要从 vue 引入

import {
  loadActivities,
  loadTodos,
  loadSchedules,
  loadTasks,
  saveActivities,
  saveTodos,
  saveSchedules,
  saveTasks,
} from "@/services/localStorageService";

import type { Schedule } from "@/core/types/Schedule";
import type { Task } from "@/core/types/Task";
import type { Activity } from "@/core/types/Activity";
import type { Tag } from "@/core/types/Tag";
import { addDays, debounce } from "@/core/utils";
import type { Todo, TodoWithTags, TodoWithTaskRecords } from "@/core/types/Todo";

import type { DataPoint, MetricName, AggregationType, TimeGranularity } from "@/core/types/Chart";
import { unifiedDateService } from "@/services/unifiedDateService";
import { collectPomodoroData, collectTaskRecordData, aggregateByTime } from "@/services/chartDataService";
import { usePomoStore } from "./usePomoStore";
import { useTagStore } from "./useTagStore";
import { uploadAllDebounced } from "@/core/utils/autoSync"; 

export const useDataStore = defineStore(
  "data",
  () => {
    // ======================== 1. 核心状态 (State) ========================
    const activityList = ref<Activity[]>([]);
    const todoList = ref<Todo[]>([]);
    const scheduleList = ref<Schedule[]>([]);
    const taskList = ref<Task[]>([]);

    // ======================== 2. UI 状态 (State) ========================

    const pomoStore = usePomoStore();

    const dateService: any = unifiedDateService({
      activityList,
      scheduleList,
      todoList,
    });

    const activeId = ref<number | null | undefined>(null); // ActivitySheet 选中的 activity.id
    const selectedTaskId = ref<number | null>(null); // Planner 选中的 .taskId
    const selectedActivityId = ref<number | null>(null); // Planner 选中的 .activityId
    const selectedRowId = ref<number | null>(null); // todo.id 或 schedule.id
    const selectedDate = ref<number | null>(null); // todo.id 或 schedule.id

    // ======================== 3. 初始化/加载逻辑 (Actions) ========================
    const isDataLoaded = ref(false);

    // 在数据加载后重新计算标签计数
    function loadAllData() {
      if (isDataLoaded.value) {
        console.log("[DataStore] Data already loaded. Skipping.");
        return;
      }

      activityList.value = loadActivities();
      todoList.value = loadTodos();
      scheduleList.value = loadSchedules();
      taskList.value = loadTasks();

      // 加载标签
      tagStore.loadAllTags();

      // 重新计算标签计数（以防数据不一致）
      recalculateAllTagCounts();

      isDataLoaded.value = true;
    }

    // ======================== 4. 数据索引 (Getters / Computed) ========================
    const activityById = computed(() => new Map(activityList.value.map((a) => [a.id, a])));
    const todoById = computed(() => new Map(todoList.value.map((t) => [t.id, t])));
    const scheduleById = computed(() => new Map(scheduleList.value.map((s) => [s.id, s])));
    const taskById = computed(() => new Map(taskList.value.map((t) => [t.id, t])));

    const todoByActivityId = computed(() => {
      const map = new Map<number, Todo>();
      for (const todo of todoList.value) {
        if (todo.activityId != null) map.set(todo.activityId, todo);
      }
      return map;
    });

    const scheduleByActivityId = computed(() => {
      const map = new Map<number, Schedule>();
      for (const schedule of scheduleList.value) {
        if (schedule.activityId != null) map.set(schedule.activityId, schedule);
      }
      return map;
    });

    const childrenOfActivity = computed(() => {
      const map = new Map<number, Activity[]>();
      for (const activity of activityList.value) {
        if (activity.parentId == null) continue;
        if (!map.has(activity.parentId)) {
          map.set(activity.parentId, []);
        }
        map.get(activity.parentId)!.push(activity);
      }
      return map;
    });

    const tasksBySource = computed(() => {
      const bucket = {
        activity: new Map<number, Task[]>(),
        todo: new Map<number, Task[]>(),
        schedule: new Map<number, Task[]>(),
      };
      for (const task of taskList.value) {
        const targetMap = bucket[task.source];
        if (targetMap) {
          if (!targetMap.has(task.sourceId)) {
            targetMap.set(task.sourceId, []);
          }
          targetMap.get(task.sourceId)!.push(task);
        }
      }
      return bucket;
    });

    // ======================== 5. 派生UI状态 (Computed) ========================
    const selectedActivity = computed(() => {
      const id = activeId.value;
      if (id == null) return null;
      return activityById.value.get(id) ?? null;
    });

    const selectedTask = computed(() => {
      const id = selectedTaskId.value;
      if (id == null) return null;
      return taskById.value.get(id) ?? null;
    });

    const selectedTagIds = computed(() => {
      if (activeId.value != null) {
        return activityById.value.get(activeId.value)?.tagIds ?? null;
      }
      const rowId = selectedRowId.value;
      if (rowId == null) return null;

      const todo = todoById.value.get(rowId);
      if (todo?.activityId != null) {
        return activityById.value.get(todo.activityId)?.tagIds ?? null;
      }

      const schedule = scheduleById.value.get(rowId);
      if (schedule?.activityId != null) {
        return activityById.value.get(schedule.activityId)?.tagIds ?? null;
      }
      return null;
    });

    const todosForCurrentViewWithTaskRecords = computed<TodoWithTaskRecords[]>(() => {
      const { start, end } = dateService.visibleRange.value;
      if (!todoList.value) return [];
      const out: TodoWithTaskRecords[] = [];
      for (const todo of todoList.value) {
        if (todo.id < start || todo.id >= end) continue;
        const relatedTask = todo.taskId != null ? taskById.value.get(todo.taskId) : undefined;
        out.push({
          ...todo,
          energyRecords: relatedTask?.energyRecords ?? [],
          rewardRecords: relatedTask?.rewardRecords ?? [],
          interruptionRecords: relatedTask?.interruptionRecords ?? [],
        });
      }
      return out;
    });

    const todosForCurrentViewWithTags = computed<TodoWithTags[]>(() => {
      const { start, end } = dateService.visibleRange.value;
      if (!todoList.value) return [];
      const out: TodoWithTags[] = [];
      for (const todo of todoList.value) {
        if (todo.id < start || todo.id >= end) continue;
        const activity = todo.activityId != null ? activityById.value.get(todo.activityId) : undefined;
        out.push({
          ...todo,
          tagIds: activity?.tagIds ?? [],
        });
      }
      return out;
    });

    const schedulesForCurrentView = computed(() => {
      const { start, end } = dateService.visibleRange.value;
      if (!scheduleList.value) return [];
      return scheduleList.value.filter((schedule) => {
        const date = schedule.activityDueRange?.[0];
        if (date == null) return false;
        return date >= start && date < end;
      });
    });

    type ScheduleWithTags = Schedule & { tagIds?: number[] };
    const schedulesForCurrentViewWithTags = computed<ScheduleWithTags[]>(() => {
      const { start, end } = dateService.visibleRange.value;
      if (!scheduleList.value) return [];
      return scheduleList.value
        .filter((schedule) => {
          const date = schedule.activityDueRange?.[0];
          return date != null && date >= start && date < end;
        })
        .map((schedule) => {
          const activity = schedule.activityId != null ? activityById.value.get(schedule.activityId) : undefined;
          return {
            ...schedule,
            tagIds: activity?.tagIds ?? [],
          };
        });
    });

    const todosForAppDate = computed(() => {
      const startOfDay = dateService.appDateTimestamp.value;
      const endOfDay = addDays(startOfDay, 1);
      if (!todoList.value) return [];
      return todoList.value.filter((todo) => todo.id >= startOfDay && todo.id < endOfDay);
    });

    const schedulesForAppDate = computed(() => {
      const startOfDay = dateService.appDateTimestamp.value;
      const endOfDay = addDays(startOfDay, 1);
      if (!scheduleList.value) return [];
      return scheduleList.value.filter((schedule) => {
        const date = schedule.activityDueRange?.[0];
        if (date == null) return false;
        return date >= startOfDay && date < endOfDay;
      });
    });

    // ======================== 6. 方法 (Actions) ========================
    function hasStarredTaskForActivity(activityId: number): boolean {
      const tasksOfAct = tasksBySource.value.activity.get(activityId);
      if (tasksOfAct?.some((t) => t.starred)) return true;

      const relatedTodo = todoByActivityId.value.get(activityId);
      if (relatedTodo) {
        const tasksOfTodo = tasksBySource.value.todo.get(relatedTodo.id);
        if (tasksOfTodo?.some((t) => t.starred)) return true;
      }

      const relatedSchedule = scheduleByActivityId.value.get(activityId);
      if (relatedSchedule) {
        const tasksOfSch = tasksBySource.value.schedule.get(relatedSchedule.id);
        if (tasksOfSch?.some((t) => t.starred)) return true;
      }

      // 把activityId当todoId，看是否starred 防御
      const relatedBugTodo = todoById.value.get(activityId);
      if (relatedBugTodo) {
        const tasksOfTodo = tasksBySource.value.todo.get(relatedBugTodo.id);
        if (tasksOfTodo?.some((t) => t.starred)) return true;
      }

      // 把activityId当scheduleId，看是否starred 防御
      const relatedBugSchedule = scheduleById.value.get(activityId);
      if (relatedBugSchedule) {
        const tasksOfSch = tasksBySource.value.schedule.get(relatedBugSchedule.id);
        if (tasksOfSch?.some((t) => t.starred)) return true;
      }

      return false;
    }

    function cleanSelection() {
      selectedRowId.value = null;
      selectedActivityId.value = null;
    }

    const saveAllNow = () => {
      try {
        saveActivities(activityList.value);
        saveTodos(todoList.value);
        saveSchedules(scheduleList.value);
        saveTasks(taskList.value);
        uploadAllDebounced();
      } catch (e) {
        console.error("save failed", e);
      }
    };
    const saveAllDebounced = debounce(saveAllNow, 800);

    function addActivity(newActivity: Activity) {
      activityList.value.push(newActivity);
    }

    function setActiveId(id: number | null) {
      activeId.value = id;
    }

    function setSelectedDate(id: number | null) {
      selectedDate.value = id;
    }

    /**
     * 显式设置某个 Task 的 starred 值（布尔）
     * - 不写 undefined，保持“外部明确设为布尔”时的行为可控
     */
    function setTaskStar(taskId: number, next: boolean): void {
      const idx = taskList.value.findIndex((t) => t.id === taskId);
      if (idx === -1) return;
      // 只在值变化时写入，避免无谓的触发
      if (taskList.value[idx].starred !== next) {
        taskList.value[idx] = { ...taskList.value[idx], starred: next };
        saveTasks(taskList.value);
      }
    }

    /**
     * 切换某个 Task 的 starred 值，序列：undefined → true → false → true ...
     * - 说明：第一次点击如果是 undefined，则转为 true；
     *        再次点击 true → false；再次点击 false → true
     */
    function toggleTaskStar(taskId: number): void {
      const idx = taskList.value.findIndex((t) => t.id === taskId);
      if (idx === -1) return;

      const current = taskList.value[idx].starred; // boolean | undefined
      const next = current === true ? false : true; // undefined 或 false → true；true → false

      taskList.value[idx] = { ...taskList.value[idx], starred: next };
      saveTasks(taskList.value);
    }

    // ======================== Tag 关联操作 ========================
    const tagStore = useTagStore();
    /**
     * 为 Activity 添加标签
     */
    function addTagToActivity(activityId: number, tagId: number): boolean {
      const activity = activityById.value.get(activityId);
      if (!activity) return false;
      const oldTagIds = activity.tagIds ?? [];
      if (oldTagIds.includes(tagId)) return false;
      return setActivityTags(activityId, [...oldTagIds, tagId]);
    }

    function removeTagFromActivity(activityId: number, tagId: number): boolean {
      const activity = activityById.value.get(activityId);
      if (!activity?.tagIds) return false;
      if (!activity.tagIds.includes(tagId)) return false;
      return setActivityTags(
        activityId,
        activity.tagIds.filter((id) => id !== tagId)
      );
    }

    function setActivityTags(activityId: number, newTagIds: number[]) {
      const activity = activityById.value.get(activityId);
      if (!activity) return false;

      const oldTagIds = activity.tagIds || [];
      const toRemove = oldTagIds.filter((id) => !newTagIds.includes(id));
      const toAdd = newTagIds.filter((id) => !oldTagIds.includes(id));

      // 更新计数（统一通过 TagStore 的 updateTagCount）
      toRemove.forEach((id) => tagStore.updateTagCount(id, -1));
      toAdd.forEach((id) => tagStore.updateTagCount(id, +1));

      activity.tagIds = newTagIds.length > 0 ? newTagIds : undefined;
      saveActivities(activityList.value);
      return true;
    }

    /**
     * 切换 Activity 的标签
     */
    function toggleActivityTag(activityId: number, tagId: number): boolean {
      const activity = activityById.value.get(activityId);
      if (!activity) return false;

      const hasTag = activity.tagIds?.includes(tagId);

      if (hasTag) {
        removeTagFromActivity(activityId, tagId);
        return false;
      } else {
        addTagToActivity(activityId, tagId);
        return true;
      }
    }

    /**
     * 创建标签并添加到 Activity
     */

    function createAndAddTagToActivity(activityId: number, tagName: string, color?: string, backgroundColor?: string): Tag | null {
      const safeColor = color ?? "#000000";
      const safeBg = backgroundColor ?? "#eee";

      const tag = tagStore.addTag(tagName, safeColor, safeBg);
      if (!tag) return null;

      const ok = addTagToActivity(activityId, tag.id);
      if (!ok) {
        // 可选回滚：避免产生“孤儿标签”
        // tagStore.removeTag(tag.id);
        return null;
      }
      return tag;
    }

    /**
     * 获取 Activity 的所有标签
     */
    function getActivityTags(activityId: number): Tag[] {
      const activity = activityById.value.get(activityId);
      if (!activity?.tagIds) return [];
      return tagStore.getTagsByIds(activity.tagIds);
    }

    /**
     * 重新计算所有标签的引用计数
     */
    function recalculateAllTagCounts() {
      const countMap = new Map<number, number>();
      activityList.value.forEach((activity) => {
        activity.tagIds?.forEach((tagId) => {
          countMap.set(tagId, (countMap.get(tagId) || 0) + 1);
        });
      });
      tagStore.recalculateTagCounts(countMap);
    }
    // ============ 7. 时间序列数据提取 ============
    const allDataPoints = computed((): DataPoint[] => {
      return [...collectPomodoroData(todoList.value), ...collectTaskRecordData(taskList.value)];
    });

    const dataByMetric = computed((): Map<MetricName, DataPoint[]> => {
      const grouped = new Map<MetricName, DataPoint[]>();

      allDataPoints.value.forEach((point) => {
        if (!grouped.has(point.metric)) {
          grouped.set(point.metric, []);
        }
        grouped.get(point.metric)!.push(point);
      });

      return grouped;
    });

    /**
     * 获取指定指标的聚合数据
     * @param metric 指标名称
     * @param timeGranularity 时间粒度（day/week/month）
     * @param aggregationType 聚合方式（sum/avg/count）
     */
    function getAggregatedData(
      metric: MetricName,
      timeGranularity: TimeGranularity = "day",
      aggregationType: AggregationType = "sum"
    ): Map<string, number> {
      const dataPoints = dataByMetric.value.get(metric) || [];
      return aggregateByTime(dataPoints, timeGranularity, aggregationType);
    }

    /**
     * 获取指定日期范围的数据
     */
    function getDataInRange(metric: MetricName, startTime: number, endTime: number): DataPoint[] {
      const dataPoints = dataByMetric.value.get(metric) || [];
      return dataPoints.filter((point) => point.timestamp >= startTime && point.timestamp <= endTime);
    }
    // ======================== 8. 监控 (Watches) ========================
    watch(
      todosForAppDate,
      (currentTodos) => {
        const dateKey = dateService.appDateKey.value;
        pomoStore.setTodosForDate(dateKey, currentTodos);
      },
      { deep: true, immediate: true }
    );

    watch(
      [activityList, todoList, scheduleList, taskList],
      () => {
        saveAllDebounced();
      },
      { deep: true }
    );

    watch(
      activityList,
      (newVal) => {
        newVal.forEach((activity) => {
          const relatedSchedule = scheduleByActivityId.value.get(activity.id);
          if (relatedSchedule) {
            relatedSchedule.activityTitle = activity.title;
            relatedSchedule.activityDueRange = activity.dueRange ? [activity.dueRange[0], activity.dueRange[1]] : [null, "0"];
            relatedSchedule.status = activity.status || "";
            relatedSchedule.location = activity.location || "";
            relatedSchedule.taskId = activity.taskId;
          }
          const relatedTodo = todoByActivityId.value.get(activity.id);
          if (relatedTodo) {
            relatedTodo.activityTitle = activity.title;
            if (activity.pomoType === "🍒") {
              relatedTodo.estPomo = [4];
            } else {
              if (!relatedTodo.estPomo || relatedTodo.estPomo.length === 0) {
                relatedTodo.estPomo = activity.estPomoI ? [parseInt(activity.estPomoI)] : [];
              }
              if (!activity.estPomoI) relatedTodo.estPomo = undefined;
              if (activity.estPomoI && relatedTodo.estPomo) {
                relatedTodo.estPomo[0] = parseInt(activity.estPomoI);
              }
            }
            relatedTodo.status = activity.status || "";
            relatedTodo.pomoType = activity.pomoType;
            if (activity.dueDate) relatedTodo.dueDate = activity.dueDate;
          }
        });
      },
      { deep: true }
    );

    watch(
      () => activityList.value.map((a) => a.dueRange && a.dueRange[0]),
      () => {
        const now = Date.now();
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
        const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

        activityList.value.forEach((activity) => {
          if (!activity.dueRange || !activity.dueRange[0]) return;
          if (activity.status === "done") return;
          const dueMs = typeof activity.dueRange[0] === "string" ? Date.parse(activity.dueRange[0]) : Number(activity.dueRange[0]);

          if (dueMs >= startOfDay && dueMs <= endOfDay) {
            activity.status = "ongoing";
          } else if (dueMs < now && activity.status != "cancelled") {
            activity.status = "delayed";
          } else {
            if (activity.status != "cancelled") activity.status = "";
          }
        });
      }
    );

    // ======================== 8. 暴露接口 ========================
    return {
      // 核心状态
      activityList,
      todoList,
      scheduleList,
      taskList,

      // 索引
      activityById,
      todoById,
      scheduleById,
      taskById,
      todoByActivityId,
      scheduleByActivityId,
      childrenOfActivity,
      tasksBySource,

      // UI 状态
      activeId,
      selectedTaskId,
      selectedActivityId,
      selectedRowId,
      selectedDate,

      // 派生UI状态
      selectedActivity,
      selectedTask,
      selectedTagIds,
      todosForCurrentViewWithTags,
      schedulesForCurrentViewWithTags,
      schedulesForAppDate,
      todosForAppDate,
      schedulesForCurrentView,
      todosForCurrentViewWithTaskRecords,

      dateService,

      // 方法
      saveAllDebounced,
      loadAllData,
      hasStarredTaskForActivity,
      cleanSelection,
      addActivity,
      setActiveId,
      setSelectedDate,
      setTaskStar,
      toggleTaskStar,

      // Tag 相关操作
      addTagToActivity,
      removeTagFromActivity,
      setActivityTags,
      toggleActivityTag,
      createAndAddTagToActivity,
      getActivityTags,
      recalculateAllTagCounts,

      // Chart 相关
      allDataPoints,
      dataByMetric,
      getAggregatedData,
      getDataInRange,
    };
  },
  {
    // ======================== 9. 精细化持久化配置（v3 语法） ========================
    persist: {
      key: "data-store-ui-state",
      pick: ["activeId", "selectedTaskId", "selectedActivityId", "selectedRowId", "selectedDate"],
    },
  }
);
