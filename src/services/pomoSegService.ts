// src/services/pomoSegService.ts
import type { Block, TodoSegment, PomodoroSegment } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import { getTimestampForTimeString } from "@/core/utils";
import { countCompletedPomos } from "./realPomoState";

// ========== 辅助工具函数 ==========

/**
 * 从基础时间区间中减去排除区间，返回剩余的可用区间
 */
function _subtractIntervals(base: [number, number], excludes: [number, number][]): [number, number][] {
  const [bStart, bEnd] = base;
  if (!excludes.length) return [[bStart, bEnd]];

  const relevant = excludes.filter(([s, e]) => e > bStart && s < bEnd);
  if (!relevant.length) return [[bStart, bEnd]];

  relevant.sort((a, b) => a[0] - b[0]);
  let result: [number, number][] = [];
  let cur = bStart;

  for (const [s, e] of relevant) {
    if (s > cur) result.push([cur, Math.min(s, bEnd)]);
    cur = Math.max(cur, e);
    if (cur >= bEnd) break;
  }

  if (cur < bEnd) result.push([cur, bEnd]);
  return result.filter(([s, e]) => e > s);
}

/**
 * 统计 todo 预估番茄数
 */
function _getTodoEstPomoCount(todo: Todo): number {
  if (!todo.estPomo) return 0;
  const rawCount = todo.estPomo.reduce((sum, cur) => sum + (typeof cur === "number" ? cur : 0), 0);
  if (todo.pomoType === "🍒") {
    return rawCount / 2;
  }
  return rawCount;
}

/**
 * 统计 todo 实际完成番茄数
 * 现在统一使用 realPomoState.countCompletedPomos（支持扁平 0/1/-1，樱桃兼容 /2）
 */
function _getTodoRealPomoCount(todo: Todo): number {
  return countCompletedPomos(todo);
}

// ========== 番茄时间段生成（第一列） ==========
/**
 * 将时间块分割为番茄时间段，并为所有时间段赋予唯一的、连续的 globalIndex。
 */
export function splitIndexPomoBlocksExSchedules(
  appDateTimestamp: number,
  blocks: Block[],
  schedules: {
    activityDueRange: [number | null, string];
    isUntaetigkeit?: boolean;
    status?: string;
  }[]
): PomodoroSegment[] {
  // ==================================================================
  // 阶段一：生成所有 Segment，此时不考虑 globalIndex
  // ==================================================================

  const activeSchedules = schedules.filter(
    (s) => s.activityDueRange?.[0] != null && Number(s.activityDueRange[1]) > 0 && s.status !== "cancelled"
  );
  // 1. 处理 Schedule 和 Untaetigkeit 块
  const scheduleInfo: Array<{
    range: [number, number];
    isUntaetigkeit: boolean;
  }> = activeSchedules
    .map((s) => {
      const start = Number(s.activityDueRange[0]);
      const duration = Number(s.activityDueRange[1]);
      if (duration > 0) {
        const end = start + duration * 60 * 1000;
        return {
          // ✨ 核心修正：使用 as [number, number] 进行类型断言
          range: [start, end] as [number, number],
          isUntaetigkeit: s.isUntaetigkeit || false,
        };
      }
      return null;
    })
    .filter((info): info is NonNullable<typeof info> => info !== null);

  const mergedSchedules: Array<{
    range: [number, number];
    hasUntaetigkeit: boolean;
  }> = [];
  scheduleInfo
    .sort((a, b) => a.range[0] - b.range[0])
    .forEach(({ range: [start, end], isUntaetigkeit }) => {
      if (!mergedSchedules.length || mergedSchedules[mergedSchedules.length - 1].range[1] < start) {
        mergedSchedules.push({
          range: [start, end],
          hasUntaetigkeit: isUntaetigkeit,
        });
      } else {
        const last = mergedSchedules[mergedSchedules.length - 1];
        last.range[1] = Math.max(last.range[1], end);
        last.hasUntaetigkeit = last.hasUntaetigkeit || isUntaetigkeit;
      }
    });

  // `rawSegments` 用于收集所有未排序、未索引的块
  let rawSegments: Omit<PomodoroSegment, "globalIndex">[] = [];

  mergedSchedules.forEach(({ range: [start, end], hasUntaetigkeit }) => {
    rawSegments.push({
      type: hasUntaetigkeit ? "untaetigkeit" : "schedule",
      start,
      end,
      category: hasUntaetigkeit ? "untaetigkeit" : "schedule",
    });
  });

  // 2. 处理 Pomo 和 Break 块
  const categoryCounters: { [category: string]: number } = {};
  blocks.forEach((block) => {
    if (block.category === "sleeping") return;

    if (!categoryCounters[block.category]) {
      categoryCounters[block.category] = 1;
    }
    const blockStart = getTimestampForTimeString(block.start, appDateTimestamp);
    const blockEnd = getTimestampForTimeString(block.end, appDateTimestamp);

    const relatedExcludes = scheduleInfo.map((info) => info.range).filter(([s, e]) => e > blockStart && s < blockEnd);
    const availableRanges = _subtractIntervals([blockStart, blockEnd], relatedExcludes);

    for (const [aStart, aEnd] of availableRanges) {
      let cur = aStart;

      // 第一个 25min 的 pomo
      if (aEnd - cur >= 25 * 60 * 1000) {
        rawSegments.push({
          type: "pomo",
          start: cur,
          end: cur + 25 * 60 * 1000,
          category: block.category,
          categoryIndex: categoryCounters[block.category]++,
        });
        cur += 25 * 60 * 1000;
      }

      // 后续的 break + pomo 对
      while (aEnd - cur >= 30 * 60 * 1000) {
        // Break 块
        rawSegments.push({
          type: "break",
          start: cur,
          end: cur + 5 * 60 * 1000,
          category: block.category,
        });
        cur += 5 * 60 * 1000;

        // Pomo 块
        rawSegments.push({
          type: "pomo",
          start: cur,
          end: cur + 25 * 60 * 1000,
          category: block.category,
          categoryIndex: categoryCounters[block.category]++,
        });
        cur += 25 * 60 * 1000;
      }
    }
  });

  // ==================================================================
  // 阶段二：排序并赋予最终的 globalIndex
  // ==================================================================

  // 1. 按开始时间对所有类型的块进行统一排序
  const sortedSegments = rawSegments.sort((a, b) => a.start - b.start);

  // 2. 遍历排好序的数组，赋予连续的、唯一的 globalIndex
  const finalSegments: PomodoroSegment[] = sortedSegments.map((segment, index) => {
    return {
      ...segment,
      globalIndex: index, // ✨ 黄金标准：用数组的索引作为 globalIndex
    };
  });

  return finalSegments;
}

// ========== 实际执行相关函数 ==========

/**
 * 生成实际执行的todo时间段
 * 当todo的状态带有startTime
 */
export function generateActualTodoSegments(todos: Todo[]): TodoSegment[] {
  const todoSegments: TodoSegment[] = [];
  // 特殊优先级值也正常生成TodoSegment，在第三列正常显示

  const todosWithStartTime = todos.filter((todo) => todo.startTime);

  for (const todo of todosWithStartTime) {
    if (!todo.startTime) continue;

    const totalCount = _getTodoEstPomoCount(todo);
    const completedCount = _getTodoRealPomoCount(todo);

    if (todo.pomoType === "🍒") {
      for (let i = 0; i < 4; i++) {
        const duration = 15 * 60 * 1000;
        const segmentStart = todo.startTime + i * duration;
        const segmentEnd = segmentStart + duration;

        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          todoIndex: i + 1,
          start: segmentStart,
          end: segmentEnd,
          pomoType: "🍒",
          category: "working",
          completed: i / 2 < completedCount,
          usingRealPomo: true,
        });
      }
    } else {
      const duration = 25 * 60 * 1000;
      for (let i = 0; i < totalCount; i++) {
        const segmentStart = todo.startTime + i * duration;
        const segmentEnd = segmentStart + duration;

        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          todoIndex: i + 1,
          start: segmentStart,
          end: segmentEnd,
          pomoType: todo.pomoType || "🍅",
          category: todo.pomoType === "🍇" ? "living" : "working",
          completed: i < completedCount,
          usingRealPomo: true,
        });
      }
    }
  }

  return todoSegments.sort((a, b) => a.start - b.start);
}

// 第二列 Todo 估计分配相关逻辑已迁移到 src/services/todoSegService.ts
