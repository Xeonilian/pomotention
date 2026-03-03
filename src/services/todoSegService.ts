import type { TodoSegment, PomodoroSegment } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import { SPECIAL_PRIORITIES } from "@/core/priorityCategories";

// ========== Todo 估计分配相关工具函数（第二列） ==========

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
 * 根据todo状态决定使用estPomo还是realPomo，保证至少一个（供UI显示和估计分配用）
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

/**
 * 验证 globalIndex 是否有效（仅检查范围内且为 pomo）
 */
function isValidGlobalIndex(globalIndex: number, segments: PomodoroSegment[]): boolean {
  if (globalIndex < 0 || globalIndex >= segments.length) return false;
  const seg = segments[globalIndex];
  return seg.type === "pomo";
}

/**
 * 查找最近的有效globalIndex，在anchorIndex附近搜索，允许一定偏差
 */
function findNearestValidGlobalIndex(
  anchorIndex: number,
  segments: PomodoroSegment[],
  usedGlobalIndices: Set<number>,
  maxOffset: number = 20,
): number | null {
  if (anchorIndex >= 0 && anchorIndex < segments.length) {
    if (isValidGlobalIndex(anchorIndex, segments) && !usedGlobalIndices.has(anchorIndex)) return anchorIndex;
  }
  for (let offset = 1; offset <= maxOffset; offset++) {
    const prevIndex = anchorIndex - offset;
    if (prevIndex >= 0 && isValidGlobalIndex(prevIndex, segments) && !usedGlobalIndices.has(prevIndex)) return prevIndex;
    const nextIndex = anchorIndex + offset;
    if (nextIndex < segments.length && isValidGlobalIndex(nextIndex, segments) && !usedGlobalIndices.has(nextIndex)) return nextIndex;
  }
  return null;
}

/**
 * 根据当前时间得到锚点下标：新加 todo 优先放到“当前时间所在格子”，只按时间不按 category。
 * 先找 [start,end) 包含 nowMs 的 pomo；没有则找第一个 start>=nowMs 的 pomo。
 */
function getAnchorIndexForCurrentTime(segments: PomodoroSegment[], nowMs: number): number {
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type !== "pomo") continue;
    if (seg.start <= nowMs && nowMs < seg.end) return i;
  }
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (seg.type !== "pomo") continue;
    if (seg.start >= nowMs) return i;
  }
  return segments.length > 0 ? segments.length - 1 : 0;
}

/**
 * 生成估计的todo时间段分配（第二列）
 * 仅按时间轴格子和 globalIndex 来决定位置，不再强制 tomato/🍒 对应 working、🍇 对应 living
 */
export function generateEstimatedTodoSegments(appDateTimestamp: number, todos: Todo[], pomodoroSegments: PomodoroSegment[]): TodoSegment[] {
  const usedGlobalIndices: Set<number> = new Set();
  const todoSegments: TodoSegment[] = [];

  // 特殊优先级值不生成TodoSegment（只在 emoji 里展示）
  const activeTodos = todos.filter((t) => t.status !== "cancelled" && !SPECIAL_PRIORITIES.includes(t.priority));

  // 排序：先手动（有globalIndex），再自动；内部按 globalIndex / priority / id
  const sortedTodos = [...activeTodos].sort((a, b) => {
    const aIsManual = typeof a.globalIndex === "number" && a.globalIndex >= 0;
    const bIsManual = typeof b.globalIndex === "number" && b.globalIndex >= 0;

    if (aIsManual && !bIsManual) return -1;
    if (!aIsManual && bIsManual) return 1;

    if (aIsManual && bIsManual) {
      if (a.globalIndex! !== b.globalIndex!) {
        return a.globalIndex! - b.globalIndex!;
      }
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
    }

    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    return a.id - b.id;
  });

  // 循环处理每一个待办事项分配todoSegment
  for (const todo of sortedTodos) {
    let hasGlobalIndex = typeof todo.globalIndex === "number" && todo.globalIndex >= 0;
    let anchorIndex = 0;

    if (hasGlobalIndex) {
      if (!isValidGlobalIndex(todo.globalIndex!, pomodoroSegments)) {
        const nearestIndex = findNearestValidGlobalIndex(todo.globalIndex!, pomodoroSegments, usedGlobalIndices, 20);

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
    } else {
      // 无 globalIndex：按当前时间对应格子为锚点，占位则由 findWindowStartIndex 向下找空位
      anchorIndex = getAnchorIndexForCurrentTime(pomodoroSegments, Date.now());
    }

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
          todoSegments,
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
          todoSegments,
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
          todoSegments,
        );
        break;

      default:
        console.error(`[TodoSegService] 未知的 PomoType: ${todo.pomoType} for Todo #${todo.id}`);
        break;
    }
  }

  return todoSegments;
}

// ========== 线性分配：普通番茄 🍅 ==========

function _allocateTomatoSegmentsFromIndex(
  appDateTimestamp: number,
  needCount: number,
  anchorIndex: number,
  hasGlobalIndex: boolean,
  usedGlobalIndices: Set<number>,
  todo: Todo,
  segments: PomodoroSegment[],
  todoSegments: TodoSegment[],
): void {
  let assignedCount = 0;

  // 对于手动分配（有 globalIndex 的 todo），只在「时间格子本身失效」时才允许轻微移动，
  // 不再因为该格子已被别的 todo 占用而把锚点整体挪走，避免“上面的 todo 变动导致下面的 todo 位置跟着漂移”。
  if (hasGlobalIndex && !isValidGlobalIndex(anchorIndex, segments)) {
    const nearestIndex = findNearestValidGlobalIndex(anchorIndex, segments, usedGlobalIndices, 10);
    if (nearestIndex !== null) {
      anchorIndex = nearestIndex;
    } else {
      // 找不到有效位置，降级为自动分配模式（结构变化太大，只能重新自动排）
      hasGlobalIndex = false;
    }
  }

  if (!hasGlobalIndex) {
    const windowStart = findWindowStartIndex(segments, usedGlobalIndices, anchorIndex, needCount, () => true);
    if (windowStart !== null && windowStart !== anchorIndex) {
      anchorIndex = windowStart;
    }
  }

  for (let i = anchorIndex; i < segments.length && assignedCount < needCount; i++) {
    const currentPomoSeg = segments[i];

    if (hasGlobalIndex && assignedCount === 0 && i > anchorIndex + 2) break;

    if (currentPomoSeg.type !== "pomo") continue;

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
        if (nextSeg.type === "break" && !usedGlobalIndices.has(nextSeg.globalIndex!)) {
          lastAdded.end = nextSeg.end;
          usedGlobalIndices.add(nextSeg.globalIndex!);
        }
      }
    }
  }

  // 溢出：不足 needCount 时，按 25 分钟一段向后平铺
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

// ========== 线性分配：生活番茄 🍇 ==========

function _allocateGrapeSegmentsFromIndex(
  appDateTimestamp: number,
  needCount: number,
  anchorIndex: number,
  hasGlobalIndex: boolean,
  usedGlobalIndices: Set<number>,
  todo: Todo,
  segments: PomodoroSegment[],
  todoSegments: TodoSegment[],
): void {
  let assignedCount = 0;

  // 同 _allocateTomatoSegmentsFromIndex，对手动分配的生活番茄仅在格子本身失效时才尝试就近调整，
  // 不因为格子被占用而挪动锚点，避免连锁位移。
  if (hasGlobalIndex && !isValidGlobalIndex(anchorIndex, segments)) {
    const nearestIndex = findNearestValidGlobalIndex(anchorIndex, segments, usedGlobalIndices, 10);
    if (nearestIndex !== null) {
      anchorIndex = nearestIndex;
    } else {
      hasGlobalIndex = false;
    }
  }

  if (!hasGlobalIndex) {
    const windowStart = findWindowStartIndex(segments, usedGlobalIndices, anchorIndex, needCount, () => true);
    if (windowStart !== null && windowStart !== anchorIndex) {
      anchorIndex = windowStart;
    }
  }

  for (let i = anchorIndex; i < segments.length && assignedCount < needCount; i++) {
    const currentPomoSeg = segments[i];

    if (hasGlobalIndex && assignedCount === 0 && i > anchorIndex + 2) break;

    if (currentPomoSeg.type !== "pomo") continue;

    const isConflict = usedGlobalIndices.has(currentPomoSeg.globalIndex!);

    if (isConflict && !hasGlobalIndex) {
      continue;
    }

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

    if (!isConflict) {
      const lastAdded = todoSegments[todoSegments.length - 1];
      const nextSegIndex = i + 1;
      if (nextSegIndex < segments.length) {
        const nextSeg = segments[nextSegIndex];
        if (nextSeg.type === "break" && !usedGlobalIndices.has(nextSeg.globalIndex!)) {
          lastAdded.end = nextSeg.end;
          usedGlobalIndices.add(nextSeg.globalIndex!);
        }
      }
    }
  }

  // 溢出：不足 needCount 时，按 25 分钟一段向后平铺
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

// ========== 结构分配：樱桃番茄 🍒 ==========

function _allocateCherrySegmentsFromIndex(
  appDateTimestamp: number,
  needCount: number, // 预期为 2，代表一个完整的樱桃单元 (100分钟)
  anchorIndex: number,
  hasGlobalIndex: boolean,
  usedGlobalIndices: Set<number>,
  todo: Todo,
  segments: PomodoroSegment[],
  todoSegments: TodoSegment[],
): void {
  let assigned = false;

  if (!hasGlobalIndex) {
    const windowStart = findWindowStartIndex(segments, usedGlobalIndices, anchorIndex, needCount, () => true);
    if (windowStart !== null && windowStart !== anchorIndex) {
      anchorIndex = windowStart;
    }
  }

  for (let i = anchorIndex; i < segments.length - 3; i += 1) {
    if (hasGlobalIndex && i > anchorIndex + 2) break;

    const seg1 = segments[i];
    const seg2 = segments[i + 1];
    const seg3 = segments[i + 2];

    const isConflict =
      usedGlobalIndices.has(seg1.globalIndex!) || usedGlobalIndices.has(seg2.globalIndex!) || usedGlobalIndices.has(seg3.globalIndex!);

    const isSlotValid = (s1: PomodoroSegment, s2: PomodoroSegment, s3: PomodoroSegment): boolean => {
      if (s1.type !== "pomo" || s2.type !== "break" || s3.type !== "pomo") return false;
      return true;
    };

    if (isSlotValid(seg1, seg2, seg3)) {
      const actualCategory = seg1.category;

      const fifteenMin = 15 * 60 * 1000;
      const baseStart = seg1.start;

      // 一次性创建 4 个 TodoSegment（每个 15 分钟，从 seg1.start 起连续）
      for (let j = 0; j < 4; j += 1) {
        const start = baseStart + j * fifteenMin;
        const end = start + fifteenMin;

        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          todoIndex: j + 1,
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

      usedGlobalIndices.add(seg1.globalIndex!);
      usedGlobalIndices.add(seg2.globalIndex!);
      usedGlobalIndices.add(seg3.globalIndex!);

      assigned = true;
      break;
    }
  }

  // 溢出逻辑：没有找到合适位置时，从当天末尾往后平铺
  if (!assigned) {
    let overflowStartTime: number;
    if (segments.length > 0) {
      overflowStartTime = segments[segments.length - 1].end;
    } else {
      const overflowBaseDate = new Date(appDateTimestamp);
      overflowBaseDate.setHours(22, 0, 0, 0);
      overflowStartTime = overflowBaseDate.getTime();
    }

    for (let i = 0; i < needCount; i++) {
      const duration = 60 * 60 * 1000;
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

// ========== 通用：从某个 anchor 向后找一段连续可用窗 ==========

function findWindowStartIndex(
  segments: PomodoroSegment[],
  usedGlobalIndices: Set<number>,
  anchorIndex: number,
  needCount: number,
  categoryPredicate: (seg: PomodoroSegment) => boolean,
): number | null {
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
        continue;
      }

      if (!categoryPredicate(seg)) {
        continue;
      }

      if (usedGlobalIndices.has(seg.globalIndex!)) {
        blocked = true;
        break;
      }

      collected += 1;
      picked.push(seg.globalIndex!);
    }

    if (!blocked && collected >= needCount) {
      return i;
    }
  }

  console.warn("[TodoSegService] findWindowStartIndex: NO WINDOW FOUND (keep original anchorIndex)");
  return null;
}
