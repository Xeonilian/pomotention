// src/core/types/Block.ts
import { CategoryColors } from "../constants";
export interface Block {
  id: string;
  category: keyof typeof CategoryColors; // living sleeping working
  start: string; //使用HH:MM
  end: string;
}

export interface PomodoroSegment {
  parentBlockId: string;
  type: "work" | "break" | "schedule" | "untaetigkeit";
  start: number;
  end: number;
  category: string; // 原block的类型
  pomoIndex?: number; // 在同种类型中的序号
  globalIndex?: number; // 在所有类型中的序号
}

export interface TodoSegment {
  todoId: number;
  todoTitle: string;
  priority: number;
  start: number;
  end: number;
  pomoType: "🍅" | "🍇" | "🍒";
  category?: string;
  todoIndex: number; // 本todo第几个番茄
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
