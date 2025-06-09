// src/services/pomoSegService.ts
import type { Block } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import { getTimestampForTimeString } from "@/core/utils";

// ========== 接口定义 ==========

export interface PomodoroSegment {
  parentBlockId: string;
  type: "work" | "break" | "schedule" | "untaetigkeit";
  start: number;
  end: number;
  category: string; // 原block的类型
  index?: number; // 在同种类型中的序号
}

export interface TodoSegment {
  todoId: number;
  todoTitle: string;
  priority: number;
  start: number;
  end: number;
  pomoType: "🍅" | "🍇" | "🍒";
  category?: string;
  index: number; // 本todo第几个番茄
  assignedPomodoroSegment?: PomodoroSegment;
  overflow?: boolean; // 是否溢出（超出可用时间段）
  completed?: boolean; // todo是否已完成
  usingRealPomo?: boolean; // 是否使用realPomo计数
}

// ========== 辅助工具函数 ==========

/**
 * 从基础时间区间中减去排除区间，返回剩余的可用区间
 */
function subtractIntervals(
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

// ========== 番茄统计工具函数 ==========

/**
 * 统计 todo 预估番茄数
 * 🍒类型需要除以2，因为一个🍒等于2个普通番茄的时间
 */
export function getTodoEstPomoCount(todo: Todo): number {
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
 * 🍒类型需要除以2，因为一个🍒等于2个普通番茄的时间
 */
export function getTodoRealPomoCount(todo: Todo): number {
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
 * 按番茄类型返回每颗番茄的分钟数
 * 🍅: 30分钟 (25工作+5休息)
 * 🍒: 60分钟 (工作休息工作休息各15分钟)
 * 🍇: 30分钟 (25工作+5休息)
 */
export function getPomoMinutesByType(type?: Todo["pomoType"]): number {
  if (type === "🍅") return 30; // 25+5
  if (type === "🍒") return 60; // 15*4
  if (type === "🍇") return 30; // 25+5
  return 30;
}

/**
 * 根据todo状态决定使用estPomo还是realPomo
 * 已完成的使用realPomo，未完成的使用estPomo
 */
export function getTodoDisplayPomoCount(todo: Todo): number {
  if (todo.status === "done") {
    return getTodoRealPomoCount(todo);
  } else {
    return getTodoEstPomoCount(todo);
  }
}

// ========== 估计分配相关函数 ==========

/**
 * 生成估计的todo时间段分配
 * 忽略startTime，纯粹按优先级和可用时间段进行分配
 */
export function generateEstimatedTodoSegments(
  todos: Todo[],
  pomodoroSegments: PomodoroSegment[]
): TodoSegment[] {
  const todoSegments: TodoSegment[] = [];

  // 按类型分类可用的番茄时间段
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

  // 标记时间段使用状态
  const used = {
    working: new Array(segByCategory.working.length).fill(false),
    living: new Array(segByCategory.living.length).fill(false),
  };

  // 按优先级排序todos（优先级数字越小越重要，0表示无优先级放最后）
  const sortedTodos = [...todos].sort((a, b) => {
    if ((a.priority ?? 0) === 0 && (b.priority ?? 0) === 0) return 0;
    if ((a.priority ?? 0) === 0) return 1;
    if ((b.priority ?? 0) === 0) return -1;
    return (a.priority ?? 0) - (b.priority ?? 0);
  });

  // 为每个todo分配时间段
  for (const todo of sortedTodos) {
    const needCount = getTodoDisplayPomoCount(todo); // 改用动态数

    if (todo.pomoType === "🍅" || !todo.pomoType) {
      allocateTomatoSegments(
        todo,
        needCount,
        segByCategory.working,
        used.working,
        todoSegments
      );
    } else if (todo.pomoType === "🍇") {
      allocateGrapeSegments(
        todo,
        needCount,
        segByCategory.living,
        used.living,
        todoSegments
      );
    } else if (todo.pomoType === "🍒") {
      allocateCherrySegments(
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

/**
 * 分配🍅番茄段到working区域
 * 每个🍅包含25分钟工作时间，会尝试与5分钟休息时间配对
 */
function allocateTomatoSegments(
  todo: Todo,
  needCount: number,
  segments: PomodoroSegment[],
  isUsed: boolean[],
  todoSegments: TodoSegment[]
): void {
  let assignedCount = 0;

  // 遍历可用的work段
  for (let i = 0; i < segments.length && assignedCount < needCount; i++) {
    if (!isUsed[i] && segments[i].type === "work") {
      let segmentEnd = segments[i].end;
      let span = 0;

      // 尝试与后面的break段配对形成完整的番茄时间
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

  // 处理溢出：如果没有足够的时间段，在最后添加虚拟段
  while (assignedCount < needCount) {
    const lastSeg = segments[segments.length - 1];
    todoSegments.push({
      todoId: todo.id,
      priority: todo.priority,
      todoTitle: todo.activityTitle,
      index: assignedCount + 1,
      start: lastSeg ? lastSeg.end : Date.now(),
      end: lastSeg ? lastSeg.end + 25 * 60 * 1000 : Date.now() + 25 * 60 * 1000,
      pomoType: "🍅",
      category: "working",
      overflow: true,
      completed: false,
      usingRealPomo: false,
    });
    assignedCount++;
  }
}

/**
 * 分配🍇番茄段到living区域
 * 逻辑与🍅类似，但分配到living区域
 */
function allocateGrapeSegments(
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

      // 尝试与break段配对
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

  // 处理溢出
  while (assignedCount < needCount) {
    const lastSeg = segments[segments.length - 1];
    todoSegments.push({
      todoId: todo.id,
      priority: todo.priority,
      todoTitle: todo.activityTitle,
      index: assignedCount + 1,
      start: lastSeg ? lastSeg.end : Date.now(),
      end: lastSeg ? lastSeg.end + 25 * 60 * 1000 : Date.now() + 25 * 60 * 1000,
      pomoType: "🍇",
      category: "living",
      overflow: true,
      completed: false,
      usingRealPomo: false,
    });
    assignedCount++;
  }
}

/**
 * 分配🍒番茄段
 * 🍒需要连续的4个段（work-break-work-break）才能形成一个完整的🍒
 * 每个🍒实际产生4个时间段，但显示为2个番茄单位
 */
function allocateCherrySegments(
  todo: Todo,
  needCount: number,
  segments: PomodoroSegment[],
  isUsed: boolean[],
  todoSegments: TodoSegment[]
): void {
  let assignedCount = 0;

  // 查找连续的4段组合
  for (let i = 0; i < segments.length - 3 && assignedCount < needCount; i++) {
    // 检查连续4段是否都可用且符合work-break-work-break模式
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
      // 标记4段都已使用
      isUsed[i] = isUsed[i + 1] = isUsed[i + 2] = isUsed[i + 3] = true;

      // 创建4个段，前2段为第1个番茄，后2段为第2个番茄
      for (let j = 0; j < 4; j++) {
        const pomodoroIndex = Math.floor(j / 2); // 0,1->0  2,3->1
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
      assignedCount += 2; // 一次处理了2个番茄
    }
  }

  // 处理溢出
  while (assignedCount < needCount) {
    const lastSeg = segments[segments.length - 1];
    todoSegments.push({
      todoId: todo.id,
      priority: todo.priority,
      todoTitle: todo.activityTitle,
      index: assignedCount + 1,
      start: lastSeg ? lastSeg.end : Date.now(),
      end: lastSeg ? lastSeg.end + 60 * 60 * 1000 : Date.now() + 60 * 60 * 1000,
      pomoType: "🍒",
      category: "working",
      overflow: true,
      completed: false,
      usingRealPomo: false,
    });
    assignedCount++;
  }
}

// ========== 从指定位置重新分配单个todo的时间段 ========== #HACK
/**
 * 从指定位置重新分配单个todo的时间段
 */
export function reallocateTodoFromPosition(
  todo: Todo,
  startSegmentIndex: number,
  pomodoroSegments: PomodoroSegment[],
  existingTodoSegments: TodoSegment[] = []
): TodoSegment[] {
  // 🔥 改用动态计数，樱桃这个可能是错的
  const needCount =
    todo.pomoType === "🍒"
      ? getTodoEstPomoCount(todo) // 樱桃继续用估计数
      : getTodoDisplayPomoCount(todo); // 🍅🍇用动态数
  const todoSegments: TodoSegment[] = [];

  // 确定使用哪个类别的时间段
  const categorySegs = pomodoroSegments
    .filter((seg) => {
      const targetCategory = todo.pomoType === "🍇" ? "living" : "working";
      return (
        seg.category === targetCategory &&
        (seg.type === "work" || seg.type === "break")
      );
    })
    .sort((a, b) => a.start - b.start);

  // 标记已被其他todo使用的时间段
  const used = new Array(categorySegs.length).fill(false);

  // 标记已被现有todoSegments占用的时间段（排除当前todo的）
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

  // 找到对应的开始索引（在过滤后的数组中）
  const targetSeg = pomodoroSegments[startSegmentIndex];
  const startIndex = categorySegs.findIndex((seg) => seg === targetSeg);

  if (startIndex === -1) {
    // 如果找不到目标段，回退到原始逻辑
    return [];
  }

  // 从指定位置开始分配
  if (todo.pomoType === "🍅" || !todo.pomoType) {
    allocateTomatoSegmentsFromIndex(
      todo,
      needCount,
      categorySegs,
      used,
      todoSegments,
      startIndex
    );
  } else if (todo.pomoType === "🍇") {
    allocateGrapeSegmentsFromIndex(
      todo,
      needCount,
      categorySegs,
      used,
      todoSegments,
      startIndex
    );
  } else if (todo.pomoType === "🍒") {
    allocateCherrySegmentsFromIndex(
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
 * 从指定索引开始分配番茄段 #HACK
 */
function allocateTomatoSegmentsFromIndex(
  todo: Todo,
  needCount: number,
  segments: PomodoroSegment[],
  isUsed: boolean[],
  todoSegments: TodoSegment[],
  startIndex: number
): void {
  let assignedCount = 0;

  // 从指定索引开始遍历
  for (
    let i = startIndex;
    i < segments.length && assignedCount < needCount;
    i++
  ) {
    if (!isUsed[i] && segments[i].type === "work") {
      let segmentEnd = segments[i].end;
      let span = 0;

      // 尝试与后面的break段配对
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

  // 处理溢出（与原函数相同）
  while (assignedCount < needCount) {
    const lastSeg = segments[segments.length - 1];
    todoSegments.push({
      todoId: todo.id,
      priority: todo.priority,
      todoTitle: todo.activityTitle,
      index: assignedCount + 1,
      start: lastSeg ? lastSeg.end : Date.now(),
      end: lastSeg ? lastSeg.end + 25 * 60 * 1000 : Date.now() + 25 * 60 * 1000,
      pomoType: "🍅",
      category: "working",
      overflow: true,
      completed: false,
      usingRealPomo: false,
    });
    assignedCount++;
  }
}

/**
 * 从指定索引开始分配🍇葡萄段 #HACK
 */
function allocateGrapeSegmentsFromIndex(
  todo: Todo,
  needCount: number,
  segments: PomodoroSegment[],
  isUsed: boolean[],
  todoSegments: TodoSegment[],
  startIndex: number
): void {
  let assignedCount = 0;

  // 从指定索引开始遍历
  for (
    let i = startIndex;
    i < segments.length && assignedCount < needCount;
    i++
  ) {
    if (!isUsed[i] && segments[i].type === "work") {
      let segmentEnd = segments[i].end;
      let span = 0;

      // 尝试与break段配对
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

  // 处理溢出
  while (assignedCount < needCount) {
    const lastSeg = segments[segments.length - 1];
    todoSegments.push({
      todoId: todo.id,
      priority: todo.priority,
      todoTitle: todo.activityTitle,
      index: assignedCount + 1,
      start: lastSeg ? lastSeg.end : Date.now(),
      end: lastSeg ? lastSeg.end + 25 * 60 * 1000 : Date.now() + 25 * 60 * 1000,
      pomoType: "🍇",
      category: "living",
      overflow: true,
      completed: false,
      usingRealPomo: false,
    });
    assignedCount++;
  }
}

/**
 * 从指定索引开始分配🍒樱桃段 #HACK
 */
function allocateCherrySegmentsFromIndex(
  todo: Todo,
  needCount: number,
  segments: PomodoroSegment[],
  isUsed: boolean[],
  todoSegments: TodoSegment[],
  startIndex: number
): void {
  let assignedCount = 0;

  // 从指定索引开始查找连续的4段组合
  for (
    let i = startIndex;
    i < segments.length - 3 && assignedCount < needCount;
    i++
  ) {
    // 检查连续4段是否都可用且符合work-break-work-break模式
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
      // 标记4段都已使用
      isUsed[i] = isUsed[i + 1] = isUsed[i + 2] = isUsed[i + 3] = true;

      // 创建4个段，前2段为第1个番茄，后2段为第2个番茄
      for (let j = 0; j < 4; j++) {
        const pomodoroIndex = Math.floor(j / 2); // 0,1->0  2,3->1
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
      assignedCount += 2; // 一次处理了2个番茄
    }
  }

  // 处理溢出
  while (assignedCount < needCount) {
    const lastSeg = segments[segments.length - 1];
    todoSegments.push({
      todoId: todo.id,
      priority: todo.priority,
      todoTitle: todo.activityTitle,
      index: assignedCount + 1,
      start: lastSeg ? lastSeg.end : Date.now(),
      end: lastSeg ? lastSeg.end + 60 * 60 * 1000 : Date.now() + 60 * 60 * 1000,
      pomoType: "🍒",
      category: "working",
      overflow: true,
      completed: false,
      usingRealPomo: false,
    });
    assignedCount++;
  }
}

// ========== 实际执行相关函数 ==========

/**
 * 生成实际执行的todo时间段
 * 基于startTime和完成状态，使用realPomo或estPomo
 */
export function generateActualTodoSegments(todos: Todo[]): TodoSegment[] {
  const todoSegments: TodoSegment[] = [];

  // 只处理有startTime的todos
  const todosWithStartTime = todos.filter((todo) => todo.startTime);

  for (const todo of todosWithStartTime) {
    if (!todo.startTime) continue;

    // 根据完成状态决定使用哪种计数
    const needCount = getTodoDisplayPomoCount(todo);
    const isCompleted = todo.status === "done";
    const usingRealPomo = isCompleted;

    if (todo.pomoType === "🍒") {
      // 🍒特殊处理：创建4个15分钟的段
      for (let i = 0; i < 4; i++) {
        const duration = 15 * 60 * 1000; // 15分钟
        const segmentStart = todo.startTime + i * duration;
        const segmentEnd = segmentStart + duration;
        const pomodoroIndex = Math.floor(i / 2); // 0,1->0  2,3->1

        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          index: pomodoroIndex + 1,
          start: segmentStart,
          end: segmentEnd,
          pomoType: "🍒",
          category: "working",
          completed: isCompleted,
          usingRealPomo: usingRealPomo,
        });
      }
    } else {
      // 🍅🍇的处理：每个25分钟
      const duration = 25 * 60 * 1000;
      for (let i = 0; i < needCount; i++) {
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
          completed: isCompleted,
          usingRealPomo: usingRealPomo,
        });
      }
    }
  }

  return todoSegments.sort((a, b) => a.start - b.start);
}

// ========== 番茄时间段生成 ==========

/**
 * 将时间块分割为番茄时间段，排除已安排的活动
 * 生成可用于分配的work和break时间段
 */
export function splitBlocksToPomodorosWithIndexExcludeSchedules(
  blocks: Block[],
  schedules: { activityDueRange: [number, string]; isUntaetigkeit?: boolean }[]
): PomodoroSegment[] {
  // 处理所有需要排除的时间段
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

  // 合并重叠的排除区间
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

  // 生成schedule段
  merged.forEach(({ range: [start, end], hasUntaetigkeit }) => {
    segments.push({
      parentBlockId: "S",
      type: hasUntaetigkeit ? "untaetigkeit" : "schedule",
      start,
      end,
      category: hasUntaetigkeit ? "untaetigkeit" : "schedule",
    });
  });

  // 处理每个时间块
  blocks.forEach((block) => {
    if (block.category === "sleeping") return;

    const blockStart = getTimestampForTimeString(block.start);
    const blockEnd = getTimestampForTimeString(block.end);

    // 找到与当前块有交集的排除区间
    const relatedExcludes = excludeRanges.filter(
      ([s, e]) => e > blockStart && s < blockEnd
    );

    // 计算可用的时间区间
    const availableRanges = subtractIntervals(
      [blockStart, blockEnd],
      relatedExcludes
    );

    // 为每个可用区间生成番茄时间段
    for (const [aStart, aEnd] of availableRanges) {
      // 跳过太短的区间
      if (aEnd - aStart < 30 * 60 * 1000) continue;

      let cur = aStart;
      let idx = globalIndex[block.category] || 1;

      // 生成25分钟工作 + 5分钟休息的循环
      while (aEnd - cur >= 30 * 60 * 1000) {
        // 需要至少30分钟
        // 工作段
        segments.push({
          parentBlockId: block.id,
          type: "work",
          start: cur,
          end: cur + 25 * 60 * 1000,
          category: block.category,
          index: idx,
        });
        cur += 25 * 60 * 1000;

        // 休息段
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

      // 处理剩余时间：如果还有至少25分钟，添加最后一个工作段
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
