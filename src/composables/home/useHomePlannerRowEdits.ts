import type { Ref } from "vue";
import { getTimestampForTimeString } from "@/core/utils";

type TodoItem = {
  id: number;
  activityId: number;
  activityTitle?: string;
  startTime?: number;
  doneTime?: number;
  synced?: boolean;
  lastModified?: number;
};

type ScheduleItem = {
  id: number;
  activityId: number;
  activityTitle?: string;
  activityDueRange: [number | null, string];
  doneTime?: number;
  location?: string;
  synced?: boolean;
  lastModified?: number;
};

type ActivityItem = {
  id: number;
  title: string;
  dueRange?: [number | null, string];
  location?: string;
  synced?: boolean;
  lastModified?: number;
};

type TaskItem = {
  activityTitle?: string;
  description?: string;
  synced?: boolean;
  lastModified?: number;
};

interface UseHomePlannerRowEditsOptions {
  todoById: Ref<Map<number, TodoItem>>;
  scheduleById: Ref<Map<number, ScheduleItem>>;
  activityById: Ref<Map<number, ActivityItem>>;
  taskByActivityId: Ref<Map<number, TaskItem>>;
  appDateTimestamp: Ref<number>;
  dateService: {
    appDateTimestamp: number;
  };
  saveAllDebounced: () => void;
  /** Todo title 保存后同步 ledger，返回规范化 title */
  onTodoTitleSaved?: (todoId: number, rawTitle: string) => string;
  /** Schedule title 保存后同步 ledger，返回规范化 title */
  onScheduleTitleSaved?: (scheduleId: number, rawTitle: string) => string;
}

export function useHomePlannerRowEdits(options: UseHomePlannerRowEditsOptions) {
  const handleEditScheduleTitle = (id: number, newTitle: string) => {
    const schedule = options.scheduleById.value.get(id);
    if (!schedule) return;

    const normalizedTitle = options.onScheduleTitleSaved?.(id, newTitle) ?? newTitle;
    schedule.activityTitle = normalizedTitle;
    const activity = options.activityById.value.get(schedule.activityId);
    if (!activity) return;
    activity.title = normalizedTitle;
    activity.synced = false;
    activity.lastModified = Date.now();

    const relatedTask = options.taskByActivityId.value.get(schedule.activityId);
    if (relatedTask) {
      relatedTask.activityTitle = normalizedTitle;
    }
    options.saveAllDebounced();
  };

  const handleEditTodoTitle = (id: number, newTitle: string) => {
    const todo = options.todoById.value.get(id);
    if (!todo) return;

    const normalizedTitle = options.onTodoTitleSaved?.(id, newTitle) ?? newTitle;
    todo.activityTitle = normalizedTitle;

    const activity = options.activityById.value.get(todo.activityId);
    if (!activity) return;
    activity.title = normalizedTitle;
    activity.synced = false;
    activity.lastModified = Date.now();

    const relatedTask = options.taskByActivityId.value.get(todo.activityId);
    if (relatedTask) {
      relatedTask.activityTitle = normalizedTitle;
    }
    options.saveAllDebounced();
  };

  const handleEditScheduleStart = (id: number, newTm: string) => {
    const schedule = options.scheduleById.value.get(id);
    if (!schedule) return;
    const activity = options.activityById.value.get(schedule.activityId);

    if (newTm === "") {
      schedule.activityDueRange[0] = null;
      schedule.synced = false;
      schedule.lastModified = Date.now();
      if (activity?.dueRange) {
        activity.dueRange[0] = null;
        activity.synced = false;
        activity.lastModified = Date.now();
      }
      options.saveAllDebounced();
      return;
    }

    const baseTs = schedule.activityDueRange?.[0] ?? options.dateService.appDateTimestamp;
    const [hh, mm] = newTm.split(":").map((n) => Number(n));
    const base = new Date(Number(baseTs));
    base.setHours(hh, mm, 0, 0);
    const nextTs = base.getTime();

    if (!schedule.activityDueRange) schedule.activityDueRange = [null, "0"];
    schedule.activityDueRange[0] = nextTs;
    schedule.synced = false;
    schedule.lastModified = Date.now();

    if (activity) {
      if (!activity.dueRange) activity.dueRange = [nextTs, schedule.activityDueRange[1] ?? "0"];
      else activity.dueRange[0] = nextTs;
      activity.synced = false;
      activity.lastModified = Date.now();
    }

    options.saveAllDebounced();
  };

  const handleEditTodoStart = (id: number, newTm: string) => {
    const todo = options.todoById.value.get(id);
    if (!todo) return;

    todo.startTime = getTimestampForTimeString(newTm, options.appDateTimestamp.value);
    todo.synced = false;
    todo.lastModified = Date.now();

    const task = options.taskByActivityId.value.get(todo.activityId);
    if (task && task.description?.trim() === "#") {
      task.description = `# ${todo.activityTitle ?? ""}`;
      task.synced = false;
      task.lastModified = Date.now();
    }

    options.saveAllDebounced();
  };

  const handleEditTodoDone = (id: number, newTm: string) => {
    const todo = options.todoById.value.get(id);
    if (!todo) return;
    todo.doneTime = newTm === "" ? undefined : getTimestampForTimeString(newTm, options.appDateTimestamp.value);
    todo.synced = false;
    todo.lastModified = Date.now();
    options.saveAllDebounced();
  };

  const handleEditScheduleDone = (id: number, newTm: string) => {
    const schedule = options.scheduleById.value.get(id);
    if (!schedule) return;
    schedule.doneTime = newTm === "" ? undefined : getTimestampForTimeString(newTm, options.appDateTimestamp.value);
    options.saveAllDebounced();
  };

  const handleEditScheduleDuration = (id: number, newDurationMin: string) => {
    const schedule = options.scheduleById.value.get(id);
    if (!schedule) return;

    if (!schedule.activityDueRange) schedule.activityDueRange = [null, "0"];
    schedule.activityDueRange[1] = newDurationMin;
    schedule.synced = false;
    schedule.lastModified = Date.now();

    const activity = options.activityById.value.get(schedule.activityId);
    if (activity) {
      if (!activity.dueRange) activity.dueRange = [schedule.activityDueRange[0] ?? null, newDurationMin];
      else activity.dueRange[1] = newDurationMin;
      activity.synced = false;
      activity.lastModified = Date.now();
    }

    options.saveAllDebounced();
  };

  const handleEditScheduleLocation = (id: number, newLocation: string) => {
    const schedule = options.scheduleById.value.get(id);
    if (!schedule) return;

    schedule.location = newLocation;
    schedule.synced = false;
    schedule.lastModified = Date.now();

    const activity = options.activityById.value.get(schedule.activityId);
    if (activity) {
      activity.location = newLocation;
      activity.synced = false;
      activity.lastModified = Date.now();
    }

    options.saveAllDebounced();
  };

  return {
    handleEditScheduleTitle,
    handleEditTodoTitle,
    handleEditScheduleStart,
    handleEditTodoStart,
    handleEditTodoDone,
    handleEditScheduleDone,
    handleEditScheduleDuration,
    handleEditScheduleLocation,
  };
}
