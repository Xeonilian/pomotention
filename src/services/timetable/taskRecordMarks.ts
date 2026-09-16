import type { EnergyRecord, InterruptionRecord, RewardRecord, Task } from "@/core/types/Task";

export type TaskRecordMarkKind = "interruption" | "energy" | "reward";

export interface TaskRecordMark {
  recordId: number;
  taskId: number;
  todoId?: number;
  scheduleId?: number;
  kind: TaskRecordMarkKind;
  interruptionType?: "I" | "E";
  value?: number;
  description?: string;
  time: number;
  lane: number;
}

type UnlanedMark = Omit<TaskRecordMark, "lane">;

export interface TodoMarkSource {
  id: number;
  taskId?: number;
  startTime?: number;
}

export interface ScheduleMarkSource {
  id: number;
  taskId?: number;
  activityDueRange: [number | null, string];
}

/** 展示时刻：有合法 recordedAt 用其，否则回退 id */
export function recordEventTime(record: { id: number; recordedAt?: number }): number {
  const t = record.recordedAt;
  if (typeof t === "number" && Number.isFinite(t)) return t;
  return record.id;
}

/**
 * 当天用记录时刻；晚于当天用 fallback（todo.startTime / schedule 开始）；更早不画。
 */
export function resolveRecordTime(
  recordTime: number,
  dayStart: number,
  dayEnd: number,
  fallbackStart: number | null | undefined,
): number | null {
  if (recordTime >= dayStart && recordTime < dayEnd) return recordTime;
  if (recordTime >= dayEnd) {
    if (fallbackStart == null || !Number.isFinite(fallbackStart)) return null;
    if (fallbackStart < dayStart || fallbackStart >= dayEnd) return null;
    return fallbackStart;
  }
  return null;
}

function clampToRange(time: number, rangeStart: number, rangeEnd: number): number {
  if (rangeEnd <= rangeStart) return time;
  const last = rangeEnd - 1;
  if (time < rangeStart) return rangeStart;
  if (time > last) return last;
  return time;
}

function assignLanes<T extends { time: number; recordId: number }>(
  marks: T[],
  minGapMs: number,
): (T & { lane: number })[] {
  const sorted = [...marks].sort((a, b) => a.time - b.time || a.recordId - b.recordId);
  const gap = minGapMs > 0 ? minGapMs : 0;
  const out: (T & { lane: number })[] = [];
  let cluster: T[] = [];

  const flushCluster = () => {
    if (cluster.length === 0) return;
    const ordered = [...cluster].sort((a, b) => a.recordId - b.recordId);
    ordered.forEach((mark, lane) => {
      out.push({ ...mark, lane });
    });
    cluster = [];
  };

  for (const mark of sorted) {
    const first = cluster[0];
    // 与簇内最早一条相差超过 gap 则换簇，避免「每隔几分钟一条」一直往右排
    if (first && mark.time - first.time >= gap) flushCluster();
    cluster.push(mark);
  }
  flushCluster();
  return out;
}

function pushEnergyMarks(
  out: UnlanedMark[],
  seen: Set<string>,
  task: Task,
  host: { todoId?: number; scheduleId?: number },
  dayStart: number,
  dayEnd: number,
  fallbackStart: number | null | undefined,
): void {
  for (const record of task.energyRecords ?? []) {
    addMark(out, seen, task.id, host, "energy", record, dayStart, dayEnd, fallbackStart);
  }
  for (const record of task.rewardRecords ?? []) {
    addMark(out, seen, task.id, host, "reward", record, dayStart, dayEnd, fallbackStart);
  }
}

function addMark(
  out: UnlanedMark[],
  seen: Set<string>,
  taskId: number,
  host: { todoId?: number; scheduleId?: number },
  kind: "energy" | "reward",
  record: EnergyRecord | RewardRecord,
  dayStart: number,
  dayEnd: number,
  fallbackStart: number | null | undefined,
): void {
  const key = `${kind}:${record.id}`;
  if (seen.has(key)) return;
  const resolved = resolveRecordTime(recordEventTime(record), dayStart, dayEnd, fallbackStart);
  if (resolved == null) return;
  seen.add(key);
  out.push({
    recordId: record.id,
    taskId,
    todoId: host.todoId,
    scheduleId: host.scheduleId,
    kind,
    value: record.value,
    description: record.description,
    time: resolved,
  });
}

function addInterruptionMarks(
  out: UnlanedMark[],
  seen: Set<string>,
  task: Task,
  host: { todoId?: number; scheduleId?: number },
  dayStart: number,
  dayEnd: number,
  fallbackStart: number | null | undefined,
): void {
  for (const record of task.interruptionRecords ?? []) {
    const key = `interruption:${record.id}`;
    if (seen.has(key)) continue;
    const resolved = resolveRecordTime(recordEventTime(record), dayStart, dayEnd, fallbackStart);
    if (resolved == null) continue;
    seen.add(key);
    const interruptionType = normalizeInterruptionType(record);
    out.push({
      recordId: record.id,
      taskId: task.id,
      todoId: host.todoId,
      scheduleId: host.scheduleId,
      kind: "interruption",
      interruptionType,
      description: record.description,
      time: resolved,
    });
  }
}

function normalizeInterruptionType(record: InterruptionRecord & { class?: "I" | "E" }): "I" | "E" {
  if (record.interruptionType === "E" || record.interruptionType === "I") return record.interruptionType;
  if (record.class === "E" || record.class === "I") return record.class;
  return "I";
}

export function collectTaskRecordMarks(options: {
  dayStart: number;
  dayEnd: number;
  timeRange: { start: number; end: number };
  todos: TodoMarkSource[];
  schedules: ScheduleMarkSource[];
  getTask: (taskId: number) => Task | undefined;
  minGapMs: number;
  /** 无 todo/schedule 的 energy 宿主（如 day_energy），只注入 energy 点 */
  orphanEnergyTasks?: Task[];
}): TaskRecordMark[] {
  const { dayStart, dayEnd, timeRange, todos, schedules, getTask, minGapMs, orphanEnergyTasks } = options;
  const raw: UnlanedMark[] = [];
  const seen = new Set<string>();

  for (const todo of todos) {
    if (todo.taskId == null) continue;
    const task = getTask(todo.taskId);
    if (!task) continue;
    const host = { todoId: todo.id };
    addInterruptionMarks(raw, seen, task, host, dayStart, dayEnd, todo.startTime);
    pushEnergyMarks(raw, seen, task, host, dayStart, dayEnd, todo.startTime);
  }

  for (const schedule of schedules) {
    if (schedule.taskId == null) continue;
    const task = getTask(schedule.taskId);
    if (!task) continue;
    const host = { scheduleId: schedule.id };
    const fallback = schedule.activityDueRange[0];
    addInterruptionMarks(raw, seen, task, host, dayStart, dayEnd, fallback);
    pushEnergyMarks(raw, seen, task, host, dayStart, dayEnd, fallback);
  }

  for (const task of orphanEnergyTasks ?? []) {
    if (task.deleted) continue;
    for (const record of task.energyRecords ?? []) {
      addMark(raw, seen, task.id, {}, "energy", record, dayStart, dayEnd, dayStart);
    }
  }

  const clamped = raw.map((mark) => ({
    ...mark,
    time: clampToRange(mark.time, timeRange.start, timeRange.end),
  }));

  return assignLanes(clamped, minGapMs);
}
