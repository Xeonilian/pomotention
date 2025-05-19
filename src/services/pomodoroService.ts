// src/services/pomodoroService.ts
import type { Block } from "@/core/types/Block";

export interface PomodoroSegment {
  parentBlockId: string;
  type: "work" | "break" | "schedule";
  start: number;
  end: number;
  category: string; // 增加原block的类型
  index?: number; // 在同种类型中的序号
}

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

// 1. 原有的番茄拆分函数（与之前一致）
export function splitBlocksToPomodorosWithIndex(
  blocks: Block[]
): PomodoroSegment[] {
  const all: PomodoroSegment[] = [];
  const categoryCount: Record<string, number> = {};
  for (const block of blocks) {
    if (block.category === "sleeping") continue;

    if (block.end - block.start < 30 * 60 * 1000) continue;
    let current = block.start;
    let currIdx = categoryCount[block.category] || 1;
    while (block.end - current >= 25 * 60 * 1000 + 5 * 60 * 1000) {
      // work
      all.push({
        parentBlockId: block.id,
        type: "work",
        start: current,
        end: current + 25 * 60 * 1000,
        category: block.category,
        index: currIdx,
      });
      current += 25 * 60 * 1000;
      // break
      all.push({
        parentBlockId: block.id,
        type: "break",
        start: current,
        end: current + 5 * 60 * 1000,
        category: block.category,
      });
      currIdx++;
      current += 5 * 60 * 1000;
    }
    if (block.end - current > 0) {
      all.push({
        parentBlockId: block.id,
        type: "work",
        start: current,
        end: block.end,
        category: block.category,
        index: currIdx,
      });
      currIdx++;
    }
    categoryCount[block.category] = currIdx;
  }
  return all;
}
