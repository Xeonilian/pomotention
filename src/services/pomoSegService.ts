// src/services/pomoSegService.ts
import type { Block, TodoSegment, PomodoroSegment } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import { getTimestampForTimeString } from "@/core/utils";
import { SPECIAL_PRIORITIES } from "@/core/priorityCategories";

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
 */
function _getTodoRealPomoCount(todo: Todo): number {
  if (!todo.realPomo) return 0;
  const rawCount = todo.realPomo.reduce((sum, cur) => sum + (typeof cur === "number" ? cur : 0), 0);
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

// ========== 番茄时间段生成 ==========
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

// ========== 从指定位置重新分配单个todo的时间段 ==========

/**
 * 验证globalIndex是否有效
 * 检查是否在范围内、类型和category是否正确
 */
function isValidGlobalIndex(globalIndex: number, segments: PomodoroSegment[], targetCategory: string, hasGlobalIndex: boolean): boolean {
  if (globalIndex < 0 || globalIndex >= segments.length) return false;
  const seg = segments[globalIndex];
  return seg.type === "pomo" && (hasGlobalIndex ? true : seg.category === targetCategory);
}

/**
 * 查找最近的有效globalIndex
 * 在anchorIndex附近搜索，允许一定偏差
 */
function findNearestValidGlobalIndex(
  anchorIndex: number,
  segments: PomodoroSegment[],
  targetCategory: string,
  usedGlobalIndices: Set<number>,
  maxOffset: number = 20, // 允许的最大偏差
  hasGlobalIndex: boolean
): number | null {
  // 先检查anchorIndex本身（如果未被占用）
  if (anchorIndex >= 0 && anchorIndex < segments.length) {
    if (isValidGlobalIndex(anchorIndex, segments, targetCategory, hasGlobalIndex) && !usedGlobalIndices.has(anchorIndex)) {
      return anchorIndex;
    }
  }

  // 在前后搜索
  for (let offset = 1; offset <= maxOffset; offset++) {
    // 向前搜索
    const prevIndex = anchorIndex - offset;
    if (prevIndex >= 0 && isValidGlobalIndex(prevIndex, segments, targetCategory, hasGlobalIndex) && !usedGlobalIndices.has(prevIndex)) {
      return prevIndex;
    }
    // 向后搜索
    const nextIndex = anchorIndex + offset;
    if (
      nextIndex < segments.length &&
      isValidGlobalIndex(nextIndex, segments, targetCategory, hasGlobalIndex) &&
      !usedGlobalIndices.has(nextIndex)
    ) {
      return nextIndex;
    }
  }
  return null;
}

/**
 * 生成估计的todo时间段分配 (修正版)
 * 不再使用positionIndex会有错误数据，暂不处理 #TODO
 */
export function generateEstimatedTodoSegments(appDateTimestamp: number, todos: Todo[], pomodoroSegments: PomodoroSegment[]): TodoSegment[] {
  // 1. 初始化
  const usedGlobalIndices: Set<number> = new Set();
  const todoSegments: TodoSegment[] = [];
  // 特殊优先级值不生成TodoSegment
  const activeTodos = todos.filter((t) => t.status !== "cancelled" && !SPECIAL_PRIORITIES.includes(t.priority));
  // 2. 待办事项排序
  const sortedTodos = [...activeTodos].sort((a, b) => {
    // 这是为了不存在globalIndex而准备的
    const aIsManual = typeof a.globalIndex === "number" && a.globalIndex >= 0;
    const bIsManual = typeof b.globalIndex === "number" && b.globalIndex >= 0;

    if (aIsManual && !bIsManual) return -1;
    if (!aIsManual && bIsManual) return 1;

    if (aIsManual && bIsManual) {
      // 如果两个都是手动任务
      if (a.globalIndex! !== b.globalIndex!) {
        return a.globalIndex! - b.globalIndex!;
      }
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
    }

    // 如果两个都是自动任务，或以上条件都相同，则按原有的优先级规则排序
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    return a.id - b.id;
  });

  // 3. 循环处理每一个待办事项分配todoSegment
  for (const todo of sortedTodos) {
    // 确定目标category
    const targetCategory = todo.pomoType === "🍇" ? "living" : "working";

    // 验证和修复globalIndex
    let hasGlobalIndex = typeof todo.globalIndex === "number" && todo.globalIndex >= 0;
    let anchorIndex = 0;

    if (hasGlobalIndex) {
      // 验证globalIndex是否有效
      if (!isValidGlobalIndex(todo.globalIndex!, pomodoroSegments, targetCategory, hasGlobalIndex)) {
        // 尝试在附近寻找最接近的有效位置
        const nearestIndex = findNearestValidGlobalIndex(
          todo.globalIndex!,
          pomodoroSegments,
          targetCategory,
          usedGlobalIndices,
          20, // 允许20个segment的偏差
          hasGlobalIndex
        );

        if (nearestIndex !== null) {
          // 找到有效位置，更新todo的globalIndex
          todo.globalIndex = nearestIndex;
          anchorIndex = nearestIndex;
        } else {
          // 找不到有效位置，清除globalIndex，让系统自动分配
          todo.globalIndex = undefined;
          hasGlobalIndex = false;
          anchorIndex = 0;
        }
      } else {
        // globalIndex有效，直接使用
        anchorIndex = todo.globalIndex!;
      }
    }

    // 4. 根据任务类型，调用相应的分配函数
    // 获取该 todo 需要显示的番茄数量，如果还没估计也会显示1个
    const pomoCount = getTodoDisplayPomoCount(todo);
    switch (todo.pomoType) {
      case "🍅":
        _allocateTomatoSegmentsFromIndex(
          appDateTimestamp,
          pomoCount,
          anchorIndex,
          hasGlobalIndex,
          usedGlobalIndices,
          todo,
          pomodoroSegments,
          todoSegments
        );
        break;

      case "🍇":
        _allocateGrapeSegmentsFromIndex(
          appDateTimestamp,
          pomoCount,
          anchorIndex,
          hasGlobalIndex,
          usedGlobalIndices,
          todo,
          pomodoroSegments,
          todoSegments
        );
        break;

      case "🍒":
        _allocateCherrySegmentsFromIndex(
          appDateTimestamp,
          pomoCount,
          anchorIndex,
          hasGlobalIndex,
          usedGlobalIndices,
          todo,
          pomodoroSegments,
          todoSegments
        );
        break;

      default:
        console.error(`[PomoSegService] 未知的 PomoType: ${todo.pomoType} for Todo #${todo.id}`);
        break;
    }
  }
  return todoSegments;
}

function _allocateTomatoSegmentsFromIndex(
  appDateTimestamp: number,
  needCount: number,
  anchorIndex: number,
  hasGlobalIndex: boolean,
  usedGlobalIndices: Set<number>,
  todo: Todo,
  segments: PomodoroSegment[],
  todoSegments: TodoSegment[]
): void {
  let assignedCount = 0;
  const targetCategory = "working";

  // 如果hasGlobalIndex但anchorIndex位置无效，尝试在附近搜索
  if (hasGlobalIndex) {
    if (!isValidGlobalIndex(anchorIndex, segments, targetCategory, hasGlobalIndex) || usedGlobalIndices.has(anchorIndex)) {
      const nearestIndex = findNearestValidGlobalIndex(
        anchorIndex,
        segments,
        targetCategory,
        usedGlobalIndices,
        10, // 在手动模式下，允许较小的偏差
        hasGlobalIndex
      );
      if (nearestIndex !== null) {
        anchorIndex = nearestIndex;
      } else {
        // 找不到有效位置，降级为自动分配模式
        hasGlobalIndex = false;
      }
    }
  }

  if (!hasGlobalIndex) {
    const windowStart = findWindowStartIndex(segments, usedGlobalIndices, anchorIndex, needCount, (seg) => seg.category === targetCategory);
    if (windowStart !== null && windowStart !== anchorIndex) {
      anchorIndex = windowStart;
    }
  }

  for (let i = anchorIndex; i < segments.length && assignedCount < needCount; i++) {
    const currentPomoSeg = segments[i];

    // 如果hasGlobalIndex，只允许在anchorIndex位置或非常接近的位置分配第一个segment
    if (hasGlobalIndex && assignedCount === 0 && i > anchorIndex + 2) {
      break;
    }

    const isPomoType = currentPomoSeg.type === "pomo";
    // 自动模式：需要分类严格匹配；手动模式：允许不同分类
    const isCategoryMatch = hasGlobalIndex ? true : currentPomoSeg.category === targetCategory;

    if (!isPomoType || !isCategoryMatch) {
      continue;
    }

    const isConflict = usedGlobalIndices.has(currentPomoSeg.globalIndex!);
    // 用模式而非 anchorIndex 决定是否跳过冲突
    if (isConflict && !hasGlobalIndex) {
      continue;
    }

    // 到这里：
    // - 自动：一定是非冲突槽位
    // - 手动：可能冲突或非冲突
    todoSegments.push({
      todoId: todo.id,
      priority: todo.priority,
      todoTitle: todo.activityTitle,
      todoIndex: assignedCount + 1,
      start: currentPomoSeg.start,
      end: currentPomoSeg.end,
      pomoType: "🍅",
      assignedPomodoroSegment: currentPomoSeg,
      category: isConflict ? "conflict" : currentPomoSeg.category,
      overflow: isConflict,
      completed: false,
      usingRealPomo: false,
      globalIndex: currentPomoSeg.globalIndex,
    });

    usedGlobalIndices.add(currentPomoSeg.globalIndex!);
    assignedCount++;

    // 仅在无冲突时合并 break
    if (!isConflict) {
      const lastAdded = todoSegments[todoSegments.length - 1];
      const nextSegIndex = i + 1;
      if (nextSegIndex < segments.length) {
        const nextSeg = segments[nextSegIndex];
        const isNextSegCategoryMatch = hasGlobalIndex ? true : nextSeg.category === targetCategory;
        if (nextSeg.type === "break" && isNextSegCategoryMatch && !usedGlobalIndices.has(nextSeg.globalIndex!)) {
          lastAdded.end = nextSeg.end;
          usedGlobalIndices.add(nextSeg.globalIndex!);
        }
      }
    }
  }

  // 溢出
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

function _allocateGrapeSegmentsFromIndex(
  appDateTimestamp: number,
  needCount: number,
  anchorIndex: number,
  hasGlobalIndex: boolean, // 手动/自动模式开关：true=手动（仅起点），false=自动（可滑动找窗）
  usedGlobalIndices: Set<number>,
  todo: Todo,
  segments: PomodoroSegment[],
  todoSegments: TodoSegment[]
): void {
  let assignedCount = 0;
  const targetCategory = "living";

  // 如果hasGlobalIndex但startIndex位置无效，尝试在附近搜索
  if (hasGlobalIndex) {
    if (!isValidGlobalIndex(anchorIndex, segments, targetCategory, hasGlobalIndex) || usedGlobalIndices.has(anchorIndex)) {
      const nearestIndex = findNearestValidGlobalIndex(
        anchorIndex,
        segments,
        targetCategory,
        usedGlobalIndices,
        10, // 在手动模式下，允许较小的偏差
        hasGlobalIndex
      );
      if (nearestIndex !== null) {
        anchorIndex = nearestIndex;
      } else {
        // 找不到有效位置，降级为自动分配模式
        hasGlobalIndex = false;
      }
    }
  }

  // 自动模式：尝试滑动寻找满足 needCount 的连续可用窗口（严格匹配 living）
  if (!hasGlobalIndex) {
    const windowStart = findWindowStartIndex(segments, usedGlobalIndices, anchorIndex, needCount, (seg) => seg.category === targetCategory);
    if (windowStart !== null && windowStart !== anchorIndex) {
      anchorIndex = windowStart;
    }
  }

  for (let i = anchorIndex; i < segments.length && assignedCount < needCount; i++) {
    const currentPomoSeg = segments[i];

    // 手动模式：只允许在 anchorIndex 位置或非常接近的位置放置第一块
    if (hasGlobalIndex && assignedCount === 0 && i > anchorIndex + 2) {
      break;
    }

    const isPomoType = currentPomoSeg.type === "pomo";
    // 自动模式：必须严格匹配 living；手动模式：放宽分类限制
    const isCategoryMatch = hasGlobalIndex ? true : currentPomoSeg.category === targetCategory;

    if (!isPomoType || !isCategoryMatch) {
      continue;
    }

    const isConflict = usedGlobalIndices.has(currentPomoSeg.globalIndex!);

    // 自动模式遇冲突直接跳过；手动模式允许占冲突位（标记 conflict/overflow）
    if (isConflict && !hasGlobalIndex) {
      continue;
    }

    // 到这里：
    // - 自动：一定是非冲突槽位
    // - 手动：可能冲突或非冲突
    todoSegments.push({
      todoId: todo.id,
      priority: todo.priority,
      todoTitle: todo.activityTitle,
      todoIndex: assignedCount + 1,
      start: currentPomoSeg.start,
      end: currentPomoSeg.end,
      pomoType: "🍇",
      assignedPomodoroSegment: currentPomoSeg,
      category: isConflict ? "conflict" : currentPomoSeg.category,
      overflow: isConflict,
      completed: false,
      usingRealPomo: false,
      globalIndex: currentPomoSeg.globalIndex,
    });

    usedGlobalIndices.add(currentPomoSeg.globalIndex!);
    assignedCount++;

    // 非冲突时尝试合并紧邻的 break（与 tomato 一致）
    if (!isConflict) {
      const lastAdded = todoSegments[todoSegments.length - 1];
      const nextSegIndex = i + 1;
      if (nextSegIndex < segments.length) {
        const nextSeg = segments[nextSegIndex];
        // 自动模式下需类别一致；手动模式放宽
        const isNextSegCategoryMatch = hasGlobalIndex ? true : nextSeg.category === targetCategory;
        if (nextSeg.type === "break" && isNextSegCategoryMatch && !usedGlobalIndices.has(nextSeg.globalIndex!)) {
          lastAdded.end = nextSeg.end;
          usedGlobalIndices.add(nextSeg.globalIndex!);
        }
      }
    }
  }

  // 溢出：不足 needCount 时，按 25 分钟一段向后平铺（与 tomato 一致）
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
        category: targetCategory,
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
 * 从指定索引开始分配🍒樱桃段 (V3 - 严格四块版)
 * 严格寻找一个连续的 pomo-break-pomo-break 序列。
 *
 * @param needCount - 对于此函数，needCount 预期为 2
 */
function _allocateCherrySegmentsFromIndex(
  appDateTimestamp: number,
  needCount: number, // 预期为 2，代表一个完整的樱桃单元 (100分钟)
  anchorIndex: number,
  hasGlobalIndex: boolean,
  usedGlobalIndices: Set<number>,
  todo: Todo,
  segments: PomodoroSegment[],
  todoSegments: TodoSegment[]
): void {
  let assigned = false; // 我们只需要分配一次，所以用布尔值即可
  const targetCategory = "working";

  // 检查cherry slot是否有效的辅助函数
  const isCherrySlotValid = (idx: number): boolean => {
    if (idx < 0 || idx >= segments.length - 3) return false;
    const s1 = segments[idx];
    const s2 = segments[idx + 1];
    const s3 = segments[idx + 2];
    return (
      s1.type === "pomo" &&
      s2.type === "break" &&
      s3.type === "pomo" &&
      (!hasGlobalIndex || s1.category === targetCategory) &&
      !usedGlobalIndices.has(s1.globalIndex!) &&
      !usedGlobalIndices.has(s2.globalIndex!) &&
      !usedGlobalIndices.has(s3.globalIndex!)
    );
  };

  // 如果hasGlobalIndex但startIndex位置无效，尝试在附近搜索
  if (hasGlobalIndex) {
    if (!isCherrySlotValid(anchorIndex)) {
      // 在附近搜索有效的cherry slot
      let found = false;
      for (let offset = 1; offset <= 10 && !found; offset++) {
        // 向前搜索
        const prevIndex = anchorIndex - offset;
        if (prevIndex >= 0 && isCherrySlotValid(prevIndex)) {
          anchorIndex = prevIndex;
          found = true;
        }
        // 向后搜索
        if (!found) {
          const nextIndex = anchorIndex + offset;
          if (nextIndex < segments.length - 3 && isCherrySlotValid(nextIndex)) {
            anchorIndex = nextIndex;
            found = true;
          }
        }
      }
      if (!found) {
        // 找不到有效位置，降级为自动分配模式
        hasGlobalIndex = false;
      }
    }
  }

  // --- 当没有hasGlobalIndex 步长1验证，hasGlobalIndex则只检验提供的位置---
  if (!hasGlobalIndex) {
    const windowStart = findWindowStartIndex(segments, usedGlobalIndices, anchorIndex, needCount, (seg) => seg.category === targetCategory);
    if (windowStart !== null && windowStart !== anchorIndex) {
      anchorIndex = windowStart;
    }
  }
  for (let i = anchorIndex; i < segments.length - 3; i += 1) {
    // 如果是手动模式，只检查 anchorIndex 位置或非常接近的位置
    if (hasGlobalIndex && i > anchorIndex + 2) {
      break;
    }

    const seg1 = segments[i];
    const seg2 = segments[i + 1];
    const seg3 = segments[i + 2];

    // 3. 可用性检查 (4个块都未被占用)
    const isConflict =
      usedGlobalIndices.has(seg1.globalIndex!) || usedGlobalIndices.has(seg2.globalIndex!) || usedGlobalIndices.has(seg3.globalIndex!);

    // --- 将所有检查条件整合到一个函数中，一目了然 ---
    const isSlotValid = (s1: PomodoroSegment, s2: PomodoroSegment, s3: PomodoroSegment): boolean => {
      const category = s1.category;
      if (!hasGlobalIndex && category !== "working") return false; // 自动模式下必须是 'working'

      // 1. 结构检查 (pomo-break-pomo-break)
      if (s1.type !== "pomo" || s2.type !== "break" || s3.type !== "pomo") return false;

      return true; // 所有检查通过！
    };

    if (isSlotValid(seg1, seg2, seg3)) {
      // 找到了一个完美的 4 块槽位！
      const actualCategory = seg1.category; // 记录实际占用的类别

      const fifteenMin = 15 * 60 * 1000; // 900,000 ms
      const baseStart = seg1.start;

      // 一次性创建 4 个 TodoSegment（每个 15 分钟，从 seg1.start 起连续）
      for (let i = 0; i < 4; i += 1) {
        const start = baseStart + i * fifteenMin;
        const end = start + fifteenMin;

        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          todoIndex: i + 1, // 1, 2, 3, 4
          start,
          end,
          pomoType: "🍒",
          category: actualCategory,
          completed: false,
          usingRealPomo: false,
          overflow: isConflict,
          globalIndex: seg1.globalIndex,
        });
      }

      // 标记所有 4 个块为已使用
      usedGlobalIndices.add(seg1.globalIndex!);
      usedGlobalIndices.add(seg2.globalIndex!);
      usedGlobalIndices.add(seg3.globalIndex!);

      assigned = true;
      break; // 已成功分配，立即跳出循环
    }
  }

  // --- 溢出逻辑 (只有在 assigned 为 false 时才会执行) ---
  if (!assigned) {
    let overflowStartTime: number;
    if (segments.length > 0) {
      overflowStartTime = segments[segments.length - 1].end;
    } else {
      const overflowBaseDate = new Date(appDateTimestamp);
      overflowBaseDate.setHours(22, 0, 0, 0);
      overflowStartTime = overflowBaseDate.getTime();
    }

    // 樱桃任务需要 2 个 pomo，所以创建 2 个溢出块
    for (let i = 0; i < needCount; i++) {
      const duration = 60 * 60 * 1000; // 1小时
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        todoIndex: i + 1,
        start: overflowStartTime,
        end: overflowStartTime + duration,
        pomoType: "🍒",
        category: "working",
        overflow: true,
        completed: false,
        usingRealPomo: false,
      });
      overflowStartTime += duration;
    }
  }
}

// 辅助函数，找到可用窗口
function findWindowStartIndex(
  segments: PomodoroSegment[],
  usedGlobalIndices: Set<number>,
  anchorIndex: number,
  needCount: number,
  categoryPredicate: (seg: PomodoroSegment) => boolean
): number | null {
  // console.group(
  //   `[findWindowStartIndex] anchorIndex=${anchorIndex}, needCount=${needCount}`
  // );
  // console.debug(
  //   "[findWindowStartIndex] usedGlobalIndices:",
  //   Array.from(usedGlobalIndices)
  // );

  for (let i = anchorIndex; i < segments.length; i++) {
    const first = segments[i];

    // 起点必须是未占用、类别匹配的 pomo
    const isValidStart = first && first.type === "pomo" && categoryPredicate(first) && !usedGlobalIndices.has(first.globalIndex!);

    if (!isValidStart) continue;

    let collected = 0;
    const picked: number[] = [];
    let blocked = false;

    // 从 i 开始向后扫描，break/非 pomo 忽略；占用 pomo 或 类别不匹配 pomo 阻断
    for (let j = i; j < segments.length && collected < needCount; j++) {
      const seg = segments[j];

      if (!seg) break;

      if (seg.type !== "pomo") {
        // 非 pomo（例如 break/schedule）直接跳过
        continue;
      }

      // 如果类别不匹配，按“阻断”处理。如果你想允许跳过类别不匹配，把下面两行改为：continue;
      if (!categoryPredicate(seg)) {
        // console.trace("[findWindowStartIndex] block by category mismatch at", {
        //   j,
        //   globalIndex: seg.globalIndex,
        //   category: seg.category,
        // });
        // blocked = true;
        // break;
        continue;
      }

      // 已占用的 pomo 阻断
      if (usedGlobalIndices.has(seg.globalIndex!)) {
        // console.trace("[findWindowStartIndex] block by used pomo at", {
        //   j,
        //   globalIndex: seg.globalIndex,
        // });
        blocked = true;
        break;
      }

      // 可用且匹配的 pomo，计入
      collected += 1;
      picked.push(seg.globalIndex!);

      // console.trace("[findWindowStartIndex] take pomo", {
      //   j,
      //   globalIndex: seg.globalIndex,
      //   collected,
      // });
    }

    // console.debug("[findWindowStartIndex] candidate-result", {
    //   startAt: i,
    //   picked,
    //   collected,
    //   needCount,
    //   blocked,
    // });

    if (!blocked && collected >= needCount) {
      // console.info(
      //   "[findWindowStartIndex] FOUND startAt =",
      //   i,
      //   "picked =",
      //   picked
      // );
      // console.groupEnd();
      return i;
    }
    // 如果被阻断了，继续尝试下一个起点 i+1
  }

  console.warn("[findWindowStartIndex] NO WINDOW FOUND (keep original anchorIndex)");
  // console.groupEnd();
  return null;
}
