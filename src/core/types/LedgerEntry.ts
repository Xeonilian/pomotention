/** 账本行：独立表实体（Phase 2 起持久化；解析阶段先用 ParsedLedgerSegment） */
export type LedgerDirection = "income" | "expense";

export interface LedgerEntry {
  id: number;
  amount: number;
  direction: LedgerDirection;
  currency: string;
  memo?: string;
  categoryTagId?: number;
  recordedAt: number;
  rawSegment: string;
  segmentIndex: number;
  sourceActivityId: number;
  sourceTodoId?: number;
  sourceTaskId?: number;
  deleted: boolean;
  synced: boolean;
  lastModified: number;
  cloudModified?: number;
}

/** 解析器输出的单笔片段（尚未写入 store） */
export interface ParsedLedgerSegment {
  segmentIndex: number;
  rawSegment: string;
  amount: number;
  direction: LedgerDirection;
  currency: string;
  memo?: string;
  categoryTagName?: string;
}

export interface ParseLedgerWarning {
  startIndex: number;
  rawSnippet: string;
  message: string;
}

export interface ParseLedgerResult {
  ok: ParsedLedgerSegment[];
  warnings: ParseLedgerWarning[];
}

export const DEFAULT_LEDGER_CURRENCY = "CNY";
