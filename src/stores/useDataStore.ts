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
import { addDays, debounce } from "@/core/utils";
import type { Todo, TodoWithTags, TodoWithTaskRecords } from "@/core/types/Todo";
import { unifiedDateService } from "@/services/unifiedDateService";
import { usePomoStore } from "./usePomoStore";

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

    // ======================== 3. 初始化/加载逻辑 (Actions) ========================
    const isDataLoaded = ref(false);

    function loadAllData() {
      if (isDataLoaded.value) {
        console.log("[DataStore] Data already loaded. Skipping.");
        return;
      }
      console.time("[DataStore] loadAllData");
      activityList.value = loadActivities();
      todoList.value = loadTodos();
      scheduleList.value = loadSchedules();
      taskList.value = loadTasks();
      isDataLoaded.value = true;
      console.timeEnd("[DataStore] loadAllData");
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
      console.log(`[DataStore] Active ID set to: ${id}`);
    }

    // ======================== 7. 监控 (Watches) ========================
    watch(
      todosForAppDate,
      (currentTodos) => {
        const dateKey = dateService.appDateKey.value;
        pomoStore.setTodosForDate(dateKey, currentTodos);
      },
      { deep: true, immediate: true }
    );

    watch(
      () => dateService.appDateTimestamp.value,
      () => {
        console.log(`[HomeView] App date changed, activity selection cleared.`);
      },
      { deep: true }
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

      // 派生UI状态
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
    };
  },
  {
    // ======================== 9. 精细化持久化配置（v3 语法） ========================
    persist: {
      key: "data-store-ui-state",
      pick: ["activeId", "selectedTaskId", "selectedActivityId", "selectedRowId"],
    },
  }
);
