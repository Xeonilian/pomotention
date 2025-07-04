// src/services/pomoSegService.ts
import type { Block, TodoSegment, PomodoroSegment } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import { getTimestampForTimeString } from "@/core/utils";

// ========== 辅助工具函数 ==========

/**
 * 从基础时间区间中减去排除区间，返回剩余的可用区间
 */
function _subtractIntervals(
  base: [number, number],
  excludes: [number, number][]
): [number, number][] {
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
  const rawCount = todo.estPomo.reduce(
    (sum, cur) => sum + (typeof cur === "number" ? cur : 0),
    0
  );
  if (todo.pomoType === "🍒") {
    return rawCount / 2;
  }
  return rawCount;
}

/**
 * 统计 todo 实际完成番茄数
 */
function _getTodoRealPomoCount(todo: Todo): number {
  if (!todo.realPomo) return 0;
  const rawCount = todo.realPomo.reduce(
    (sum, cur) => sum + (typeof cur === "number" ? cur : 0),
    0
  );
  if (todo.pomoType === "🍒") {
    return rawCount / 2;
  }
  return rawCount;
}

/**
 * 根据todo状态决定使用estPomo还是realPomo
 */
export function getTodoDisplayPomoCount(todo: Todo): number {
  if (todo.status === "done") {
    return _getTodoRealPomoCount(todo);
  } else {
    return _getTodoEstPomoCount(todo);
  }
}

// ========== 番茄时间段生成 ==========

/**
 * 将时间块分割为番茄时间段，排除已安排的活动
 */
export function splitIndexPomoBlocksExSchedules(
  appDateTimestamp: number,
  blocks: Block[],
  schedules: { activityDueRange: [number, string]; isUntaetigkeit?: boolean }[]
): PomodoroSegment[] {
  const scheduleInfo: Array<{
    range: [number, number];
    isUntaetigkeit: boolean;
  }> = schedules
    .map((s) => {
      const start = Number(s.activityDueRange[0]);
      const duration = Number(s.activityDueRange[1]);
      return duration > 0
        ? {
            range: [start, start + duration * 60 * 1000] as [number, number],
            isUntaetigkeit: s.isUntaetigkeit || false,
          }
        : null;
    })
    .filter((info): info is NonNullable<typeof info> => info !== null);

  const excludeRanges: [number, number][] = scheduleInfo.map(
    (info) => info.range
  );

  let segments: PomodoroSegment[] = [];
  const globalIndex: Record<string, number> = {};

  const merged: Array<{
    range: [number, number];
    hasUntaetigkeit: boolean;
  }> = [];

  scheduleInfo
    .sort((a, b) => a.range[0] - b.range[0])
    .forEach(({ range: [start, end], isUntaetigkeit }) => {
      if (!merged.length || merged[merged.length - 1].range[1] < start) {
        merged.push({
          range: [start, end],
          hasUntaetigkeit: isUntaetigkeit,
        });
      } else {
        const last = merged[merged.length - 1];
        last.range[1] = Math.max(last.range[1], end);
        last.hasUntaetigkeit = last.hasUntaetigkeit || isUntaetigkeit;
      }
    });

  merged.forEach(({ range: [start, end], hasUntaetigkeit }) => {
    segments.push({
      parentBlockId: "S",
      type: hasUntaetigkeit ? "untaetigkeit" : "schedule",
      start,
      end,
      category: hasUntaetigkeit ? "untaetigkeit" : "schedule",
    });
  });

  blocks.forEach((block) => {
    if (block.category === "sleeping") return;

    const blockStart = getTimestampForTimeString(block.start, appDateTimestamp);
    const blockEnd = getTimestampForTimeString(block.end, appDateTimestamp);

    const relatedExcludes = excludeRanges.filter(
      ([s, e]) => e > blockStart && s < blockEnd
    );

    const availableRanges = _subtractIntervals(
      [blockStart, blockEnd],
      relatedExcludes
    );

    for (const [aStart, aEnd] of availableRanges) {
      if (aEnd - aStart < 30 * 60 * 1000) continue;

      let cur = aStart;
      let idx = globalIndex[block.category] || 1;

      while (aEnd - cur >= 30 * 60 * 1000) {
        segments.push({
          parentBlockId: block.id,
          type: "work",
          start: cur,
          end: cur + 25 * 60 * 1000,
          category: block.category,
          index: idx,
        });
        cur += 25 * 60 * 1000;

        segments.push({
          parentBlockId: block.id,
          type: "break",
          start: cur,
          end: cur + 5 * 60 * 1000,
          category: block.category,
        });
        cur += 5 * 60 * 1000;
        idx++;
      }

      if (aEnd - cur >= 25 * 60 * 1000) {
        segments.push({
          parentBlockId: block.id,
          type: "work",
          start: cur,
          end: cur + 25 * 60 * 1000,
          category: block.category,
          index: idx,
        });
        idx++;
      }

      globalIndex[block.category] = idx;
    }
  });

  return segments.sort((a, b) => a.start - b.start);
}

// ========== 估计分配相关函数 ==========

/**
 * 生成估计的todo时间段分配
 */
export function generateEstimatedTodoSegments(
  appDateTimestamp: number,
  todos: Todo[],
  pomodoroSegments: PomodoroSegment[]
): TodoSegment[] {
  const todoSegments: TodoSegment[] = [];

  const segByCategory: Record<string, PomodoroSegment[]> = {
    working: pomodoroSegments
      .filter(
        (seg) =>
          seg.category === "working" &&
          (seg.type === "work" || seg.type === "break")
      )
      .sort((a, b) => a.start - b.start),
    living: pomodoroSegments
      .filter(
        (seg) =>
          seg.category === "living" &&
          (seg.type === "work" || seg.type === "break")
      )
      .sort((a, b) => a.start - b.start),
  };

  const used = {
    working: new Array(segByCategory.working.length).fill(false),
    living: new Array(segByCategory.living.length).fill(false),
  };

  const sortedTodos = [...todos].sort((a, b) => {
    if ((a.priority ?? 0) === 0 && (b.priority ?? 0) === 0) return 0;
    if ((a.priority ?? 0) === 0) return 1;
    if ((b.priority ?? 0) === 0) return -1;
    return (a.priority ?? 0) - (b.priority ?? 0);
  });

  for (const todo of sortedTodos) {
    const needCount = getTodoDisplayPomoCount(todo);
    if (needCount === 0) continue;

    if (todo.pomoType === "🍅" || !todo.pomoType) {
      _allocateTomatoSegments(
        appDateTimestamp,
        todo,
        needCount,
        segByCategory.working,
        used.working,
        todoSegments
      );
    } else if (todo.pomoType === "🍇") {
      _allocateGrapeSegments(
        appDateTimestamp,
        todo,
        needCount,
        segByCategory.living,
        used.living,
        todoSegments
      );
    } else if (todo.pomoType === "🍒") {
      _allocateCherrySegments(
        appDateTimestamp,
        todo,
        needCount,
        segByCategory.working,
        used.working,
        todoSegments
      );
    }
  }

  return todoSegments;
}

// ========== 实际执行相关函数 ==========

/**
 * 生成实际执行的todo时间段
 * 当todo的状态带有startTime
 */
export function generateActualTodoSegments(todos: Todo[]): TodoSegment[] {
  const todoSegments: TodoSegment[] = [];

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
        const pomodoroIndex = Math.floor(i / 2);

        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          index: pomodoroIndex + 1,
          start: segmentStart,
          end: segmentEnd,
          pomoType: "🍒",
          category: "working",
          completed: pomodoroIndex < completedCount,
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
          index: i + 1,
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
// ========== 分配相关函数 ==========
/**
 * 分配🍅番茄段到working区域
 */
function _allocateTomatoSegments(
  appDateTimestamp: number,
  todo: Todo,
  needCount: number,
  segments: PomodoroSegment[],
  isUsed: boolean[],
  todoSegments: TodoSegment[]
): void {
  let assignedCount = 0;

  for (let i = 0; i < segments.length && assignedCount < needCount; i++) {
    if (!isUsed[i] && segments[i].type === "work") {
      let segmentEnd = segments[i].end;
      let span = 0;

      if (
        i + 1 < segments.length &&
        !isUsed[i + 1] &&
        segments[i + 1].type === "break" &&
        segments[i].end === segments[i + 1].start
      ) {
        segmentEnd = segments[i + 1].end;
        isUsed[i + 1] = true;
        span = 1;
      }

      isUsed[i] = true;
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        index: assignedCount + 1,
        start: segments[i].start,
        end: segmentEnd,
        pomoType: "🍅",
        assignedPomodoroSegment: segments[i],
        category: "working",
        completed: false,
        usingRealPomo: false,
      });
      assignedCount++;
      i += span;
    }
  }

  if (assignedCount < needCount) {
    let overflowStartTime: number;
    if (segments.length > 0) {
      overflowStartTime = segments[segments.length - 1].end;
    } else {
      const overflowBaseDate = new Date(appDateTimestamp);
      overflowBaseDate.setHours(22, 0, 0, 0);
      overflowStartTime = overflowBaseDate.getTime();
    }

    while (assignedCount < needCount) {
      const duration = 25 * 60 * 1000;
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        index: assignedCount + 1,
        start: overflowStartTime,
        end: overflowStartTime + duration,
        pomoType: "🍅",
        category: "working",
        overflow: true,
        completed: false,
        usingRealPomo: false,
      });
      overflowStartTime += duration;
      assignedCount++;
    }
  }
}

/**
 * 分配🍇番茄段到living区域
 */
function _allocateGrapeSegments(
  appDateTimestamp: number,
  todo: Todo,
  needCount: number,
  segments: PomodoroSegment[],
  isUsed: boolean[],
  todoSegments: TodoSegment[]
): void {
  let assignedCount = 0;

  for (let i = 0; i < segments.length && assignedCount < needCount; i++) {
    if (!isUsed[i] && segments[i].type === "work") {
      let segmentEnd = segments[i].end;
      let span = 0;

      if (
        i + 1 < segments.length &&
        !isUsed[i + 1] &&
        segments[i + 1].type === "break" &&
        segments[i].end === segments[i + 1].start
      ) {
        segmentEnd = segments[i + 1].end;
        isUsed[i + 1] = true;
        span = 1;
      }

      isUsed[i] = true;
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        index: assignedCount + 1,
        start: segments[i].start,
        end: segmentEnd,
        pomoType: "🍇",
        assignedPomodoroSegment: segments[i],
        category: "living",
        completed: false,
        usingRealPomo: false,
      });
      assignedCount++;
      i += span;
    }
  }

  if (assignedCount < needCount) {
    let overflowStartTime: number;
    if (segments.length > 0) {
      overflowStartTime = segments[segments.length - 1].end;
    } else {
      const overflowBaseDate = new Date(appDateTimestamp);
      overflowBaseDate.setHours(22, 0, 0, 0);
      overflowStartTime = overflowBaseDate.getTime();
    }

    while (assignedCount < needCount) {
      const duration = 25 * 60 * 1000;
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        index: assignedCount + 1,
        start: overflowStartTime,
        end: overflowStartTime + duration,
        pomoType: "🍇",
        category: "living",
        overflow: true,
        completed: false,
        usingRealPomo: false,
      });
      overflowStartTime += duration;
      assignedCount++;
    }
  }
}

/**
 * 分配🍒番茄段
 */
function _allocateCherrySegments(
  appDateTimestamp: number,
  todo: Todo,
  needCount: number,
  segments: PomodoroSegment[],
  isUsed: boolean[],
  todoSegments: TodoSegment[]
): void {
  let assignedCount = 0;

  for (let i = 0; i < segments.length - 3 && assignedCount < needCount; i++) {
    if (
      !isUsed[i] &&
      segments[i].type === "work" &&
      !isUsed[i + 1] &&
      segments[i + 1].type === "break" &&
      segments[i].end === segments[i + 1].start &&
      !isUsed[i + 2] &&
      segments[i + 2].type === "work" &&
      segments[i + 1].end === segments[i + 2].start &&
      !isUsed[i + 3] &&
      segments[i + 3].type === "break" &&
      segments[i + 2].end === segments[i + 3].start
    ) {
      isUsed[i] = isUsed[i + 1] = isUsed[i + 2] = isUsed[i + 3] = true;

      for (let j = 0; j < 4; j++) {
        const pomodoroIndex = Math.floor(j / 2);
        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          index: assignedCount + 1 + pomodoroIndex,
          start: segments[i + j].start,
          end: segments[i + j].end,
          pomoType: "🍒",
          assignedPomodoroSegment: segments[i + j],
          category: "working",
          completed: false,
          usingRealPomo: false,
        });
      }
      assignedCount += 2;
    }
  }

  if (assignedCount < needCount) {
    let overflowStartTime: number;
    if (segments.length > 0) {
      overflowStartTime = segments[segments.length - 1].end;
    } else {
      const overflowBaseDate = new Date(appDateTimestamp);
      overflowBaseDate.setHours(22, 0, 0, 0);
      overflowStartTime = overflowBaseDate.getTime();
    }

    while (assignedCount < needCount) {
      const duration = 60 * 60 * 1000;
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        index: assignedCount + 1,
        start: overflowStartTime,
        end: overflowStartTime + duration,
        pomoType: "🍒",
        category: "working",
        overflow: true,
        completed: false,
        usingRealPomo: false,
      });
      overflowStartTime += duration;
      assignedCount++;
    }
  }
}

// ========== 从指定位置重新分配单个todo的时间段 ==========

/**
 * 从指定位置重新分配单个todo的时间段
 */
export function reallocateTodoFromPosition(
  appDateTimestamp: number,
  todo: Todo,
  startSegmentIndex: number,
  pomodoroSegments: PomodoroSegment[],
  existingTodoSegments: TodoSegment[] = []
): TodoSegment[] {
  const needCount = getTodoDisplayPomoCount(todo);
  const todoSegments: TodoSegment[] = [];

  const categorySegs = pomodoroSegments
    .filter((seg) => {
      const targetCategory = todo.pomoType === "🍇" ? "living" : "working";
      return (
        seg.category === targetCategory &&
        (seg.type === "work" || seg.type === "break")
      );
    })
    .sort((a, b) => a.start - b.start);

  const used = new Array(categorySegs.length).fill(false);

  existingTodoSegments
    .filter((seg) => seg.todoId !== todo.id)
    .forEach((seg) => {
      if (seg.assignedPomodoroSegment) {
        const index = categorySegs.findIndex(
          (s) => s === seg.assignedPomodoroSegment
        );
        if (index >= 0) used[index] = true;
      }
    });

  const targetSeg = pomodoroSegments[startSegmentIndex];
  const startIndex = categorySegs.findIndex((seg) => seg === targetSeg);

  if (startIndex === -1) {
    return [];
  }

  if (todo.pomoType === "🍅" || !todo.pomoType) {
    _allocateTomatoSegmentsFromIndex(
      appDateTimestamp,
      todo,
      needCount,
      categorySegs,
      used,
      todoSegments,
      startIndex
    );
  } else if (todo.pomoType === "🍇") {
    _allocateGrapeSegmentsFromIndex(
      appDateTimestamp,
      todo,
      needCount,
      categorySegs,
      used,
      todoSegments,
      startIndex
    );
  } else if (todo.pomoType === "🍒") {
    _allocateCherrySegmentsFromIndex(
      appDateTimestamp,
      todo,
      needCount,
      categorySegs,
      used,
      todoSegments,
      startIndex
    );
  }

  return todoSegments;
}

/**
 * 重新分配所有待办事项的时间段
 */
export function reallocateAllTodos(
  appDateTimestamp: number,
  todos: Todo[],
  pomodoroSegments: PomodoroSegment[]
): TodoSegment[] {
  const todoSegments: TodoSegment[] = [];

  for (const todo of todos) {
    const needCount = getTodoDisplayPomoCount(todo);
    if (needCount > 0) {
      const categorySegs = pomodoroSegments.filter((seg) => {
        const targetCategory = todo.pomoType === "🍇" ? "living" : "working";
        return (
          seg.category === targetCategory &&
          (seg.type === "work" || seg.type === "break")
        );
      });

      const assignedSegments = generateEstimatedTodoSegments(
        appDateTimestamp,
        [todo],
        categorySegs
      );
      todoSegments.push(...assignedSegments);
    }
  }

  return todoSegments;
}

/**
 * 从指定索引开始分配番茄段
 */
function _allocateTomatoSegmentsFromIndex(
  appDateTimestamp: number,
  todo: Todo,
  needCount: number,
  segments: PomodoroSegment[],
  isUsed: boolean[],
  todoSegments: TodoSegment[],
  startIndex: number
): void {
  let assignedCount = 0;

  for (
    let i = startIndex;
    i < segments.length && assignedCount < needCount;
    i++
  ) {
    if (!isUsed[i] && segments[i].type === "work") {
      let segmentEnd = segments[i].end;
      let span = 0;

      if (
        i + 1 < segments.length &&
        !isUsed[i + 1] &&
        segments[i + 1].type === "break" &&
        segments[i].end === segments[i + 1].start
      ) {
        segmentEnd = segments[i + 1].end;
        isUsed[i + 1] = true;
        span = 1;
      }

      isUsed[i] = true;
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        index: assignedCount + 1,
        start: segments[i].start,
        end: segmentEnd,
        pomoType: "🍅",
        assignedPomodoroSegment: segments[i],
        category: "working",
        completed: false,
        usingRealPomo: false,
      });
      assignedCount++;
      i += span;
    }
  }

  if (assignedCount < needCount) {
    let overflowStartTime: number;
    if (segments.length > 0) {
      overflowStartTime = segments[segments.length - 1].end;
    } else {
      const overflowBaseDate = new Date(appDateTimestamp);
      overflowBaseDate.setHours(22, 0, 0, 0);
      overflowStartTime = overflowBaseDate.getTime();
    }

    while (assignedCount < needCount) {
      const duration = 25 * 60 * 1000;
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        index: assignedCount + 1,
        start: overflowStartTime,
        end: overflowStartTime + duration,
        pomoType: "🍅",
        category: "working",
        overflow: true,
        completed: false,
        usingRealPomo: false,
      });
      overflowStartTime += duration;
      assignedCount++;
    }
  }
}

/**
 * 从指定索引开始分配🍇葡萄段
 */
function _allocateGrapeSegmentsFromIndex(
  appDateTimestamp: number,
  todo: Todo,
  needCount: number,
  segments: PomodoroSegment[],
  isUsed: boolean[],
  todoSegments: TodoSegment[],
  startIndex: number
): void {
  let assignedCount = 0;

  for (
    let i = startIndex;
    i < segments.length && assignedCount < needCount;
    i++
  ) {
    if (!isUsed[i] && segments[i].type === "work") {
      let segmentEnd = segments[i].end;
      let span = 0;

      if (
        i + 1 < segments.length &&
        !isUsed[i + 1] &&
        segments[i + 1].type === "break" &&
        segments[i].end === segments[i + 1].start
      ) {
        segmentEnd = segments[i + 1].end;
        isUsed[i + 1] = true;
        span = 1;
      }

      isUsed[i] = true;
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        index: assignedCount + 1,
        start: segments[i].start,
        end: segmentEnd,
        pomoType: "🍇",
        assignedPomodoroSegment: segments[i],
        category: "living",
        completed: false,
        usingRealPomo: false,
      });
      assignedCount++;
      i += span;
    }
  }

  if (assignedCount < needCount) {
    let overflowStartTime: number;
    if (segments.length > 0) {
      overflowStartTime = segments[segments.length - 1].end;
    } else {
      const overflowBaseDate = new Date(appDateTimestamp);
      overflowBaseDate.setHours(22, 0, 0, 0);
      overflowStartTime = overflowBaseDate.getTime();
    }

    while (assignedCount < needCount) {
      const duration = 25 * 60 * 1000;
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        index: assignedCount + 1,
        start: overflowStartTime,
        end: overflowStartTime + duration,
        pomoType: "🍇",
        category: "living",
        overflow: true,
        completed: false,
        usingRealPomo: false,
      });
      overflowStartTime += duration;
      assignedCount++;
    }
  }
}

/**
 * 从指定索引开始分配🍒樱桃段
 */
function _allocateCherrySegmentsFromIndex(
  appDateTimestamp: number,
  todo: Todo,
  needCount: number,
  segments: PomodoroSegment[],
  isUsed: boolean[],
  todoSegments: TodoSegment[],
  startIndex: number
): void {
  let assignedCount = 0;

  for (
    let i = startIndex;
    i < segments.length - 3 && assignedCount < needCount;
    i++
  ) {
    if (
      !isUsed[i] &&
      segments[i].type === "work" &&
      !isUsed[i + 1] &&
      segments[i + 1].type === "break" &&
      segments[i].end === segments[i + 1].start &&
      !isUsed[i + 2] &&
      segments[i + 2].type === "work" &&
      segments[i + 1].end === segments[i + 2].start &&
      !isUsed[i + 3] &&
      segments[i + 3].type === "break" &&
      segments[i + 2].end === segments[i + 3].start
    ) {
      isUsed[i] = isUsed[i + 1] = isUsed[i + 2] = isUsed[i + 3] = true;

      for (let j = 0; j < 4; j++) {
        const pomodoroIndex = Math.floor(j / 2);
        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          index: assignedCount + 1 + pomodoroIndex,
          start: segments[i + j].start,
          end: segments[i + j].end,
          pomoType: "🍒",
          assignedPomodoroSegment: segments[i + j],
          category: "working",
          completed: false,
          usingRealPomo: false,
        });
      }
      assignedCount += 2;
    }
  }

  if (assignedCount < needCount) {
    let overflowStartTime: number;
    if (segments.length > 0) {
      overflowStartTime = segments[segments.length - 1].end;
    } else {
      const overflowBaseDate = new Date(appDateTimestamp);
      overflowBaseDate.setHours(22, 0, 0, 0);
      overflowStartTime = overflowBaseDate.getTime();
    }

    while (assignedCount < needCount) {
      const duration = 60 * 60 * 1000;
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        index: assignedCount + 1,
        start: overflowStartTime,
        end: overflowStartTime + duration,
        pomoType: "🍒",
        category: "working",
        overflow: true,
        completed: false,
        usingRealPomo: false,
      });
      overflowStartTime += duration;
      assignedCount++;
    }
  }
}
