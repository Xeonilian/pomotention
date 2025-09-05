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
  }[]
): PomodoroSegment[] {
  // ==================================================================
  // 阶段一：生成所有 Segment，此时不考虑 globalIndex
  // ==================================================================

  // 1. 处理 Schedule 和 Untaetigkeit 块
  const scheduleInfo: Array<{
    range: [number, number];
    isUntaetigkeit: boolean;
  }> = schedules
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
      if (
        !mergedSchedules.length ||
        mergedSchedules[mergedSchedules.length - 1].range[1] < start
      ) {
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
      parentBlockId: "S",
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

    const relatedExcludes = scheduleInfo
      .map((info) => info.range)
      .filter(([s, e]) => e > blockStart && s < blockEnd);
    const availableRanges = _subtractIntervals(
      [blockStart, blockEnd],
      relatedExcludes
    );

    for (const [aStart, aEnd] of availableRanges) {
      let cur = aStart;

      // 第一个 25min 的 pomo
      if (aEnd - cur >= 25 * 60 * 1000) {
        rawSegments.push({
          parentBlockId: block.id,
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
          parentBlockId: block.id,
          type: "break",
          start: cur,
          end: cur + 5 * 60 * 1000,
          category: block.category,
        });
        cur += 5 * 60 * 1000;

        // Pomo 块
        rawSegments.push({
          parentBlockId: block.id,
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
  const finalSegments: PomodoroSegment[] = sortedSegments.map(
    (segment, index) => {
      return {
        ...segment,
        globalIndex: index, // ✨ 黄金标准：用数组的索引作为 globalIndex
      };
    }
  );

  return finalSegments;
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
 * 生成估计的todo时间段分配 (修正版)
 * 不再使用positionIndex会有错误数据，暂不处理 #HACK
 */
export function generateEstimatedTodoSegments(
  appDateTimestamp: number,
  todos: Todo[],
  pomodoroSegments: PomodoroSegment[]
): TodoSegment[] {
  // 1. 初始化
  const usedGlobalIndices: Set<number> = new Set();
  const todoSegments: TodoSegment[] = [];

  // 2. 待办事项排序
  const sortedTodos = [...todos].sort((a, b) => {
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
    let anchorIndex = 0;
    // 提供globalIndex模式 全局模式
    // 首次放置到TimeTable时，是没有设置positionIndex的所以为false，就会激活自动放置
    // 如果是旧数据，没有globalIndex也会激活非手动
    const isGlobal =
      typeof todo.globalIndex === "number" && todo.globalIndex >= 0;

    if (isGlobal) {
      const targetGlobalIndex = todo.globalIndex!; // !让没有定义的变量时不报错

      const foundIndex = pomodoroSegments.findIndex(
        (seg) => seg.globalIndex === targetGlobalIndex
      );

      if (foundIndex !== -1) {
        anchorIndex = foundIndex;
      } else {
        console.warn(
          `[PomoSegService] 手动分配警告: Todo #${todo.id} 指定的 globalIndex ${targetGlobalIndex} 在当前时间块中无效或不存在。将尝试从头开始分配。`
        );
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
          isGlobal,
          anchorIndex,
          usedGlobalIndices,
          todo,
          pomodoroSegments,
          todoSegments
        );
        break;

      case "🍇":
        _allocateGrapeSegmentsFromIndex(
          appDateTimestamp,
          todo,
          pomoCount,
          pomodoroSegments,
          usedGlobalIndices,
          todoSegments,
          anchorIndex,
          isGlobal
        );
        break;

      case "🍒":
        _allocateCherrySegmentsFromIndex(
          appDateTimestamp,
          pomoCount,
          isGlobal,
          anchorIndex,
          usedGlobalIndices,
          todo,
          pomodoroSegments,
          todoSegments
        );
        break;

      default:
        console.error(
          `[PomoSegService] 未知的 PomoType: ${todo.pomoType} for Todo #${todo.id}`
        );
        break;
    }
  }
  // 为todo赋值globalIndex
  const todoMap = new Map<number, Todo>(todos.map((t) => [t.id, t]));

  for (const seg of todoSegments) {
    if (seg.globalIndex === undefined) {
      continue;
    }
    const originalTodo = todoMap.get(seg.todoId);
    if (originalTodo) {
      originalTodo.globalIndex = seg.globalIndex;
    }
  }

  return todoSegments;
}
/**
 * 从指定索引开始分配🍅番茄段 (V3 - 支持跨类别手动摆放)
 */
function _allocateTomatoSegmentsFromIndex(
  appDateTimestamp: number, // 确定基准时间
  needCount: number, // 实际需要的pomo数量，为樱桃设置
  isMannual: boolean, // 基于globalIndex自动分配
  anchorIndex: number, // todo提供查验后的globalIndex
  usedGlobalIndices: Set<number>,
  todo: Todo, // 被分配的Todo信息
  pomodoroSegments: PomodoroSegment[],
  todoSegments: TodoSegment[]
): void {
  let assignedCount = 0;
  const defaultCategory = "working"; // 番茄钟的默认类别

  // 判断提供的基准在pomoSeg范围内，用计数当前配置与需要配置决定是否继续
  for (
    let i = anchorIndex;
    i < pomodoroSegments.length && assignedCount < needCount;
    i++
  ) {
    const currentPomoSeg = pomodoroSegments[i]; //定位这个todo将放置的Pomo位置

    if (isMannual && assignedCount === 0 && i > anchorIndex) {
      break;
    }

    // --- 修改点：条件性类别检查 ---
    // 1. 如果是手动分配 (forceStart)，则不检查类别。
    // 2. 如果是自动分配，则必须匹配默认类别。
    const isCategoryMatch =
      isMannual || currentPomoSeg.category === defaultCategory;

    if (
      currentPomoSeg.type === "pomo" &&
      isCategoryMatch && // 使用新的条件
      !usedGlobalIndices.has(currentPomoSeg.globalIndex!)
    ) {
      let segmentEnd = currentPomoSeg.end;
      const indicesToMarkUsed = [currentPomoSeg.globalIndex!];

      // --- 合并 break 的逻辑也需要同样的条件 ---
      const nextSegIndex = i + 1;
      if (nextSegIndex < pomodoroSegments.length) {
        const nextSeg = pomodoroSegments[nextSegIndex];
        // break 也必须类别匹配（或在手动模式下被忽略）
        const isNextSegCategoryMatch =
          isMannual || nextSeg.category === defaultCategory;
        if (
          nextSeg.type === "break" &&
          isNextSegCategoryMatch && // 使用新的条件
          !usedGlobalIndices.has(nextSeg.globalIndex!) &&
          currentPomoSeg.end === nextSeg.start
        ) {
          segmentEnd = nextSeg.end;
          indicesToMarkUsed.push(nextSeg.globalIndex!);
        }
      }

      // --- 创建 TodoSegment ---
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        todoIndex: assignedCount + 1,
        start: currentPomoSeg.start,
        end: segmentEnd,
        pomoType: "🍅",
        assignedPomodoroSegment: currentPomoSeg,
        category: currentPomoSeg.category,
        completed: false,
        usingRealPomo: false,
        globalIndex: currentPomoSeg.globalIndex,
      });

      indicesToMarkUsed.forEach((idx) => usedGlobalIndices.add(idx));
      assignedCount++;
    }
  }

  // --- 溢出逻辑保持不变 ---
  if (assignedCount < needCount) {
    let overflowStartTime: number;

    // 决定溢出块的起始时间
    if (pomodoroSegments.length > 0) {
      overflowStartTime = pomodoroSegments[pomodoroSegments.length - 1].end;
      console.log("溢出时间");
    } else {
      // 如果没有任何可用时间块，则从当天晚上10点开始
      const overflowBaseDate = new Date(appDateTimestamp);
      overflowBaseDate.setHours(22, 0, 0, 0);
      overflowStartTime = overflowBaseDate.getTime();
    }

    // 创建剩余的溢出 TodoSegment
    while (assignedCount < needCount) {
      const duration = 25 * 60 * 1000; // 标准番茄钟时长
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        todoIndex: assignedCount + 1,
        start: overflowStartTime,
        end: overflowStartTime + duration,
        pomoType: "🍅",
        category: "working",
        overflow: true, // 标记为溢出
        completed: false,
        usingRealPomo: false,
      });
      // 更新下一个溢出块的起始时间
      overflowStartTime += duration;
      assignedCount++;
    }
  }
}

/**
 * 从指定索引开始分配🍇葡萄段
 * @param {PomodoroSegment[]} segments - 已经过滤和排序好的 pomo/break 池
 * @param {Set<number>} usedGlobalIndices - 已占用的 globalIndex 集合
 * @param {number} startIndex - 数组索引，不是 globalIndex
 * @param {boolean} forceStart - 是否必须从 startIndex 开始
 */
function _allocateGrapeSegmentsFromIndex(
  appDateTimestamp: number,
  todo: Todo,
  needCount: number,
  segments: PomodoroSegment[],
  usedGlobalIndices: Set<number>,
  todoSegments: TodoSegment[],
  startIndex: number,
  forceStart: boolean
): void {
  let assignedCount = 0;
  const targetCategory = "living"; // 葡萄属于 living

  for (
    let i = startIndex;
    i < segments.length && assignedCount < needCount;
    i++
  ) {
    const currentSeg = segments[i];

    // 如果是强制开始（手动），但第一个可用块不是我们想要的那个，说明位置已被占用或不合法，分配失败
    if (forceStart && assignedCount === 0 && i > startIndex) {
      break; // 中断循环，走向溢出逻辑
    }

    // 检查条件是否满足
    if (
      currentSeg.type === "pomo" &&
      currentSeg.category === targetCategory && // 检查 category
      !usedGlobalIndices.has(currentSeg.globalIndex!)
    ) {
      // 找到了一个可用的 pomo 块
      let segmentEnd = currentSeg.end;
      const primaryGlobalIndex = currentSeg.globalIndex!;

      const indicesToMarkUsed = [primaryGlobalIndex];

      // 尝试合并紧邻的 break
      const nextSegIndex = i + 1;
      if (nextSegIndex < segments.length) {
        const nextSeg = segments[nextSegIndex];
        // 合并的 break 也必须是相同 category
        if (
          nextSeg.type === "break" &&
          nextSeg.category === targetCategory &&
          !usedGlobalIndices.has(nextSeg.globalIndex!) &&
          currentSeg.end === nextSeg.start
        ) {
          segmentEnd = nextSeg.end;
          indicesToMarkUsed.push(nextSeg.globalIndex!);
        }
      }

      // 添加到结果集
      todoSegments.push({
        todoId: todo.id,
        priority: todo.priority,
        todoTitle: todo.activityTitle,
        todoIndex: assignedCount + 1,
        start: currentSeg.start,
        end: segmentEnd,
        pomoType: "🍇",
        assignedPomodoroSegment: currentSeg,
        category: "living", // 明确 category
        completed: false,
        usingRealPomo: false,
        globalIndex: currentSeg.globalIndex,
      });

      // 标记所有占用的块
      indicesToMarkUsed.forEach((idx) => usedGlobalIndices.add(idx));
      assignedCount++;
    }
  }

  // 溢出逻辑保持不变
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
 * 从指定索引开始分配🍒樱桃段 (V2)
 * @param {PomodoroSegment[]} segments - 已经过滤和排序好的 pomo/break 池
 * @param {Set<number>} usedGlobalIndices - 已占用的 globalIndex 集合
 * @param {number} startIndex - 数组索引，不是 globalIndex
 * @param {boolean} forceStart - 是否必须从 startIndex 开始
 */
/**
 * 从指定索引开始分配🍒樱桃段 (V3 - 严格四块版)
 * 严格寻找一个连续的 pomo-break-pomo-break 序列。
 *
 * @param needCount - 对于此函数，needCount 预期为 2 (代表需要 2*2=4 个时间块)
 */
function _allocateCherrySegmentsFromIndex(
  appDateTimestamp: number,
  needCount: number, // 预期为 2，代表一个完整的樱桃单元 (100分钟)
  forceStart: boolean,
  startIndex: number,
  usedGlobalIndices: Set<number>,
  todo: Todo,
  segments: PomodoroSegment[],
  todoSegments: TodoSegment[]
): void {
  let assigned = false; // 我们只需要分配一次，所以用布尔值即可

  // --- 关键简化：循环的步长是 4！---
  for (let i = startIndex; i < segments.length - 3; i += 4) {
    // 如果是手动模式，只检查 startIndex 这一个位置
    if (forceStart && i > startIndex) {
      break;
    }

    const seg1 = segments[i];
    const seg2 = segments[i + 1];
    const seg3 = segments[i + 2];
    const seg4 = segments[i + 3];

    // --- 将所有检查条件整合到一个函数中，一目了然 ---
    const isSlotValid = (
      s1: PomodoroSegment,
      s2: PomodoroSegment,
      s3: PomodoroSegment,
      s4: PomodoroSegment
    ): boolean => {
      // 1. 结构检查 (pomo-break-pomo-break)
      if (
        s1.type !== "pomo" ||
        s2.type !== "break" ||
        s3.type !== "pomo" ||
        s4.type !== "break"
      )
        return false;
      // 2. 连续性检查 (时间上无缝)
      if (s1.end !== s2.start || s2.end !== s3.start || s3.end !== s4.start)
        return false;
      // 3. 可用性检查 (4个块都未被占用)
      if (
        usedGlobalIndices.has(s1.globalIndex!) ||
        usedGlobalIndices.has(s2.globalIndex!) ||
        usedGlobalIndices.has(s3.globalIndex!) ||
        usedGlobalIndices.has(s4.globalIndex!)
      )
        return false;
      // 4. 类别检查
      const category = s1.category;
      if (
        s2.category !== category ||
        s3.category !== category ||
        s4.category !== category
      )
        return false; // 必须统一
      if (!forceStart && category !== "working") return false; // 自动模式下必须是 'working'

      return true; // 所有检查通过！
    };

    if (isSlotValid(seg1, seg2, seg3, seg4)) {
      // 找到了一个完美的 4 块槽位！
      const segmentsToAssign = [seg1, seg2, seg3, seg4];
      const actualCategory = seg1.category; // 记录实际占用的类别

      // 一次性创建 4 个 TodoSegment
      segmentsToAssign.forEach((subSeg, index) => {
        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          todoIndex: index + 1, // 1, 2, 3, 4
          start: subSeg.start,
          end: subSeg.end,
          pomoType: "🍒",
          assignedPomodoroSegment: subSeg,
          category: actualCategory,
          completed: false,
          usingRealPomo: false,
          globalIndex: subSeg.globalIndex,
        });
      });

      // 标记所有 4 个块为已使用
      segmentsToAssign.forEach((s) => usedGlobalIndices.add(s.globalIndex!));

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
