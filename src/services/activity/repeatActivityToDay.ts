import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import type { Task } from "@/core/types/Task";
import { startOfDay } from "@/core/utils/weekDays";
import { countCompletedPomos } from "@/services/timer/realPomoState";
import { convertToSchedule, passPickedActivity } from "@/services/activity/activityService";
import { taskService } from "@/services/task/taskService";

const DAY_MS = 24 * 60 * 60 * 1000;
const EST_POMO_CAP = 5;

export type RepeatActivityToDayInput = {
  sourceActivity: Activity;
  /** 有选中行时传入，用于来源日 / 抄 startTime / estPomo */
  sourceTodo?: Todo | null;
  sourceSchedule?: Schedule | null;
  targetDayStart: number;
  isTargetDayToday: boolean;
  /** true：只复制 Activity+Task（键盘 repeatActivityOnly） */
  activityOnly?: boolean;
  /** 覆盖来源日（周拖用视觉块日；不管 todo.dueDate） */
  sourceDayTs?: number;
  /** 覆盖 now（单测） */
  now?: number;
  combineDateAndTime: (dayTs: number, clockTs: number) => number;
};

export type RepeatActivityToDayResult = {
  activity: Activity;
  task: Task;
  todo?: Todo;
  schedule?: Schedule;
};

/** YYYY-MM-DD（本地） */
export function formatSourceDayIso(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Todo→startTime 日；Schedule→dueRange[0] 日；不管 todo/activity.dueDate */
export function resolveRepeatSourceDayTs(activity: Activity, sourceTodo?: Todo | null, sourceSchedule?: Schedule | null): number {
  if (sourceTodo?.startTime != null) return startOfDay(sourceTodo.startTime);
  const schStart = sourceSchedule?.activityDueRange?.[0];
  if (schStart != null) return startOfDay(schStart);
  if (activity.dueRange?.[0] != null) return startOfDay(activity.dueRange[0]);
  return startOfDay(Date.now());
}

export function buildRepeatTaskDescription(title: string, sourceDayIso: string): string {
  return `# ${title}\n>From ${sourceDayIso}`;
}

/** 源 realPomo 完成格合计，上限 5；无 Todo 则 0 */
export function estPomoFromSourceReal(sourceTodo?: Todo | null): number {
  if (!sourceTodo) return 0;
  const fromSlots = countCompletedPomos(sourceTodo);
  if (fromSlots > 0) return Math.min(EST_POMO_CAP, fromSlots);
  // est 缺失时 ensureFlat 会得到 0；仍按扁平 1 计数兜底
  if (Array.isArray(sourceTodo.realPomo) && sourceTodo.realPomo.length > 0) {
    const ones = sourceTodo.realPomo.filter((v) => v === 1).length;
    return Math.min(EST_POMO_CAP, ones);
  }
  return 0;
}

/**
 * 复制到目标日：类型守恒；标题不加 re；Task 写 >来自；Todo 可抄 startTime 与 estPomo。
 */
export function repeatActivityToDay(input: RepeatActivityToDayInput): RepeatActivityToDayResult {
  const {
    sourceActivity,
    sourceTodo = null,
    sourceSchedule = null,
    targetDayStart,
    isTargetDayToday,
    activityOnly = false,
    combineDateAndTime,
  } = input;
  const now = input.now ?? Date.now();
  const sourceDayTs = input.sourceDayTs ?? resolveRepeatSourceDayTs(sourceActivity, sourceTodo, sourceSchedule);
  const sourceDayIso = formatSourceDayIso(sourceDayTs);
  const title = sourceActivity.title;

  const newActivity: Activity = {
    ...sourceActivity,
    id: now,
    status: "" as Activity["status"],
    title,
    tagIds: sourceActivity.tagIds ? [...sourceActivity.tagIds] : undefined,
    taskId: undefined,
    synced: false,
    deleted: false,
    lastModified: now,
  };

  if (sourceActivity.class === "S" && sourceActivity.dueRange) {
    const clock = sourceActivity.dueRange[0] ?? sourceSchedule?.activityDueRange?.[0] ?? now;
    newActivity.dueRange = [combineDateAndTime(targetDayStart, clock), sourceActivity.dueRange[1]];
  }

  if (sourceActivity.class === "T" && !activityOnly) {
    const est = estPomoFromSourceReal(sourceTodo);
    if (est > 0) {
      newActivity.estPomoI = String(est);
    }
  }

  const task = taskService.createTaskFromActivity(newActivity.id, title);
  task.description = buildRepeatTaskDescription(title, sourceDayIso);
  newActivity.taskId = task.id;
  newActivity.lastModified = now;

  if (activityOnly) {
    if (sourceActivity.class === "T") {
      newActivity.status = "ongoing";
      newActivity.dueDate = targetDayStart;
    }
    return { activity: newActivity, task };
  }

  if (newActivity.class === "T") {
    newActivity.status = "ongoing";
    newActivity.dueDate = targetDayStart;
    newActivity.synced = false;
    newActivity.lastModified = now;
    const { newTodo } = passPickedActivity(newActivity, targetDayStart, isTargetDayToday);
    newTodo.taskId = task.id;
    newTodo.activityTitle = title;
    // 有源 startTime → 抄到落点日同钟点；无则保持空
    if (sourceTodo?.startTime != null) {
      newTodo.startTime = combineDateAndTime(targetDayStart, sourceTodo.startTime);
    }
    return { activity: newActivity, task, todo: newTodo };
  }

  // Schedule：类型守恒
  const newSchedule = convertToSchedule(newActivity);
  newSchedule.taskId = task.id;
  newSchedule.activityTitle = title;
  if (sourceSchedule?.location) {
    newSchedule.location = sourceSchedule.location;
  }
  // convertToSchedule 已从 activity.dueRange 带上落点日钟点
  return { activity: newActivity, task, schedule: newSchedule };
}

/** 纵向拖：钳制区间不越过日末 */
export function clampRangeToDay(start: number, end: number, dayStart: number): { start: number; end: number } {
  const dayEnd = dayStart + DAY_MS;
  let s = start;
  let e = end;
  const dur = Math.max(e - s, 60_000);
  if (e > dayEnd) {
    e = dayEnd;
    s = Math.max(dayStart, e - dur);
  }
  if (s < dayStart) {
    s = dayStart;
    e = Math.min(dayEnd, s + dur);
  }
  return { start: s, end: e };
}

/** 像素位移 → 毫秒（周轴）；取整，避免 start/done 写入带小数导致云端 bigint 拒收 */
export function deltaYToMs(deltaY: number, pxPerHour: number): number {
  if (!(pxPerHour > 0)) return 0;
  return Math.round((deltaY / pxPerHour) * 3600_000);
}
