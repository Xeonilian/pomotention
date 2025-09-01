// src/core/types/Block.ts
import { CategoryColors } from "../constants";
// 在3类下面的分块
export interface Block {
  id: string;
  category: keyof typeof CategoryColors; // living sleeping working
  start: string; //使用HH:MM
  end: string;
}

// 分块下的25+5时间块
export interface PomodoroSegment {
  parentBlockId: string; // 所属的block
  type: "work" | "break" | "schedule" | "untaetigkeit";
  start: number;
  end: number;
  category: string; // 原block的类型 living sleeping working
  pomoIndex?: number; // 在同种类型中的序号
  globalIndex?: number; // 全局排序 分配时使用
}

// 每个todo的番茄时间段
export interface TodoSegment {
  todoId: number;
  todoTitle: string;
  priority: number;
  start: number;
  end: number;
  pomoType: "🍅" | "🍇" | "🍒";
  todoIndex: number; // 本todo第几个番茄
  category?: string;
  assignedPomodoroSegment?: PomodoroSegment;
  overflow?: boolean; // 是否溢出（超出可用时间段）
  completed?: boolean; // todo是否已完成
  usingRealPomo?: boolean; // 是否使用realPomo计数
}

export interface ActualTimeRange {
  todoId: number;
  todoTitle: string;
  start: number;
  end: number;
  category: string;
}
