// src/services/pomodoroService.ts
import type { Block } from "@/core/types/Block";

export interface PomodoroSegment {
  parentBlockId: string;
  type: "work" | "break";
  start: number;
  end: number;
  category: string; // 增加原block的类型
  index?: number; // 在同种类型中的序号
}

/** 拆分所有blocks并为每个类别work段编号 */
export function splitBlocksToPomodorosWithIndex(
  blocks: Block[]
): PomodoroSegment[] {
  const all: PomodoroSegment[] = [];

  // 分类累计编号
  const categoryCount: Record<string, number> = {};

  for (const block of blocks) {
    if (block.category === "sleeping") continue;
    // 只处理 >=30min 的
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
