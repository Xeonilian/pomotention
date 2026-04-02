// src/stores/useDataStore.ts
import { defineStore } from "pinia";
import { ref, computed, watch, nextTick } from "vue";

import type { Activity } from "@/core/types/Activity";
import type { Todo, TodoWithTags, TodoWithTaskRecords } from "@/core/types/Todo";
import type { Schedule, ScheduleWithTaskRecords } from "@/core/types/Schedule";
import type { Task } from "@/core/types/Task";
import type { Tag } from "@/core/types/Tag";
import type { DataPoint, MetricName, AggregationType, TimeGranularity } from "@/core/types/Chart";

import { addDays, debounce, scheduleDebouncedCloudUpload } from "@/core/utils";

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

import { unifiedDateService } from "@/services/unifiedDateService";
import { collectPomodoroData, collectTaskRecordData, aggregateByTime } from "@/services/chartDataService";
import { useTagStore } from "./useTagStore";
import { useTemplateStore } from "./useTemplateStore";
import { useDisplayedTaskStore } from "./useDisplayedTaskStore";

export const useDataStore = defineStore(
  "data",
  () => {
    const tagStore = useTagStore();
    const templateStore = useTemplateStore();

    // ======================== 1. 核心状态 (State) ========================
    const activityList = ref<Activity[]>([]);
    const todoList = ref<Todo[]>([]);
    const scheduleList = ref<Schedule[]>([]);
    const taskList = ref<Task[]>([]);

    // ======================== 2. UI 状态 (State) ========================

    const dateService: any = unifiedDateService({
      activityList,
      scheduleList,
      todoList,
    });

    const displayStore = useDisplayedTaskStore();

    const activeId = ref<number | null | undefined>(null); // ActivitySheet 选中的 activity.id
    const selectedTaskId = ref<number | null>(null); // Planner 选中的 .taskId
    // 当前展示的 task 由 useDisplayedTaskStore 管理，此处只做只读引用供 Tracker 等使用
    const displayedTaskId = computed<number | null>(() => displayStore.displayedTaskId);
    const selectedActivityId = ref<number | null>(null); // Planner 选中的 .activityId
    const selectedRowId = ref<number | null>(null); // todo.id 或 schedule.id
    const selectedDate = ref<number | null>(null); // todo.id 或 schedule.id
    const filterTagIds = ref<number[]>([]); // day/week/month tag filter (AND)

    // ======================== 3. 初始化/加载逻辑 (Actions) ========================
    const isDataLoaded = ref(false);

    function clearData() {
      activityList.value.length = 0;
      todoList.value.length = 0;
      scheduleList.value.length = 0;
      taskList.value.length = 0;

      tagStore.clearData();
      templateStore.clearData();
      isDataLoaded.value = false;
    }

    // 在数据加载后重新计算标签计数
    async function loadAllData() {
      if (isDataLoaded.value) {
        console.log("[DataStore] Data already loaded. Skipping.");
        return;
      }

      activityList.value = loadActivities();
      todoList.value = loadTodos();
      scheduleList.value = loadSchedules();
      taskList.value = loadTasks();

      isDataLoaded.value = true;
    }
    const activeActivities = computed(() => activityList.value.filter((a) => !a.deleted));
    const activeTodos = computed(() => todoList.value.filter((t) => !t.deleted));
    const activeSchedules = computed(() => scheduleList.value.filter((s) => !s.deleted));
    const activeTasks = computed(() => taskList.value.filter((t) => !t.deleted));

    // ======================== 未同步数据汇总 (Computed) ========================
    const hasUnsyncedData = computed(() => {
      return (
        activityList.value.some((item) => !item.synced) ||
        todoList.value.some((item) => !item.synced) ||
        scheduleList.value.some((item) => !item.synced) ||
        taskList.value.some((item) => !item.synced) ||
        tagStore.rawTags?.some((item) => !item.synced) ||
        templateStore.rawTemplates?.some((item) => !item.synced)
      );
    });

    const unsyncedDataSummary = computed(() => {
      return {
        activities: activityList.value.filter((item) => !item.synced).length,
        todos: todoList.value.filter((item) => !item.synced).length,
        schedules: scheduleList.value.filter((item) => !item.synced).length,
        tasks: taskList.value.filter((item) => !item.synced).length,
        tags: tagStore.rawTags?.filter((item) => !item.synced).length ?? 0,
        templates: templateStore.rawTemplates?.filter((item) => !item.synced).length ?? 0,
      };
    });

    // ======================== 4. 数据索引 (Getters / Computed) ========================
    const _activityById = new Map<number, Activity>();
    const _todoById = new Map<number, Todo>();
    const _scheduleById = new Map<number, Schedule>();
    const _taskById = new Map<number, Task>();

    watch(
      activityList,
      (list) => {
        _activityById.clear();
        for (const a of list) {
          _activityById.set(a.id, a);
        }
      },
      { deep: true },
    );

    watch(
      todoList,
      (list) => {
        _todoById.clear();
        for (const t of list) {
          _todoById.set(t.id, t);
        }
      },
      { deep: true },
    );

    watch(
      scheduleList,
      (list) => {
        _scheduleById.clear();
        for (const s of list) {
          _scheduleById.set(s.id, s);
        }
      },
      { deep: true },
    );

    watch(
      taskList,
      (list) => {
        _taskById.clear();
        for (const t of list) {
          _taskById.set(t.id, t);
        }
      },
      { deep: true },
    );
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

    const taskByActivityId = computed(() => {
      const map = new Map<number, Task>();
      for (const task of taskList.value) {
        if (task.sourceId != null) map.set(task.sourceId, task);
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
        const targetMap = bucket[task.source ?? "activity"];
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

    const isSelectedRowDone = computed(() => {
      const rowId = selectedRowId.value;
      if (rowId == null) return false;
      const todo = todoById.value.get(rowId);
      if (todo) {
        return todo.status === "done" ? true : false;
      } else {
        const schedule = scheduleById.value.get(rowId);
        if (schedule == null) return false;
        return schedule.status === "done" ? true : false;
      }
      return false;
    });

    const selectedRowHasParent = computed(() => {
      const rowId = selectedRowId.value;
      if (rowId == null) return null;
      const todo = todoById.value.get(rowId);
      if (todo) {
        const activity = activityById.value.get(todo.activityId);
        if (activity == null) return null;
        return activity.parentId;
      }
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

    const matchesTagFilter = (activityTagIds?: number[] | null): boolean => {
      if (!filterTagIds.value || filterTagIds.value.length === 0) return true;
      const tags = activityTagIds ?? [];
      return filterTagIds.value.every((filterId) => tags.includes(filterId));
    };

    const todosForCurrentViewWithTaskRecords = computed<TodoWithTaskRecords[]>(() => {
      const { start, end } = dateService.visibleRange.value;
      if (!todoList.value) return [];
      const out: TodoWithTaskRecords[] = [];
      for (const todo of todoList.value) {
        if (todo.deleted) continue;
        if (todo.id < start || todo.id >= end) continue;
        const activity = todo.activityId != null ? activityById.value.get(todo.activityId) : undefined;
        if (!matchesTagFilter(activity?.tagIds)) continue;
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
        if (todo.deleted) continue;
        if (todo.id < start || todo.id >= end) continue;
        const activity = todo.activityId != null ? activityById.value.get(todo.activityId) : undefined;
        if (!matchesTagFilter(activity?.tagIds)) continue;
        out.push({
          ...todo,
          tagIds: activity?.tagIds ?? [],
        });
      }
      return out;
    });

    const schedulesForCurrentView = computed<ScheduleWithTaskRecords[]>(() => {
      const { start, end } = dateService.visibleRange.value;
      if (!scheduleList.value) return [];
      const out: ScheduleWithTaskRecords[] = [];
      for (const schedule of activeSchedules.value) {
        const date = schedule.activityDueRange?.[0];
        if (date == null) continue;
        if (date < start || date >= end) continue;
        const relatedTask = schedule.taskId != null ? taskById.value.get(schedule.taskId) : undefined;
        out.push({
          ...schedule,
          energyRecords: relatedTask?.energyRecords ?? [],
          rewardRecords: relatedTask?.rewardRecords ?? [],
          interruptionRecords: relatedTask?.interruptionRecords ?? [],
        });
      }
      return out;
    });

    type ScheduleWithTags = Schedule & { tagIds?: number[] };
    const schedulesForCurrentViewWithTags = computed<ScheduleWithTags[]>(() => {
      const { start, end } = dateService.visibleRange.value;
      if (!scheduleList.value) return [];
      return activeSchedules.value
        .filter((schedule) => {
          const date = schedule.activityDueRange?.[0];
          if (date == null || date < start || date >= end) return false;
          const activity = schedule.activityId != null ? activityById.value.get(schedule.activityId) : undefined;
          return matchesTagFilter(activity?.tagIds);
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
      return activeTodos.value.filter((todo) => todo.id >= startOfDay && todo.id < endOfDay);
    });

    const schedulesForAppDate = computed(() => {
      const startOfDay = dateService.appDateTimestamp.value;
      const endOfDay = addDays(startOfDay, 1);
      if (!scheduleList.value) return [];
      return activeSchedules.value.filter((schedule) => {
        const date = schedule.activityDueRange?.[0];
        if (date == null) return false;
        return date >= startOfDay && date < endOfDay;
      });
    });

    // 选出当日用于 Year 视图联动选中的 taskId：
    // - 有 tag 筛选时：仅在匹配筛选标签的候选里，按时间最早优先
    // - 无 tag 筛选时：按“优先级优先 + 时间最早”
    const firstTaggedTaskIdForAppDate = computed<number | null>(() => {
      const startOfDay = dateService.appDateTimestamp.value;
      const endOfDay = addDays(startOfDay, 1);
      const hasTagFilter = !!(filterTagIds.value && filterTagIds.value.length > 0);

      const candidates: Array<{ ts: number; priority: number; activityTagIds: number[]; taskId: number | null }> = [];

      for (const t of activeTodos.value) {
        const ts = pickTodoTsForDay(t);
        if (ts == null || ts < startOfDay || ts >= endOfDay) continue;
        const activity = t.activityId != null ? activityById.value.get(t.activityId) : undefined;
        const activityTagIds = activity?.tagIds ?? [];
        if (!activityTagIds.length) continue;
        if (hasTagFilter && !matchesTagFilter(activityTagIds)) continue;
        candidates.push({
          ts,
          priority: t.priority ?? 0,
          activityTagIds,
          taskId: t.taskId ?? activity?.taskId ?? null,
        });
      }

      for (const s of activeSchedules.value) {
        const ts = pickScheduleTsForDay(s);
        if (ts == null || ts < startOfDay || ts >= endOfDay) continue;
        const activity = s.activityId != null ? activityById.value.get(s.activityId) : undefined;
        const activityTagIds = activity?.tagIds ?? [];
        if (!activityTagIds.length) continue;
        if (hasTagFilter && !matchesTagFilter(activityTagIds)) continue;
        candidates.push({
          ts,
          priority: 0,
          activityTagIds,
          taskId: s.taskId ?? activity?.taskId ?? null,
        });
      }

      if (candidates.length === 0) return null;

      candidates.sort((a, b) => {
        if (hasTagFilter) {
          return a.ts - b.ts;
        }
        const pa = a.priority ?? 0;
        const pb = b.priority ?? 0;
        const hasPa = pa > 0;
        const hasPb = pb > 0;
        if (hasPa !== hasPb) {
          return hasPa ? -1 : 1;
        }
        if (pa !== pb) {
          return pa - pb;
        }
        return a.ts - b.ts;
      });

      const first = candidates[0];
      return first.taskId ?? null;
    });

    // 年视图：每天一个点，颜色为当日 Priority1 Todo 的 tag 色（用于 YearPlanner）
    const DAY_MS = 24 * 60 * 60 * 1000;
    const pickTodoTsForDay = (t: Todo): number | null => t.id ?? t.dueDate ?? t.startTime ?? null;
    const pickScheduleTsForDay = (s: Schedule): number | null => s.activityDueRange?.[0] ?? s.id ?? null;

    const yearDayDots = computed<{ dayStartTs: number; tagColor: string | null; textColor: string | null }[]>(() => {
      const start = dateService.yearStartTs.value;
      const y = new Date(start).getFullYear();
      const end = new Date(y + 1, 0, 1).getTime();
      const numDays = Math.round((end - start) / DAY_MS);
      const out: { dayStartTs: number; tagColor: string | null; textColor: string | null }[] = [];
      for (let i = 0; i < numDays; i++) {
        const dayStartTs = start + i * DAY_MS;
        const dayEnd = dayStartTs + DAY_MS;
        // 有标签筛选时：把匹配到的日期 dot 统一渲染为筛选标签色
        if (filterTagIds.value && filterTagIds.value.length > 0) {
          // 找到“这一天里，真正包含筛选标签”的任意一个 activity（todo/schedule 都算）
          // 取第一个命中的 tag 来着色（同一天多个命中时按时间最早者优先）
          const candidates: Array<{ ts: number; activityTagIds: number[] }> = [];

          for (const t of activeTodos.value) {
            const ts = pickTodoTsForDay(t);
            if (ts == null || ts < dayStartTs || ts >= dayEnd) continue;
            const activity = t.activityId != null ? activityById.value.get(t.activityId) : undefined;
            if (!matchesTagFilter(activity?.tagIds)) continue;
            candidates.push({ ts, activityTagIds: activity?.tagIds ?? [] });
          }

          for (const s of activeSchedules.value) {
            const ts = pickScheduleTsForDay(s);
            if (ts == null || ts < dayStartTs || ts >= dayEnd) continue;
            const activity = s.activityId != null ? activityById.value.get(s.activityId) : undefined;
            if (!matchesTagFilter(activity?.tagIds)) continue;
            candidates.push({ ts, activityTagIds: activity?.tagIds ?? [] });
          }

          if (candidates.length === 0) {
            out.push({ dayStartTs, tagColor: null, textColor: null, });
            continue;
          }

          candidates.sort((a, b) => a.ts - b.ts);
          const activityTagIds = candidates[0].activityTagIds ?? [];
          const displayTagId = activityTagIds.find((id) => filterTagIds.value.includes(id)) ?? filterTagIds.value[0];
          const tag = displayTagId != null ? tagStore.getTag(displayTagId) : undefined;

          out.push({ dayStartTs, tagColor: tag?.backgroundColor ?? tag?.color ?? null, textColor: tag?.color ?? null });
          continue;
        }

        // 无标签筛选时：选择当日的第一条事项（优先级优先，其次时间最早）作为 dot 的 tag 颜色
        const candidates: Array<{ ts: number; priority: number; activityTagIds: number[] }> = [];

        for (const t of activeTodos.value) {
          const ts = pickTodoTsForDay(t);
          if (ts == null || ts < dayStartTs || ts >= dayEnd) continue;
          const activity = t.activityId != null ? activityById.value.get(t.activityId) : undefined;
          const activityTagIds = activity?.tagIds ?? [];
          if (!activityTagIds.length) continue;
          candidates.push({
            ts,
            priority: t.priority ?? 0,
            activityTagIds,
          });
        }

        for (const s of activeSchedules.value) {
          const ts = pickScheduleTsForDay(s);
          if (ts == null || ts < dayStartTs || ts >= dayEnd) continue;
          const activity = s.activityId != null ? activityById.value.get(s.activityId) : undefined;
          const activityTagIds = activity?.tagIds ?? [];
          if (!activityTagIds.length) continue;
          // 日程本身没有优先级，视为 0，排在有优先级的 todo 后面、无优先级 todo 之前或之后可按需要调整
          candidates.push({
            ts,
            priority: 0,
            activityTagIds,
          });
        }

        if (candidates.length === 0) {
          out.push({ dayStartTs, tagColor: null, textColor: null });
          continue;
        }

        candidates.sort((a, b) => {
          const pa = a.priority ?? 0;
          const pb = b.priority ?? 0;
          const hasPa = pa > 0;
          const hasPb = pb > 0;
          if (hasPa !== hasPb) {
            return hasPa ? -1 : 1;
          }
          if (pa !== pb) {
            return pa - pb;
          }
          return a.ts - b.ts;
        });

        const first = candidates[0];
        const displayTagId = first.activityTagIds[0];
        const tag = displayTagId != null ? tagStore.getTag(displayTagId) : undefined;
        out.push({
          dayStartTs,
          tagColor: tag?.backgroundColor ?? tag?.color ?? null,
          textColor: tag?.color ?? null,
        });
      }
      return out;
    });

    // ======================== 6. 方法 (Actions) ========================
    function toggleFilterTagId(tagId: number) {
      const index = filterTagIds.value.indexOf(tagId);
      if (index >= 0) {
        filterTagIds.value.splice(index, 1);
      } else {
        filterTagIds.value.push(tagId);
      }
    }

    function removeFilterTagId(tagId: number) {
      const index = filterTagIds.value.indexOf(tagId);
      if (index >= 0) filterTagIds.value.splice(index, 1);
    }

    function clearFilterTags() {
      filterTagIds.value = [];
    }

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
        scheduleDebouncedCloudUpload();
      } catch (e) {
        console.error("save failed", e);
      }
    };

    const saveAllDebounced = debounce(saveAllNow, 800);

    const saveAllAfterSync = () => {
      try {
        saveActivities(activityList.value);
        saveTodos(todoList.value);
        saveSchedules(scheduleList.value);
        saveTasks(taskList.value);
        tagStore.saveTags(tagStore.rawTags);
        templateStore.saveTemplates(templateStore.rawTemplates);

        // console.log("💾 [DataStore] saveAllNow 完成");
      } catch (e) {
        console.error("save failed", e);
      }
    };

    function addActivity(newActivity: Activity) {
      activityList.value.push(newActivity);
      saveActivities(activityList.value);
      scheduleDebouncedCloudUpload();
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
        scheduleDebouncedCloudUpload();
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
      scheduleDebouncedCloudUpload();
    }

    /**
     * 基于Id更新Activity数据的指定字段
     */
    function updateActivityById(id: number, updates: Partial<Activity>) {
      const activityIndex = activityList.value.findIndex((a) => a.id === id);
      if (activityIndex !== -1) {
        activityList.value[activityIndex] = { ...activityList.value[activityIndex], ...updates };
        saveActivities(activityList.value);
        scheduleDebouncedCloudUpload();
      } else {
        console.error("Activity not found:", id);
      }
    }

    /**
     * 基于Id更新Schedule数据的指定字段
     */
    function updateScheduleById(id: number, updates: Partial<Schedule>) {
      const scheduleIndex = scheduleList.value.findIndex((s) => s.id === id);
      if (scheduleIndex !== -1) {
        scheduleList.value[scheduleIndex] = { ...scheduleList.value[scheduleIndex], ...updates };
        saveSchedules(scheduleList.value);
        scheduleDebouncedCloudUpload();
      } else {
        console.error("Schedule not found:", id);
      }
    }

    /**
     * 基于Id更新Task数据的指定字段
     */
    function updateTaskById(id: number, updates: Partial<Task>) {
      const taskIndex = taskList.value.findIndex((t) => t.id === id);
      if (taskIndex !== -1) {
        taskList.value[taskIndex] = { ...taskList.value[taskIndex], ...updates };
        saveTasks(taskList.value);
        scheduleDebouncedCloudUpload();
      } else {
        console.error("Task not found:", id);
      }
    }

    /**
     * 基于Id更新Todo数据的指定字段
     */
    function updateTodoById(id: number, updates: Partial<Todo>) {
      const todoIndex = todoList.value.findIndex((t) => t.id === id);
      if (todoIndex !== -1) {
        todoList.value[todoIndex] = { ...todoList.value[todoIndex], ...updates };
        saveTodos(todoList.value);
        scheduleDebouncedCloudUpload();
      } else {
        console.error("Todo not found:", id);
      }
    }

    // ======================== Tag 关联操作 ========================
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
        activity.tagIds.filter((id) => id !== tagId),
      );
    }

    function setActivityTags(activityId: number, newTagIds: number[]) {
      const activity = activityById.value.get(activityId);
      if (!activity) return false;

      activity.tagIds = newTagIds.length > 0 ? newTagIds : undefined;
      activity.lastModified = Date.now();
      activity.synced = false;

      saveActivities(activityList.value);
      scheduleDebouncedCloudUpload();

      // 标签被实际应用到 Activity 时，更新本地 tag 的 lastUsed（不单独 saveTags；activity 已标记 unsynced 并由上方防抖上传覆盖）
      tagStore.touchTagsLastUsed(newTagIds);

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
      aggregationType: AggregationType = "sum",
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

    // 由 displayedTask 切到选择时不要再次 push，避免重复
    let selectionSyncedFromDisplayStore = false;
    watch(
      () => displayStore.displayedTaskId,
      (taskId: number | null, prevTaskId: number | null | undefined) => {
        selectionSyncedFromDisplayStore = true;
        if (taskId == null) {
          // 仅从「当前有展示 task」离开到空位时同步 planner；避免持久化恢复时空位盖掉已有 selectedTaskId
          if (prevTaskId != null && prevTaskId !== undefined) {
            selectedTaskId.value = null;
          }
          nextTick(() => {
            selectionSyncedFromDisplayStore = false;
          });
          return;
        }
        selectedTaskId.value = taskId;
        // 切换展示 task 时先清看板 activeId，否则旧行仍靠 activeId 高亮、新行靠 selectedActivityId，会双行选中
        activeId.value = null;
        const activityId = taskById.value.get(taskId)?.sourceId;
        if (activityId != null) {
          selectedActivityId.value = activityId;
          const todoId = todoByActivityId.value.get(activityId)?.id;
          if (todoId != null) {
            selectedRowId.value = todoId;
          } else {
            const scheduleId = scheduleByActivityId.value.get(activityId)?.id;
            if (scheduleId != null) selectedRowId.value = scheduleId;
            else selectedRowId.value = null;
          }
        } else {
          selectedActivityId.value = null;
          selectedRowId.value = null;
        }
        nextTick(() => {
          selectionSyncedFromDisplayStore = false;
        });
      },
    );
    // 点击 Planner 行时把该 task 推入展示历史；immediate 保证初始/恢复持久化后 displayStore 也能接到当前选中
    watch(
      selectedTaskId,
      (id, prevId) => {
        if (selectionSyncedFromDisplayStore) return;
        if (id == null) {
          // 首次 immediate 且 persist 里本就无 planner 选中时不强行改 Tracker 空位；有 task → 清空 时才落到空位
          if (prevId != null && prevId !== undefined) {
            displayStore.snapToEmptySlot();
          }
          return;
        }
        displayStore.pushTaskId(id);
      },
      { immediate: true },
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
      { deep: true },
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
          // 已取消或已完成的活动，不再被自动状态机覆盖
          if (activity.status === "done" || activity.status === "cancelled") return;
          const dueMs = typeof activity.dueRange[0] === "string" ? Date.parse(activity.dueRange[0]) : Number(activity.dueRange[0]);

          if (dueMs >= startOfDay && dueMs <= endOfDay) {
            activity.status = "ongoing";
          } else if (dueMs < now) {
            activity.status = "delayed";
          } else {
            activity.status = "";
          }
        });
      },
    );

    // ======================== 8. 暴露接口 ========================
    return {
      // 核心状态
      activityList,
      todoList,
      scheduleList,
      taskList,
      activeActivities,
      activeTodos,
      activeSchedules,
      activeTasks,

      // 索引
      activityById,
      todoById,
      scheduleById,
      taskById,
      _activityById,
      _todoById,
      _scheduleById,
      _taskById,
      todoByActivityId,
      scheduleByActivityId,
      taskByActivityId, // 字段是sourceId 但是以后都只有 activityId
      childrenOfActivity,
      tasksBySource,

      tagList: tagStore.rawTags,
      tagById: tagStore.tagById,
      _tagById: tagStore._tagById,
      templateList: templateStore.rawTemplates,
      templateById: templateStore.templateById,
      _templateById: templateStore._templateById,

      // UI 状态
      activeId,
      selectedTaskId,
      displayedTaskId,
      selectedActivityId,
      selectedRowId,
      isSelectedRowDone,
      selectedRowHasParent,
      selectedDate,
      filterTagIds,

      // 派生UI状态
      selectedActivity,
      selectedTask,
      selectedTagIds,
      todosForCurrentViewWithTags,
      schedulesForCurrentViewWithTags,
      schedulesForAppDate,
      firstTaggedTaskIdForAppDate,
      todosForAppDate,
      schedulesForCurrentView,
      todosForCurrentViewWithTaskRecords,
      yearDayDots,

      dateService,

      // 方法
      saveAllDebounced,
      saveAllAfterSync,
      clearData,
      loadAllData,
      hasStarredTaskForActivity,
      cleanSelection,
      addActivity,
      setActiveId,
      setSelectedDate,
      setTaskStar,
      toggleTaskStar,
      updateActivityById,
      updateTodoById,
      updateTaskById,
      updateScheduleById,

      // Tag 相关操作
      addTagToActivity,
      removeTagFromActivity,
      setActivityTags,
      toggleActivityTag,
      createAndAddTagToActivity,
      getActivityTags,

      // Tag filter (day/week/month)
      toggleFilterTagId,
      removeFilterTagId,
      clearFilterTags,

      // Chart 相关
      allDataPoints,
      dataByMetric,
      getAggregatedData,
      getDataInRange,

      // 数据加载状态
      isDataLoaded,

      // 未同步数据汇总
      hasUnsyncedData,
      unsyncedDataSummary,
    };
  },
  {
    // ======================== 9. 精细化持久化配置（v3 语法） ========================
    persist: {
      key: "data-store-ui-state",
      pick: ["activeId", "selectedTaskId", "selectedActivityId", "selectedRowId", "selectedDate", "filterTagIds"],
    },
  },
);
