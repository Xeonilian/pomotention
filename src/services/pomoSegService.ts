// src/services/pomoSegService.ts
import type { Block } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import { getTimestampForTimeString } from "@/core/utils";

export interface PomodoroSegment {
  parentBlockId: string;
  type: "work" | "break" | "schedule" | "untaetigkeit";
  start: number;
  end: number;
  category: string; // 增加原block的类型
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
  overflow?: boolean;
  completed?: boolean; // 新增：todo是否已完成
  usingRealPomo?: boolean; // 新增：是否使用realPomo计数
}

// ---------- 辅助方法 ----------
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

// 工具函数

/** 统计 todo 预估番茄数 */
export function getTodoEstPomoCount(todo: Todo): number {
  if (!todo.estPomo) return 0;
  const rawCount = todo.estPomo.reduce(
    (sum, cur) => sum + (typeof cur === "number" ? cur : 0),
    0
  );
  if (todo.pomoType === "🍒") {
    return rawCount / 4;
  }
  return rawCount;
}

/** 统计 todo 实际完成番茄数 */
export function getTodoRealPomoCount(todo: Todo): number {
  if (!todo.realPomo) return 0;
  const rawCount = todo.realPomo.reduce(
    (sum, cur) => sum + (typeof cur === "number" ? cur : 0),
    0
  );
  if (todo.pomoType === "🍒") {
    return rawCount / 4;
  }
  return rawCount;
}

/** 按番茄类型返回每颗番茄分钟数 */
export function getPomoMinutesByType(type?: Todo["pomoType"]): number {
  if (type === "🍅") return 30; // 25+5
  if (type === "🍒") return 60;
  if (type === "🍇") return 30;
  return 30;
}

/** 根据todo状态决定使用estPomo还是realPomo */
export function getTodoDisplayPomoCount(todo: Todo): number {
  if (todo.status === "done") {
    // 已完成的todo使用realPomo
    return getTodoRealPomoCount(todo);
  } else {
    // 未完成的todo使用estPomo
    return getTodoEstPomoCount(todo);
  }
}

// 分配todo到番茄时间段
export function generateTodoSegmentsByStatus(
  todos: Todo[],
  pomodoroSegments: PomodoroSegment[]
): TodoSegment[] {
  // 分离已完成和未完成的todos
  const todosWithStartTime = todos.filter((todo) => todo.startTime);
  const todosWithoutStartTime = todos.filter((todo) => !todo.startTime);
  const todoSegments: TodoSegment[] = [];

  // 按类型&区块准备好work/break段
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

  // 记录被已完成todo占用的番茄段索引
  const occupiedSegments = new Set<number>();

  // 第一步：处理未完成的todos，分配到剩余可用的番茄段
  for (const todo of todosWithStartTime) {
    if (!todo.startTime) continue;

    const needCount = getTodoDisplayPomoCount(todo);

    if (todo.pomoType === "🍒") {
      // 🍒特殊处理：始终创建2个段显示2个badge
      for (let i = 0; i < 4; i++) {
        const duration = 15 * 60 * 1000; // 每个badge 30分钟
        const segmentStart = todo.startTime + i * duration;
        const segmentEnd = segmentStart + duration;

        // 标记占用的番茄段
        const targetCategory = "working";
        const segs = segByCategory[targetCategory];
        for (let j = 0; j < segs.length; j++) {
          const seg = segs[j];
          if (segmentStart < seg.end && segmentEnd > seg.start) {
            occupiedSegments.add(j);
          }
        }

        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          index: i + 1, // 第1个badge, 第2个badge
          start: segmentStart,
          end: segmentEnd,
          pomoType: "🍒",
          category: "working",
          completed: todo.status === "done",
          usingRealPomo: todo.status === "done",
        });
      }
    } else {
      // 🍅🍇的原有逻辑
      for (let i = 0; i < needCount; i++) {
        let duration = 25 * 60 * 1000; // 25分钟
        const segmentStart = todo.startTime + i * duration;
        const segmentEnd = segmentStart + duration;

        const targetCategory = todo.pomoType === "🍇" ? "living" : "working";
        const segs = segByCategory[targetCategory];

        for (let j = 0; j < segs.length; j++) {
          const seg = segs[j];
          if (segmentStart < seg.end && segmentEnd > seg.start) {
            const globalIndex =
              j +
              (targetCategory === "working" ? 0 : segByCategory.working.length);
            occupiedSegments.add(globalIndex);
          }
        }

        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          index: i + 1,
          start: segmentStart,
          end: segmentEnd,
          pomoType: todo.pomoType || "🍅",
          category: targetCategory,
          completed: todo.status === "done",
          usingRealPomo: todo.status === "done",
        });
      }
    }
  }

  // 第二步：处理没有startTime的todos，分配到剩余可用的番茄段

  // 初始化使用状态标记
  let used = {
    working: new Array(segByCategory.working.length).fill(false),
    living: new Array(segByCategory.living.length).fill(false),
  };

  // 按优先级排序没有startTime的todos
  const sortedTodosWithoutStartTime = [...todosWithoutStartTime].sort(
    (a, b) => {
      if ((a.priority ?? 0) === 0 && (b.priority ?? 0) === 0) return 0;
      if ((a.priority ?? 0) === 0) return 1;
      if ((b.priority ?? 0) === 0) return -1;
      return (a.priority ?? 0) - (b.priority ?? 0);
    }
  );

  // 为每个没有startTime的todo分配番茄段
  for (const todo of sortedTodosWithoutStartTime) {
    const needCount = getTodoDisplayPomoCount(todo);
    let assignedCount = 0;

    if (todo.pomoType === "🍅" || !todo.pomoType) {
      // 🍅只分配给working区
      const segs = segByCategory.working;
      const isUsed = used.working;
      for (let i = 0; i < segs.length && assignedCount < needCount; i++) {
        // 检查：未被标记使用 && 未被done todo占用 && 是work段
        if (!isUsed[i] && !occupiedSegments.has(i) && segs[i].type === "work") {
          let segmentEnd = segs[i].end;
          let span = 0;

          // 尝试与后面的break段配对
          if (
            i + 1 < segs.length &&
            !isUsed[i + 1] &&
            !occupiedSegments.has(i + 1) &&
            segs[i + 1].type === "break" &&
            segs[i].end === segs[i + 1].start
          ) {
            segmentEnd = segs[i + 1].end;
            isUsed[i + 1] = true;
            span = 1;
          }

          isUsed[i] = true;
          todoSegments.push({
            todoId: todo.id,
            priority: todo.priority,
            todoTitle: todo.activityTitle,
            index: assignedCount + 1,
            start: segs[i].start,
            end: segmentEnd,
            pomoType: "🍅",
            assignedPomodoroSegment: segs[i],
            category: segs[i].category,
            completed: false,
            usingRealPomo: false,
          });
          assignedCount++;
          i += span;
        }
      }

      // 处理溢出的番茄段
      while (assignedCount < needCount) {
        const lastSeg = segs[segs.length - 1];
        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          index: assignedCount + 1,
          start: lastSeg ? lastSeg.end : Date.now(),
          end: lastSeg
            ? lastSeg.end + 25 * 60 * 1000
            : Date.now() + 25 * 60 * 1000,
          pomoType: "🍅",
          category: "working",
          overflow: true,
          completed: false,
          usingRealPomo: false,
        });
        assignedCount++;
      }
    } else if (todo.pomoType === "🍇") {
      // 🍇只分配给living区
      const segs = segByCategory.living;
      const isUsed = used.living;
      for (let i = 0; i < segs.length && assignedCount < needCount; i++) {
        // living区域的占用检查需要加上working区域长度的偏移
        const globalIndex = i + segByCategory.working.length;
        if (
          !isUsed[i] &&
          !occupiedSegments.has(globalIndex) &&
          segs[i].type === "work"
        ) {
          let segmentEnd = segs[i].end;
          let span = 0;

          // 尝试与后面的break段配对
          if (
            i + 1 < segs.length &&
            !isUsed[i + 1] &&
            !occupiedSegments.has(globalIndex + 1) &&
            segs[i + 1].type === "break" &&
            segs[i].end === segs[i + 1].start
          ) {
            segmentEnd = segs[i + 1].end;
            isUsed[i + 1] = true;
            span = 1;
          }

          isUsed[i] = true;
          todoSegments.push({
            todoId: todo.id,
            priority: todo.priority,
            todoTitle: todo.activityTitle,
            index: assignedCount + 1,
            start: segs[i].start,
            end: segmentEnd,
            pomoType: "🍇",
            assignedPomodoroSegment: segs[i],
            category: segs[i].category,
            completed: false,
            usingRealPomo: false,
          });
          assignedCount++;
          i += span;
        }
      }

      // 处理溢出的番茄段
      while (assignedCount < needCount) {
        const lastSeg = segs[segs.length - 1];
        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          index: assignedCount + 1,
          start: lastSeg ? lastSeg.end : Date.now(),
          end: lastSeg
            ? lastSeg.end + 25 * 60 * 1000
            : Date.now() + 25 * 60 * 1000,
          pomoType: "🍇",
          category: "living",
          overflow: true,
          completed: false,
          usingRealPomo: false,
        });
        assignedCount++;
      }
    } else if (todo.pomoType === "🍒") {
      // 🍒必须连续4段（work break work break），只在working区找
      const segs = segByCategory.working;
      const isUsed = used.working;
      for (let i = 0; i < segs.length - 3 && assignedCount < needCount; i++) {
        // 检查连续4段都可用且未被占用
        if (
          !isUsed[i] &&
          !occupiedSegments.has(i) &&
          segs[i].type === "work" &&
          !isUsed[i + 1] &&
          !occupiedSegments.has(i + 1) &&
          segs[i + 1].type === "break" &&
          segs[i].end === segs[i + 1].start &&
          !isUsed[i + 2] &&
          !occupiedSegments.has(i + 2) &&
          segs[i + 2].type === "work" &&
          segs[i + 1].end === segs[i + 2].start &&
          !isUsed[i + 3] &&
          !occupiedSegments.has(i + 3) &&
          segs[i + 3].type === "break" &&
          segs[i + 2].end === segs[i + 3].start
        ) {
          // 标记4段都已使用
          isUsed[i] = isUsed[i + 1] = isUsed[i + 2] = isUsed[i + 3] = true;

          // 创建4个段，分为2个番茄显示
          for (let j = 0; j < 4; j++) {
            const pomodoroIndex = Math.floor(j / 2); // 0,1,2,3 -> 0,0,1,1
            todoSegments.push({
              todoId: todo.id,
              priority: todo.priority,
              todoTitle: todo.activityTitle,
              index: assignedCount + 1 + pomodoroIndex, // 第1,2段用index+1，第3,4段用index+2
              start: segs[i + j].start,
              end: segs[i + j].end,
              pomoType: "🍒",
              assignedPomodoroSegment: segs[i + j],
              category: segs[i + j].category,
              completed: false,
              usingRealPomo: false,
            });
          }
          assignedCount += 2; // ✅ 改为+2，因为处理了2个番茄
        }
      }

      // 处理溢出的番茄段
      while (assignedCount < needCount) {
        const lastSeg = segs[segs.length - 1];
        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          index: assignedCount + 1,
          start: lastSeg ? lastSeg.end : Date.now(),
          end: lastSeg
            ? lastSeg.end + 60 * 60 * 1000 // 修改为60分钟
            : Date.now() + 60 * 60 * 1000,
          pomoType: "🍒",
          category: "working",
          overflow: true,
          completed: false,
          usingRealPomo: false,
        });
        assignedCount++;
      }
    }
  }

  return todoSegments;
}

// 计算当日除去schedule可用pomo
export function splitBlocksToPomodorosWithIndexExcludeSchedules(
  blocks: Block[],
  schedules: { activityDueRange: [number, string]; isUntaetigkeit?: boolean }[]
): PomodoroSegment[] {
  //-------------------------
  // console.log("======原始block=====");
  // blocks.forEach((b, i) =>
  //   console.log(`[${i}] block: ${b.start}~${b.end} (${b.category})`)
  // );
  //-------------------------
  // 取所有activityDueRange区间，同时保留isUntaetigkeit信息
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

  // 用于排除的区间（所有schedule，不管类型）
  const ex: [number, number][] = scheduleInfo.map((info) => info.range);

  // console.log("\n======不可用区间（activityDueRange）=====");
  // ex.forEach((x, i) => console.log(`[${i}] ${x[0]}~${x[1]}`));

  let segments: PomodoroSegment[] = [];
  const globalIndex: Record<string, number> = {};

  // 合并区间时需要保留类型信息
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
        // 有重叠，合并区间，如果任一个是untaetigkeit则保留
        const last = merged[merged.length - 1];
        last.range[1] = Math.max(last.range[1], end);
        last.hasUntaetigkeit = last.hasUntaetigkeit || isUntaetigkeit;
      }
    });

  // 生成schedule段，根据类型决定type和category
  merged.forEach(({ range: [start, end], hasUntaetigkeit }) => {
    segments.push({
      parentBlockId: "S",
      type: hasUntaetigkeit ? "untaetigkeit" : "schedule",
      start,
      end,
      category: hasUntaetigkeit ? "untaetigkeit" : "schedule",
    });
  });

  blocks.forEach((block, blockIdx) => {
    if (block.category === "sleeping") return;

    // 只考虑与当块有交集的
    const relatedEx = ex.filter(
      ([s, e]) =>
        e > getTimestampForTimeString(block.start) &&
        s < getTimestampForTimeString(block.end)
    );
    // 剔除后剩余可用区间
    const available = subtractIntervals(
      [
        getTimestampForTimeString(block.start),
        getTimestampForTimeString(block.end),
      ],
      relatedEx
    );
    // console.log(`\n[block#${blockIdx}] after剔除:`);
    // available.forEach((a, i) =>
    //   console.log(
    //     `  可用区间#${i}: ${a[0]}~${a[1]}, 长度：${(
    //       (a[1] - a[0]) /
    //       60000
    //     ).toFixed(1)}分钟`
    //   )
    // );

    for (const [aStart, aEnd] of available) {
      if (aEnd - aStart < 0 * 60 * 1000) {
        //console.log(`   -- 可用区间不足30分钟，不分番茄`);
        continue;
      }
      let cur = aStart;
      let idx = globalIndex[block.category] || 1;
      while (aEnd - cur >= 25 * 60 * 1000 + 5 * 60 * 1000) {
        // work
        segments.push({
          parentBlockId: block.id,
          type: "work",
          start: cur,
          end: cur + 25 * 60 * 1000,
          category: block.category,
          index: idx,
        });
        cur += 25 * 60 * 1000;
        // break
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
      // 只保留最后一个完整的work pomo，少于25分钟丢弃！
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
      } else if (aEnd - cur > 0) {
        // 如需提示，可以加一句
        // console.log(
        //   `   -- 区间末尾剩余${((aEnd - cur) / 60000).toFixed(
        //     1
        //   )}分钟，未插入pomo`
        // );
      }

      globalIndex[block.category] = idx;
    }
  });
  segments.sort((a, b) => a.start - b.start);
  return segments;
}
