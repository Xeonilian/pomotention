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
 * 根据todo状态决定使用estPomo还是realPomo 保证至少一个，UI使用
 */
export function getTodoDisplayPomoCount(todo: Todo): number {
  if (todo.status === "done") {
    const real = _getTodoRealPomoCount(todo);
    return Math.max(1, real);
  } else {
    const est = _getTodoEstPomoCount(todo);
    return Math.max(1, est);
  }
}

// 工具：把 cursor 之前的段标记为已用，阻止任何“回填前面的洞”
function _sealBeforeCursorAsUsed(
  segs: PomodoroSegment[],
  usedFlags: boolean[],
  cursorPos: number
) {
  for (let i = 0; i < cursorPos && i < segs.length; i++) {
    usedFlags[i] = true;
  }
}

// 工具：从 cursor 起向后分配 1 段（work + 可选紧邻 break），用于“兜底为 1”的占位
function _allocateOneAfterCursor(
  appDateTimestamp: number,
  todo: Todo,
  segs: PomodoroSegment[],
  usedFlags: boolean[],
  cursor: number,
  todoSegments: TodoSegment[]
): boolean {
  let i = Math.max(0, cursor);
  // 把搜索起点推进到下一个 work
  while (i < segs.length && segs[i].type !== "work") i++;

  for (; i < segs.length; i++) {
    if (segs[i].type !== "work") continue;
    if (usedFlags[i]) continue;

    let end = segs[i].end;
    // 若紧跟 break 且未用，合并
    if (
      i + 1 < segs.length &&
      segs[i + 1].type === "break" &&
      !usedFlags[i + 1] &&
      segs[i].end === segs[i + 1].start
    ) {
      end = segs[i + 1].end;
      usedFlags[i + 1] = true;
      cursor = Math.max(cursor, i + 2);
    } else {
      cursor = Math.max(cursor, i + 1);
    }

    usedFlags[i] = true;

    // 继承真实段的 category
    todoSegments.push({
      todoId: todo.id,
      priority: todo.priority,
      todoTitle: todo.activityTitle,
      todoIndex: 1,
      start: segs[i].start,
      end,
      pomoType: (todo.pomoType as any) || "🍅",
      assignedPomodoroSegment: segs[i],
      category: segs[i].category,
      completed: false,
      usingRealPomo: false,
    });

    return true;
  }

  // 没有可用 work 段，接到尾部 overflow
  const baseEnd = segs.length
    ? segs[segs.length - 1].end
    : (() => {
        const d = new Date(appDateTimestamp);
        d.setHours(22, 0, 0, 0);
        return d.getTime();
      })();

  const duration = todo.pomoType === "🍒" ? 60 * 60 * 1000 : 25 * 60 * 1000;

  todoSegments.push({
    todoId: todo.id,
    priority: todo.priority,
    todoTitle: todo.activityTitle,
    todoIndex: 1,
    start: baseEnd,
    end: baseEnd + duration,
    pomoType: (todo.pomoType as any) || "🍅",
    // overflow 段没有真实 pomodoro 段，category 可为空
    overflow: true,
    completed: false,
    usingRealPomo: false,
  });
  // 溢出不回退 cursor
  return true;
}
// ========== 估计分配相关函数 ==========

// ========== 番茄时间段生成 ==========

/**
 * 将时间块分割为番茄时间段，排除已安排的活动
 */
export function splitIndexPomoBlocksExSchedules(
  appDateTimestamp: number,
  blocks: Block[],
  schedules: {
    activityDueRange: [number | null, string];
    isUntaetigkeit?: boolean;
  }[]
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
  let globalIndexCounter = 1;

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
      let idx = 1;

      while (aEnd - cur >= 30 * 60 * 1000) {
        // work：计入全局顺序
        segments.push({
          parentBlockId: block.id,
          type: "work",
          start: cur,
          end: cur + 25 * 60 * 1000,
          category: block.category,
          pomoIndex: idx, // 原有（同类内序号）
          globalIndex: globalIndexCounter, // 新增：仅 work 写入
        });
        cur += 25 * 60 * 1000;

        // break：不计数，不写 globalIndex
        segments.push({
          parentBlockId: block.id,
          type: "break",
          start: cur,
          end: cur + 5 * 60 * 1000,
          category: block.category,
          // 不写 globalIndex
        });
        cur += 5 * 60 * 1000;

        // 完成一个番茄后再自增 idx
        idx++;
        globalIndexCounter++;
      }

      // 尾部仍有 25min 的 work（也要计入）
      if (aEnd - cur >= 25 * 60 * 1000) {
        segments.push({
          parentBlockId: block.id,
          type: "work",
          start: cur,
          end: cur + 25 * 60 * 1000,
          category: block.category,
          pomoIndex: idx,
          globalIndex: globalIndexCounter, // 只给 work
        });
        idx++;
        globalIndexCounter++;
      }
    }
  });

  return segments.sort((a, b) => a.start - b.start);
}

/**
 * 生成估计的todo时间段分配
 */
export function generateEstimatedTodoSegments(
  appDateTimestamp: number,
  todos: Todo[],
  pomodoroSegments: PomodoroSegment[]
): TodoSegment[] {
  const todoSegments: TodoSegment[] = [];

  // 1) 统一段池：仅保留 work/break，并按时间排序
  const allSegs = pomodoroSegments
    .filter((seg) => seg.type === "work" || seg.type === "break")
    .sort((a, b) => a.start - b.start);

  // 2) 已用标记（与 allSegs 对齐）
  const used = new Array(allSegs.length).fill(false);

  // 3) 全局“分配游标”，只前进不回退（用于不回填之前的洞）
  let cursor = Math.max(
    0,
    allSegs.findIndex((s) => s.type === "work")
  );

  // 4) 任务排序
  const sortedTodos = [...todos].sort((a, b) => {
    if ((a.priority ?? 0) === 0 && (b.priority ?? 0) === 0) return 0;
    if ((a.priority ?? 0) === 0) return 1;
    if ((b.priority ?? 0) === 0) return -1;
    return (a.priority ?? 0) - (b.priority ?? 0);
  });

  // 5) 分配循环
  for (const todo of sortedTodos) {
    const needCount = getTodoDisplayPomoCount(todo);
    if (needCount === 0) continue;

    // A) 若存在 positionIndex（面向“工作段的序号”），以全局 work-only 视角处理
    if (
      typeof (todo as any).positionIndex === "number" &&
      (todo as any).positionIndex >= 0
    ) {
      const workSegs = allSegs.filter((s) => s.type === "work");
      const localUsedWork = new Array(workSegs.length).fill(false);

      let assignedCount = 0;
      for (let i = 0; i < needCount; i++) {
        const workIdx = (todo as any).positionIndex + i;
        if (workIdx < workSegs.length && !localUsedWork[workIdx]) {
          localUsedWork[workIdx] = true;

          const assignedPs = workSegs[workIdx]; // 具体 work 段
          const realIdx = allSegs.findIndex((s) => s === assignedPs);

          // 端点
          let segStart = assignedPs.start;
          let segEnd = assignedPs.end;

          // 尝试合并紧邻 break（若未用）
          if (
            realIdx >= 0 &&
            realIdx + 1 < allSegs.length &&
            allSegs[realIdx + 1].type === "break" &&
            allSegs[realIdx].end === allSegs[realIdx + 1].start &&
            used[realIdx + 1] === false
          ) {
            segEnd = allSegs[realIdx + 1].end;
            used[realIdx + 1] = true;
            cursor = Math.max(cursor, realIdx + 2);
          } else if (realIdx >= 0) {
            cursor = Math.max(cursor, realIdx + 1);
          }

          // 标记全局 used 中的该 work 段
          if (realIdx >= 0) used[realIdx] = true;

          todoSegments.push({
            todoId: todo.id,
            priority: todo.priority,
            todoTitle: todo.activityTitle,
            todoIndex: i + 1,
            start: segStart,
            end: segEnd,
            pomoType: (todo.pomoType as any) || "🍅",
            assignedPomodoroSegment: assignedPs,
            category: assignedPs.category, // 继承真实段类别
            completed: false,
            usingRealPomo: false,
          });

          assignedCount++;
        }
      }

      // 不足部分走 overflow
      while (assignedCount < needCount) {
        let overflowStartTime: number;
        if (allSegs.length > 0) {
          overflowStartTime = allSegs[allSegs.length - 1].end;
        } else {
          const overflowBaseDate = new Date(appDateTimestamp);
          overflowBaseDate.setHours(22, 0, 0, 0);
          overflowStartTime = overflowBaseDate.getTime();
        }

        const duration =
          (todo.pomoType as any) === "🍒" ? 60 * 60 * 1000 : 25 * 60 * 1000;

        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          todoIndex: assignedCount + 1,
          start: overflowStartTime,
          end: overflowStartTime + duration,
          pomoType: (todo.pomoType as any) || "🍅",
          overflow: true,
          completed: false,
          usingRealPomo: false,
        });
        assignedCount++;
      }
      continue; // 手动分配结束
    }

    // B) 兜底为 1 的占位（估算为 0 但显示需要 1）
    const estRaw = _getTodoEstPomoCount(todo);
    if (estRaw === 0 && needCount === 1) {
      _allocateOneAfterCursor(
        appDateTimestamp,
        todo,
        allSegs,
        used,
        cursor,
        todoSegments
      );
      continue; // 防止后续再次分配
    }

    // C) 正常任务：不回填。封印 cursor 之前的段，再走专用分配函数
    _sealBeforeCursorAsUsed(allSegs, used, cursor);

    const startIndex = Math.max(cursor, 0); // 以当前游标作为默认起点

    if ((todo.pomoType as any) === "🍅" || !todo.pomoType) {
      _allocateTomatoSegmentsFromIndex(
        appDateTimestamp,
        todo,
        needCount,
        allSegs,
        used,
        todoSegments,
        startIndex
      );
    } else if ((todo.pomoType as any) === "🍇") {
      _allocateGrapeSegmentsFromIndex(
        appDateTimestamp,
        todo,
        needCount,
        allSegs,
        used,
        todoSegments,
        startIndex
      );
    } else if ((todo.pomoType as any) === "🍒") {
      _allocateCherrySegmentsFromIndex(
        appDateTimestamp,
        todo,
        needCount,
        allSegs,
        used,
        todoSegments,
        startIndex
      );
    }

    while (cursor < allSegs.length && used[cursor]) cursor++;
  }
  // console.log(
  //   todoSegments
  //     .map(
  //       (s) =>
  //         `Id=${s.todoId} todoIndex=${s.todoIndex} pomoType=${
  //           s.pomoType
  //         } assignedPomoIndex=${
  //           s.assignedPomodoroSegment?.pomoIndex ?? "null"
  //         } globalIndex=${
  //           s.assignedPomodoroSegment?.globalIndex ?? "null"
  //         }  priority=${s.priority}  ${s.start} - ${s.end}`
  //     )
  //     .join("\n")
  // );
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
          todoIndex: pomodoroIndex + 1,
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
        todoIndex: assignedCount + 1,
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
        todoIndex: assignedCount + 1,
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
        todoIndex: assignedCount + 1,
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
        todoIndex: assignedCount + 1,
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
        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          todoIndex: j + 1,
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
        todoIndex: assignedCount + 1,
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
