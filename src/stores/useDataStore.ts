// src/stores/useDataStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";

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

export const useDataStore = defineStore("data", () => {
  // ======================== 1. 核心状态 (State) ========================
  // 从各个组件中抽离出来的原始数据
  const activityList = ref<Activity[]>([]);
  const todoList = ref<Todo[]>([]);
  const scheduleList = ref<Schedule[]>([]);
  const taskList = ref<Task[]>([]);

  // 从 HomeView 迁移过来的 UI 状态
  const activeId = ref<number | null | undefined>(null); // ActivitySheet 选中的 activity.id
  const selectedTaskId = ref<number | null>(null); // Planner 选中的 .taskId
  const selectedActivityId = ref<number | null>(null); // Planner 选中的 .activityId
  const selectedRowId = ref<number | null>(null); // todo.id 或 schedule.id
  const pomoStore = usePomoStore();
  const dateService = unifiedDateService({
    activityList,
    scheduleList,
    todoList,
  });
  // ======================== 2. 初始化/加载逻辑 (Actions) ========================
  // 创建一个集中的加载函数，只在需要时执行一次
  const isDataLoaded = ref(false);

  function loadAllData() {
    // 防止重复加载
    if (isDataLoaded.value) {
      console.log("[DataStore] Data already loaded. Skipping.");
      return;
    }
    console.time("[DataStore] loadAllData");
    activityList.value = loadActivities();
    todoList.value = loadTodos();
    scheduleList.value = loadSchedules();
    taskList.value = loadTasks(); // 一次性加载所有数据
    isDataLoaded.value = true;
    console.timeEnd("[DataStore] loadAllData");
  }

  // ======================== 3. 数据索引 (Getters / Computed) ========================
  // 基础索引：通过 ID 快速查找各项数据
  const activityById = computed(() => new Map(activityList.value.map((a) => [a.id, a])));
  const todoById = computed(() => new Map(todoList.value.map((t) => [t.id, t])));
  const scheduleById = computed(() => new Map(scheduleList.value.map((s) => [s.id, s])));
  const taskById = computed(() => new Map(taskList.value.map((t) => [t.id, t])));

  // 关系索引：通过关联 ID 查找
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

  // 父子关系索引：通过父ID查找所有子活动
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

  // 任务索引：按来源 ('activity', 'todo', 'schedule') 和 sourceId 分类
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

  // ======================== 4. 派生UI状态 (Computed) ========================
  // 派生当前选中的 Task 完整对象
  const selectedTask = computed(() => {
    const id = selectedTaskId.value;
    if (id == null) return null;
    return taskById.value.get(id) ?? null;
  });

  // 派生当前选中项 (Activity/Todo/Schedule) 关联的 Tag ID 列表
  const selectedTagIds = computed(() => {
    // 优先使用 activeId (来自 ActivitySheet 的直接选择)
    if (activeId.value != null) {
      return activityById.value.get(activeId.value)?.tagIds ?? null;
    }

    // 其次使用 selectedRowId (来自 Planner 的行选择)
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
  // 计算筛选当前视图范围内的 schedule
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

  // 计算筛选的todo
  const todosForAppDate = computed(() => {
    const startOfDay = dateService.appDateTimestamp.value;
    const endOfDay = addDays(startOfDay, 1);

    if (!todoList.value) return [];
    return todoList.value.filter((todo) => todo.id >= startOfDay && todo.id < endOfDay);
  });

  // 计算筛选的schedule
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

  // ======================== 5. 方法 (Actions) ========================

  // 检查一个 Activity 及其关联的 Todo/Schedule 是否有已加星的任务
  function hasStarredTaskForActivity(activityId: number): boolean {
    // 检查直接从 Activity 创建的任务
    const tasksOfAct = tasksBySource.value.activity.get(activityId);
    if (tasksOfAct?.some((t) => t.starred)) return true;

    // 检查关联的 Todo 创建的任务
    const relatedTodo = todoByActivityId.value.get(activityId);
    if (relatedTodo) {
      const tasksOfTodo = tasksBySource.value.todo.get(relatedTodo.id);
      if (tasksOfTodo?.some((t) => t.starred)) return true;
    }

    // 检查关联的 Schedule 创建的任务
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

  /** 自动保存数据 */
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
  // ======================== 6. 监控 (Watchs) ========================

  /**
   * 监听【经过筛选后】的当天 todo 列表的变化。
   * 当这个列表本身、或者其中任何 todo 的 realPomo 属性变化时，
   * 就更新 Pomo Store 中对应日期的数据。
   */
  watch(
    todosForAppDate,
    (currentTodos) => {
      const dateKey = dateService.appDateKey.value;
      pomoStore.setTodosForDate(dateKey, currentTodos);
      // console.log(`[HomeView] Pomo store updated for date: ${dateKey}`);
    },
    { deep: true, immediate: true } // immediate 确保初始化时执行一次
  );

  /**
   * 监听 appDate 的变化，用于处理需要清空选中状态等副作用。
   */
  watch(
    () => dateService.appDateTimestamp.value, // 监听时间戳更可靠
    () => {
      selectedRowId.value = null;
      selectedActivityId.value = null;
      // ... 清理其他选中状态 ...
      console.log(`[HomeView] App date changed, activity selection cleared.`);
    }
  );

  watch(
    [activityList, todoList, scheduleList, taskList],
    () => {
      saveAllDebounced();
    },
    { deep: true }
  );

  /** Activity 活动变化时联动 Todo/Schedule 属性同步 */
  watch(
    activityList,
    (newVal) => {
      newVal.forEach((activity) => {
        // 同步Schedule
        const relatedSchedule = scheduleByActivityId.value.get(activity.id);
        if (relatedSchedule) {
          relatedSchedule.activityTitle = activity.title;
          relatedSchedule.activityDueRange = activity.dueRange ? [activity.dueRange[0], activity.dueRange[1]] : [null, "0"];
          relatedSchedule.status = activity.status || "";
          relatedSchedule.location = activity.location || "";
          relatedSchedule.taskId = activity.taskId;
        }
        // 同步Todo
        const relatedTodo = todoByActivityId.value.get(activity.id);
        if (relatedTodo) {
          relatedTodo.activityTitle = activity.title;
          if (activity.pomoType === "🍒") {
            // 只要变成樱桃，无条件重置为4个番茄
            relatedTodo.estPomo = [4];
          } else {
            // 非樱桃类型时，才考虑 estPomoI
            if (!relatedTodo.estPomo || relatedTodo.estPomo.length === 0) {
              // 没有estPomo则按estPomoI初始化
              relatedTodo.estPomo = activity.estPomoI ? [parseInt(activity.estPomoI)] : [];
            }
            if (!activity.estPomoI) relatedTodo.estPomo = undefined;
            // 只要有estPomoI，覆盖第一个元素
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

  /** 活动due范围变化时仅更新状态 */
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

        // 只更新活动状态
        if (dueMs >= startOfDay && dueMs <= endOfDay) {
          // 截止日期是今天
          activity.status = "ongoing";
        } else if (dueMs < now && activity.status != "cancelled") {
          // 截止日期已过
          activity.status = "delayed";
        } else {
          // 截止日期还未到
          if (activity.status != "cancelled") activity.status = "";
        }
      });
    }
  );
  // ======================== 5. 暴露接口 ========================
  return {
    // ======================== 核心状态 (State) ========================
    activityList,
    todoList,
    scheduleList,
    taskList,

    // ======================== UI 状态 (State) ========================
    activeId,
    selectedTaskId,
    selectedActivityId,
    selectedRowId,

    // ======================== 索引 (Getters/Computed) ========================
    activityById,
    todoById,
    scheduleById,
    taskById,
    todoByActivityId,
    scheduleByActivityId,
    childrenOfActivity,
    tasksBySource,

    // ======================== 派生UI状态 (Getters/Computed) ========================
    selectedTask,
    selectedTagIds,
    todosForCurrentViewWithTags,
    schedulesForCurrentViewWithTags,
    schedulesForAppDate,
    todosForAppDate,
    schedulesForCurrentView,
    todosForCurrentViewWithTaskRecords,

    // ======================== 方法 (Actions) ========================
    saveAllDebounced,
    loadAllData,
    hasStarredTaskForActivity,
    cleanSelection,
    addActivity,
    setActiveId,
  };
});
