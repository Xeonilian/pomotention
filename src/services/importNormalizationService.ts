import { STORAGE_KEYS } from "@/core/constants";
import { loadData, saveData } from "@/services/localStorageService";
import type { Todo } from "@/core/types/Todo";
import type { Block, PomodoroSegment } from "@/core/types/Block";
import { splitIndexPomoBlocksExSchedules } from "@/services/pomoSegService";
import type { Schedule } from "@/core/types/Schedule";

export interface TodoNormalizationStats {
  normalizedCount: number;
  defaultPomoTypeCount: number;
  clearedGlobalIndexCount: number;
  rebuiltGlobalIndexCount: number;
  fixedDeletedFlagCount: number;
  fixedLastModifiedCount: number;
}

export interface ImportNormalizationReport {
  touched: boolean;
  todo: TodoNormalizationStats;
  warnings: string[];
}

interface NormalizeOptions {
  dryRun?: boolean;
}

const VALID_POMO_TYPES = new Set(["🍅", "🍇", "🍒"]);

function createEmptyStats(): TodoNormalizationStats {
  return {
    normalizedCount: 0,
    defaultPomoTypeCount: 0,
    clearedGlobalIndexCount: 0,
    rebuiltGlobalIndexCount: 0,
    fixedDeletedFlagCount: 0,
    fixedLastModifiedCount: 0,
  };
}

function getRealPomoTotal(todo: Todo): number {
  if (!Array.isArray(todo.realPomo) || todo.realPomo.length === 0) return 1;
  const sum = todo.realPomo.reduce((acc, cur) => acc + (typeof cur === "number" && Number.isFinite(cur) ? cur : 0), 0);
  return Math.max(1, Math.floor(sum));
}

function getDayStart(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function resolvePrimaryTimetableType(blocks: Block[]): "work" | "entertainment" {
  const firstActive = blocks.find((b) => !b.deleted);
  return firstActive?.type === "entertainment" ? "entertainment" : "work";
}

function getSchedulesForDay(allSchedules: Schedule[], dayStart: number): Schedule[] {
  const dayEnd = dayStart + 24 * 60 * 60 * 1000;
  return allSchedules.filter((s) => {
    if (s.status === "cancelled") return false;
    const start = s.activityDueRange?.[0];
    const durationMin = Number(s.activityDueRange?.[1] ?? 0);
    if (start == null || !Number.isFinite(start) || durationMin <= 0) return false;
    const end = start + durationMin * 60 * 1000;
    return end > dayStart && start < dayEnd;
  });
}

function buildPomoSegmentsCache(blocks: Block[], schedules: Schedule[]): (dayStart: number) => PomodoroSegment[] {
  const cache = new Map<string, PomodoroSegment[]>();
  const primaryType = resolvePrimaryTimetableType(blocks);
  const activeBlocks = blocks.filter((b) => !b.deleted && b.type === primaryType);

  return (dayStart: number): PomodoroSegment[] => {
    const key = String(dayStart);
    const hit = cache.get(key);
    if (hit) return hit;
    const daySchedules = getSchedulesForDay(schedules, dayStart);
    const segs = splitIndexPomoBlocksExSchedules(dayStart, activeBlocks, daySchedules);
    cache.set(key, segs);
    return segs;
  };
}

function findNearestPomoGlobalIndex(segments: PomodoroSegment[], anchorTs: number): number | undefined {
  const pomoSegs = segments.filter((s) => s.type === "pomo" && typeof s.globalIndex === "number");
  if (pomoSegs.length === 0) return undefined;

  // 优先：时间落在段内
  const containing = pomoSegs.find((s) => s.start <= anchorTs && anchorTs < s.end);
  if (containing?.globalIndex !== undefined) return containing.globalIndex;

  // 其次：最近开始时间（老数据常不在整点边界）
  let best = pomoSegs[0];
  let bestDist = Math.abs(best.start - anchorTs);
  for (let i = 1; i < pomoSegs.length; i++) {
    const cur = pomoSegs[i];
    const curDist = Math.abs(cur.start - anchorTs);
    if (curDist < bestDist) {
      best = cur;
      bestDist = curDist;
    }
  }
  return best.globalIndex;
}

function fallbackByHalfHourRule(anchorTs: number): number {
  const d = new Date(anchorTs);
  const minutesFromMidnight = d.getHours() * 60 + d.getMinutes();
  const minutesFrom6 = minutesFromMidnight - 6 * 60;
  const halfHourSlot = Math.floor(minutesFrom6 / 30);
  // 每30分钟包含 work+break 两个槽，work 固定落在单数位
  const oddWorkIndex = halfHourSlot * 2 + 1;
  return Math.max(0, oddWorkIndex);
}

function computeGlobalIndexFallback(todo: Todo, getSegmentsByDay: (dayStart: number) => PomodoroSegment[]): number | undefined {
  if (typeof todo.startTime === "number" && Number.isFinite(todo.startTime)) {
    const dayStart = getDayStart(todo.startTime);
    const segs = getSegmentsByDay(dayStart);
    const fromSeg = findNearestPomoGlobalIndex(segs, todo.startTime);
    if (typeof fromSeg === "number" && Number.isInteger(fromSeg) && fromSeg >= 0) return fromSeg;
    return fallbackByHalfHourRule(todo.startTime);
  }

  if (typeof todo.doneTime === "number" && Number.isFinite(todo.doneTime)) {
    const realPomoTotal = getRealPomoTotal(todo);
    // 以 30 分钟为一个番茄周期（25 work + 5 break）倒推起点
    const inferredStart = todo.doneTime - realPomoTotal * 30 * 60 * 1000;
    const dayStart = getDayStart(inferredStart);
    const segs = getSegmentsByDay(dayStart);
    const fromSeg = findNearestPomoGlobalIndex(segs, inferredStart);
    if (typeof fromSeg === "number" && Number.isInteger(fromSeg) && fromSeg >= 0) return fromSeg;
    return fallbackByHalfHourRule(inferredStart);
  }

  // 最后兜底：按 todo.id 的日期取当天第一个可用 pomo 位
  if (typeof todo.id === "number" && Number.isFinite(todo.id)) {
    const dayStart = getDayStart(todo.id);
    const segs = getSegmentsByDay(dayStart).filter((s) => s.type === "pomo" && typeof s.globalIndex === "number");
    if (segs.length > 0) {
      return segs[0].globalIndex;
    }
    return 0;
  }

  return 0;
}

function ensurePomoGlobalIndex(
  todo: Todo,
  candidate: number,
  getSegmentsByDay: (dayStart: number) => PomodoroSegment[],
): number {
  const anchorTs =
    (typeof todo.startTime === "number" && Number.isFinite(todo.startTime) && todo.startTime) ||
    (typeof todo.doneTime === "number" && Number.isFinite(todo.doneTime) && todo.doneTime) ||
    (typeof todo.id === "number" && Number.isFinite(todo.id) && todo.id) ||
    Date.now();
  const dayStart = getDayStart(anchorTs);
  const segs = getSegmentsByDay(dayStart);

  if (candidate >= 0 && candidate < segs.length && segs[candidate]?.type === "pomo") {
    return candidate;
  }

  // 如果命中 break/schedule/越界，回退到最近的可用 pomo 段
  const nearest = findNearestPomoGlobalIndex(segs, anchorTs);
  if (typeof nearest === "number" && Number.isInteger(nearest) && nearest >= 0) {
    return nearest;
  }

  // 再兜底：当天第一个 pomo；还没有就返回非负整数
  const firstPomo = segs.find((s) => s.type === "pomo" && typeof s.globalIndex === "number");
  if (typeof firstPomo?.globalIndex === "number") {
    return firstPomo.globalIndex;
  }
  return Math.max(0, candidate);
}

/**
 * 导入后对 todo 做一次轻量归一化，提升旧包兼容性。
 * - 补默认 pomoType
 * - 清理非法 globalIndex，并在缺失时尝试回填
 * - 修正 deleted / lastModified 基础字段
 */
export function normalizeImportedTodoData(options: NormalizeOptions = {}): ImportNormalizationReport {
  const dryRun = options.dryRun ?? false;
  const stats = createEmptyStats();
  const warnings: string[] = [];

  const list = loadData<Todo[]>(STORAGE_KEYS.TODO, []);
  if (!Array.isArray(list) || list.length === 0) {
    return { touched: false, todo: stats, warnings };
  }

  const now = Date.now();
  const updated: Todo[] = [];
  const timetableBlocks = loadData<Block[]>(STORAGE_KEYS.TIMETABLE_BLOCKS, []);
  const schedules = loadData<Schedule[]>(STORAGE_KEYS.SCHEDULE, []);
  const getSegmentsByDay = buildPomoSegmentsCache(
    Array.isArray(timetableBlocks) ? timetableBlocks : [],
    Array.isArray(schedules) ? schedules : [],
  );

  for (const raw of list) {
    const next: Todo = { ...raw };
    let changed = false;

    if (!VALID_POMO_TYPES.has(String(next.pomoType ?? ""))) {
      next.pomoType = "🍅";
      stats.defaultPomoTypeCount++;
      changed = true;
    }

    const hasValidGlobalIndex = typeof next.globalIndex === "number" && Number.isInteger(next.globalIndex) && next.globalIndex >= 0;
    if (next.globalIndex !== undefined && !hasValidGlobalIndex) {
      next.globalIndex = undefined;
      stats.clearedGlobalIndexCount++;
      changed = true;
    }

    if (next.globalIndex === undefined) {
      const rebuilt = computeGlobalIndexFallback(next, getSegmentsByDay);
      if (typeof rebuilt === "number" && Number.isInteger(rebuilt) && rebuilt >= 0) {
        next.globalIndex = ensurePomoGlobalIndex(next, rebuilt, getSegmentsByDay);
        stats.rebuiltGlobalIndexCount++;
        changed = true;
      }
    }

    if (typeof next.deleted !== "boolean") {
      next.deleted = false;
      stats.fixedDeletedFlagCount++;
      changed = true;
    }

    if (typeof next.lastModified !== "number" || Number.isNaN(next.lastModified)) {
      next.lastModified = now;
      stats.fixedLastModifiedCount++;
      changed = true;
    }

    if (changed) {
      stats.normalizedCount++;
    }
    updated.push(next);
  }

  const touched = stats.normalizedCount > 0;
  if (!dryRun && touched) {
    saveData(STORAGE_KEYS.TODO, updated);
  }

  if (stats.defaultPomoTypeCount > 0 || stats.clearedGlobalIndexCount > 0 || stats.rebuiltGlobalIndexCount > 0) {
    warnings.push(
      `[Import Normalize] Todo 已归一化 ${stats.normalizedCount} 项（补 pomoType ${stats.defaultPomoTypeCount}，清理无效 globalIndex ${stats.clearedGlobalIndexCount}，回填 globalIndex ${stats.rebuiltGlobalIndexCount}）`
    );
  }

  return { touched, todo: stats, warnings };
}
