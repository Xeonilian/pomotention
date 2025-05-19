// src/services/pomodoroService.ts
import type { Block } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";

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

function formatTime(ts: number): string {
  const d = new Date(ts);
  const mm = `${d.getMonth() + 1}`.padStart(2, "0");
  const dd = `${d.getDate()}`.padStart(2, "0");
  const hh = `${d.getHours()}`.padStart(2, "0");
  const min = `${d.getMinutes()}`.padStart(2, "0");
  return `${mm}-${dd} ${hh}:${min}`;
}

// 工具函数

/** 统计 todo 预估番茄数 */
export function getTodoEstPomoCount(todo: Todo): number {
  if (!todo.estPomo) return 0;
  return todo.estPomo.reduce(
    (sum, cur) => sum + (typeof cur === "number" ? cur : 0),
    0
  );
}

/** 按番茄类型返回每颗番茄分钟数 */
export function getPomoMinutesByType(type?: Todo["pomoType"]): number {
  if (type === "🍅") return 30; // 25+5
  if (type === "🍒") return 15;
  if (type === "🍇") return 60;
  return 30;
}

export function assignTodosToPomodoroSegments(
  todos: Todo[],
  pomodoroSegments: PomodoroSegment[]
): TodoSegment[] {
  const sortedTodos = [...todos].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
  );
  // 只挑出type === "work" 且 category === "working"的番茄段
  const workingPomodoroSegments = pomodoroSegments.filter(
    (seg) => seg.type === "work" && seg.category === "working"
  );
  let segmentUsed: boolean[] = new Array(workingPomodoroSegments.length).fill(
    false
  );

  const todoSegments: TodoSegment[] = [];

  for (const todo of sortedTodos) {
    const needCount = getTodoEstPomoCount(todo);
    for (let i = 0; i < needCount; i++) {
      const nextIndex = segmentUsed.findIndex((u) => !u);
      if (nextIndex !== -1) {
        segmentUsed[nextIndex] = true;
        const seg = workingPomodoroSegments[nextIndex];
        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          index: i + 1,
          start: seg.start,
          end: seg.end,
          pomoType: todo.pomoType ?? "🍅",
          assignedPomodoroSegment: seg,
          category: seg.category,
        });
      } else {
        // overflow
        todoSegments.push({
          todoId: todo.id,
          priority: todo.priority,
          todoTitle: todo.activityTitle,
          index: i + 1,
          start: workingPomodoroSegments.length
            ? workingPomodoroSegments[workingPomodoroSegments.length - 1].end
            : Date.now(),
          end: workingPomodoroSegments.length
            ? workingPomodoroSegments[workingPomodoroSegments.length - 1].end +
              25 * 60 * 1000
            : Date.now() + 25 * 60 * 1000,
          pomoType: todo.pomoType ?? "🍅",
          overflow: true,
        });
      }
    }
  }
  return todoSegments;
}

export function splitBlocksToPomodorosWithIndexExcludeSchedules(
  blocks: Block[],
  schedules: { activityDueRange: [number, string] }[]
): PomodoroSegment[] {
  // -------------------------
  //console.log("======原始block=====");
  // blocks.forEach((b, i) =>
  //   console.log(
  //     `[${i}] block: ${formatTime(b.start)}~${formatTime(b.end)} (${
  //       b.category
  //     })`
  //   )
  // );
  // -------------------------
  // 取所有activityDueRange区间
  // 取所有activityDueRange区间
  const ex: [number, number][] = schedules
    .map((s) => {
      const start = Number(s.activityDueRange[0]);
      const duration = Number(s.activityDueRange[1]);
      return duration > 0 ? [start, start + duration * 60 * 1000] : null;
    })
    .filter((range): range is [number, number] => range !== null);

  // console.log("\n======不可用区间（activityDueRange）=====");
  // ex.forEach((x, i) =>
  //   console.log(`[${i}] ${formatTime(x[0])}~${formatTime(x[1])}`)
  // );

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
    const relatedEx = ex.filter(([s, e]) => e > block.start && s < block.end);
    // 剔除后剩余可用区间
    const available = subtractIntervals([block.start, block.end], relatedEx);
    //console.log(`\n[block#${blockIdx}] after剔除:`);
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
