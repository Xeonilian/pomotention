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
        // pomo：计入全局顺序
        segments.push({
          parentBlockId: block.id,
          type: "pomo",
          start: cur,
          end: cur + 25 * 60 * 1000,
          category: block.category,
          categoryIndex: idx, // 原有（同类内序号）
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

      // 尾部仍有 25min 的 pomo（也要计入）
      if (aEnd - cur >= 25 * 60 * 1000) {
        segments.push({
          parentBlockId: block.id,
          type: "pomo",
          start: cur,
          end: cur + 25 * 60 * 1000,
          category: block.category,
          categoryIndex: idx,
          globalIndex: globalIndexCounter, // 只给 work
        });
        idx++;
        globalIndexCounter++;
      }
      globalIndex[block.category] = idx;
    }
  });

  return segments.sort((a, b) => a.start - b.start);
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
 */
export function generateEstimatedTodoSegments(
  appDateTimestamp: number,
  todos: Todo[],
  segments: PomodoroSegment[]
): TodoSegment[] {
  // 1. 初始化
  // `usedGlobalIndices` 用于在本次函数运行期间，跟踪哪些时间块已被占用。
  const usedGlobalIndices: Set<number> = new Set();
  // `todoSegments` 是最终返回的结果数组，会在这里被逐步填充。
  const todoSegments: TodoSegment[] = [];

  // 2. 待办事项排序
  // 排序至关重要：
  // - 手动指定的任务 (有 positionIndex) 必须最先被处理。
  // - 在手动任务内部，按照它们指定的位置先后排序。
  // - 自动分配的任务，按照优先级等规则排序。
  const sortedTodos = [...todos].sort((a, b) => {
    const aIsManual =
      typeof a.positionIndex === "number" && a.positionIndex >= 0;
    const bIsManual =
      typeof b.positionIndex === "number" && b.positionIndex >= 0;

    if (aIsManual && !bIsManual) return -1; // a是手动，b是自动，a优先
    if (!aIsManual && bIsManual) return 1; // b是手动，a是自动，b优先

    if (aIsManual && bIsManual) {
      // 如果两个都是手动任务，则按照它们指定的位置（globalIndex）排序
      return a.positionIndex! - b.positionIndex!;
    }

    // 如果两个都是自动任务，则按您原有的优先级规则排序
    // 例如：按 priority 降序
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    // 如果优先级相同，可以再加一个稳定的排序规则，比如创建时间
    // return a.createdAt - b.createdAt;
    return 0;
  });

  // 3. 循环处理每一个待办事项
  for (const todo of sortedTodos) {
    // --- 核心修正：将 searchStartIndexInArray 的定义放在循环内部！ ---
    // 这确保了对于每一个新的 `todo`，其默认的搜索起点都被重置为 0。
    // 这是修复“樱桃自动分配失败”问题的关键。
    let searchStartIndexInArray = 0;

    const isManual =
      typeof todo.positionIndex === "number" && todo.positionIndex >= 0;
    const forceStart = isManual; // 手动模式下，强制从指定点开始

    // 如果是手动模式，我们需要计算出 `positionIndex` 对应的数组索引
    if (isManual) {
      const targetGlobalIndex = todo.positionIndex!;
      const foundIndex = segments.findIndex(
        (seg) => seg.globalIndex === targetGlobalIndex
      );

      if (foundIndex !== -1) {
        // 找到了，将搜索起点更新为这个找到的数组索引
        searchStartIndexInArray = foundIndex;
      } else {
        // 如果在 segments 数组中找不到这个 globalIndex，这是一个警告。
        // 分配很可能会失败并走向溢出，但我们仍然需要记录这个警告。
        console.warn(
          `[PomoSegService] 手动分配警告: Todo #${todo.id} 指定的 positionIndex ${targetGlobalIndex} 在当前时间块中无效或不存在。将尝试从头开始分配。`
        );
        // 此时 searchStartIndexInArray 保持为 0，让它尝试自动分配，但因为 forceStart 仍然为 true，分配基本会失败并溢出。
      }
    }

    // 4. 根据任务类型，调用相应的分配函数
    // 我们将【干净】的 searchStartIndexInArray 值传递给它们。
    const pomoCount = getTodoDisplayPomoCount(todo); // 获取该 todo 需要的番茄数量

    switch (todo.pomoType) {
      case "🍅":
        _allocateTomatoSegmentsFromIndex(
          appDateTimestamp,
          todo,
          pomoCount,
          segments,
          usedGlobalIndices,
          todoSegments,
          searchStartIndexInArray,
          forceStart
        );
        break;

      case "🍇":
        _allocateGrapeSegmentsFromIndex(
          appDateTimestamp,
          todo,
          pomoCount,
          segments,
          usedGlobalIndices,
          todoSegments,
          searchStartIndexInArray,
          forceStart
        );
        break;

      case "🍒":
        // 调用我们最新、最简洁的 V4 版本
        _allocateCherrySegmentsFromIndex(
          appDateTimestamp,
          todo,
          pomoCount, // 对于樱桃，pomoCount 应该是 2
          segments,
          usedGlobalIndices,
          todoSegments,
          searchStartIndexInArray,
          forceStart
        );
        break;

      default:
        console.error(
          `[PomoSegService] 未知的 PomoType: ${todo.pomoType} for Todo #${todo.id}`
        );
        break;
    }
  }

  // 5. 返回最终结果
  // 此时的 todoSegments 已经包含了所有成功分配和溢出的任务块
  return todoSegments;
}
/**
 * 从指定索引开始分配🍅番茄段 (V3 - 支持跨类别手动摆放)
 */
function _allocateTomatoSegmentsFromIndex(
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
  const defaultCategory = "working"; // 番茄钟的默认类别

  for (
    let i = startIndex;
    i < segments.length && assignedCount < needCount;
    i++
  ) {
    const currentSeg = segments[i];

    if (forceStart && assignedCount === 0 && i > startIndex) {
      break;
    }

    // --- 修改点：条件性类别检查 ---
    // 1. 如果是手动分配 (forceStart)，则不检查类别。
    // 2. 如果是自动分配，则必须匹配默认类别。
    const isCategoryMatch =
      forceStart || currentSeg.category === defaultCategory;

    if (
      currentSeg.type === "pomo" &&
      isCategoryMatch && // 使用新的条件
      !usedGlobalIndices.has(currentSeg.globalIndex!)
    ) {
      let segmentEnd = currentSeg.end;
      const indicesToMarkUsed = [currentSeg.globalIndex!];

      // --- 合并 break 的逻辑也需要同样的条件 ---
      const nextSegIndex = i + 1;
      if (nextSegIndex < segments.length) {
        const nextSeg = segments[nextSegIndex];
        // break 也必须类别匹配（或在手动模式下被忽略）
        const isNextSegCategoryMatch =
          forceStart || nextSeg.category === defaultCategory;
        if (
          nextSeg.type === "break" &&
          isNextSegCategoryMatch && // 使用新的条件
          !usedGlobalIndices.has(nextSeg.globalIndex!) &&
          currentSeg.end === nextSeg.start
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
        start: currentSeg.start,
        end: segmentEnd,
        pomoType: "🍅",
        assignedPomodoroSegment: currentSeg,
        // 关键: category 继承自它实际被放入的块，而不是任务的默认值
        category: currentSeg.category,
        completed: false,
        usingRealPomo: false,
      });

      indicesToMarkUsed.forEach((idx) => usedGlobalIndices.add(idx));
      assignedCount++;
    }
  }

  // --- 溢出逻辑保持不变 ---
  if (assignedCount < needCount) {
    let overflowStartTime: number;

    // 决定溢出块的起始时间
    if (segments.length > 0) {
      // 从最后一个已知时间块的末尾开始
      overflowStartTime = segments[segments.length - 1].end;
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
 * 从指定索引开始分配🍇葡萄段 (V2)
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
  todo: Todo,
  needCount: number, // 预期为 2，代表一个完整的樱桃单元 (100分钟)
  segments: PomodoroSegment[],
  usedGlobalIndices: Set<number>,
  todoSegments: TodoSegment[],
  startIndex: number,
  forceStart: boolean
): void {
  let assigned = false; // 我们只需要分配一次，所以用布尔值即可

  // --- 关键简化：循环的步长是 4！---
  // 我们不再逐一检查，而是以 4 个块为单位进行“跳跃检查”。
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
