// src/services/pomodoroService.ts
import type { Block } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import { getTimestampForTimeString } from "@/core/utils";

export interface PomodoroSegment {
  parentBlockId: string;
  type: "work" | "break" | "schedule";
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
    return rawCount * 2;
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

// 分配todo #HACK
export function assignTodosToPomodoroSegments(
  todos: Todo[],
  pomodoroSegments: PomodoroSegment[]
): TodoSegment[] {
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
  // 标记是否已使用
  let used = {
    working: new Array(segByCategory.working.length).fill(false),
    living: new Array(segByCategory.living.length).fill(false),
  };

  const todoSegments: TodoSegment[] = [];

  // 优先级排序
  const sortedTodos = [...todos].sort((a, b) => {
    if ((a.priority ?? 0) === 0 && (b.priority ?? 0) === 0) return 0;
    if ((a.priority ?? 0) === 0) return 1;
    if ((b.priority ?? 0) === 0) return -1;
    return (a.priority ?? 0) - (b.priority ?? 0);
  });

  for (const todo of sortedTodos) {
    const needCount = getTodoEstPomoCount(todo);
    let assignedCount = 0;

    if (todo.pomoType === "🍅" || !todo.pomoType) {
      // 🍅只分配给working区
      const segs = segByCategory.working;
      const isUsed = used.working;
      for (let i = 0; i < segs.length && assignedCount < needCount; i++) {
        if (!isUsed[i] && segs[i].type === "work") {
          // 默认只用work段，end等于本work段
          let segmentEnd = segs[i].end;
          let span = 0; // 用于跳步

          // 检查是否可以和后面break成对配番茄
          if (
            i + 1 < segs.length &&
            !isUsed[i + 1] &&
            segs[i + 1].type === "break" &&
            segs[i].end === segs[i + 1].start
          ) {
            // work+break常规配对
            segmentEnd = segs[i + 1].end;
            isUsed[i + 1] = true;
            span = 1; // i增加1，下次循环再+1
          }
          // 标记work已用
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
          });
          assignedCount++;
          i += span;
        }
      }
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
        });
        assignedCount++;
      }
    } else if (todo.pomoType === "🍇") {
      // 🍇只分配给living区
      const segs = segByCategory.living;
      const isUsed = used.living;
      for (let i = 0; i < segs.length - 1 && assignedCount < needCount; i++) {
        if (
          !isUsed[i] &&
          segs[i].type === "work" &&
          !isUsed[i + 1] &&
          segs[i + 1].type === "break" &&
          segs[i].end === segs[i + 1].start
        ) {
          isUsed[i] = true;
          isUsed[i + 1] = true;
          todoSegments.push({
            todoId: todo.id,
            priority: todo.priority,
            todoTitle: todo.activityTitle,
            index: assignedCount + 1,
            start: segs[i].start,
            end: segs[i + 1].end,
            pomoType: "🍇",
            assignedPomodoroSegment: segs[i],
            category: segs[i].category,
          });
          assignedCount++;
          i++;
        }
      }
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
        });
        assignedCount++;
      }
    } else if (todo.pomoType === "🍒") {
      // 🍒必须连续4段（work break work break），只在working区找
      const segs = segByCategory.working;
      const isUsed = used.working;
      for (let i = 0; i < segs.length - 3 && assignedCount < needCount; i++) {
        if (
          !isUsed[i] &&
          segs[i].type === "work" &&
          !isUsed[i + 1] &&
          segs[i + 1].type === "break" &&
          segs[i].end === segs[i + 1].start &&
          !isUsed[i + 2] &&
          segs[i + 2].type === "work" &&
          segs[i + 1].end === segs[i + 2].start &&
          !isUsed[i + 3] &&
          segs[i + 3].type === "break" &&
          segs[i + 2].end === segs[i + 3].start
        ) {
          isUsed[i] = isUsed[i + 1] = isUsed[i + 2] = isUsed[i + 3] = true;
          todoSegments.push({
            todoId: todo.id,
            priority: todo.priority,
            todoTitle: todo.activityTitle,
            index: assignedCount + 1,
            start: segs[i].start,
            end: segs[i + 3].end,
            pomoType: "🍒",
            assignedPomodoroSegment: segs[i],
            category: segs[i].category,
          });
          assignedCount++;
          i += 3;
        }
      }
      while (assignedCount < needCount) {
        const lastSeg = segs[segs.length - 1];
        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          index: assignedCount + 1,
          start: lastSeg ? lastSeg.end : Date.now(),
          end: lastSeg
            ? lastSeg.end + 50 * 60 * 1000
            : Date.now() + 50 * 60 * 1000,
          pomoType: "🍒",
          category: "working",
          overflow: true,
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
  schedules: { activityDueRange: [number, string] }[]
): PomodoroSegment[] {
  //-------------------------
  console.log("======原始block=====");
  blocks.forEach((b, i) =>
    console.log(`[${i}] block: ${b.start}~${b.end} (${b.category})`)
  );
  //-------------------------
  // 取所有activityDueRange区间
  const ex: [number, number][] = schedules
    .map((s) => {
      const start = Number(s.activityDueRange[0]);
      const duration = Number(s.activityDueRange[1]);
      return duration > 0 ? [start, start + duration * 60 * 1000] : null;
    })
    .filter((range): range is [number, number] => range !== null);

  console.log("\n======不可用区间（activityDueRange）=====");
  ex.forEach((x, i) => console.log(`[${i}] ${x[0]}~${x[1]}`));

  let segments: PomodoroSegment[] = [];
  const globalIndex: Record<string, number> = {};

  // 合并区间
  const merged: [number, number][] = [];
  ex.sort((a, b) => a[0] - b[0]).forEach(([start, end]) => {
    if (!merged.length || merged[merged.length - 1][1] < start) {
      merged.push([start, end]);
    } else {
      // 有重叠
      merged[merged.length - 1][1] = Math.max(
        merged[merged.length - 1][1],
        end
      );
    }
  });

  // 2. schedule段合并后统一加入（跨 block 只生成一个）
  merged.forEach(([start, end]) => {
    segments.push({
      parentBlockId: "S", // 特殊
      type: "schedule",
      start,
      end,
      category: "schedule",
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
    console.log(`\n[block#${blockIdx}] after剔除:`);
    available.forEach((a, i) =>
      console.log(
        `  可用区间#${i}: ${a[0]}~${a[1]}, 长度：${(
          (a[1] - a[0]) /
          60000
        ).toFixed(1)}分钟`
      )
    );

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
