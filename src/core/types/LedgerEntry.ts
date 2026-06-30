/** 账本行：独立表实体（Phase 2 起持久化；解析阶段先用 ParsedLedgerSegment） */
export type LedgerDirection = "income" | "expense";

export interface LedgerEntry {
  /** 行唯一标识（写入时刻 `Date.now()`）；云端映射 timestamp_id */
  id: number;
  amount: number;
  direction: LedgerDirection;
  currency: string;
  memo?: string;
  categoryTagIds?: number[];
  rawSegment: string;
  segmentIndex: number;
  sourceActivityId: number;
  /** 记账所在 todo；聚合日期用对应 todo.id（与 Planner 列表一致） */
  sourceTodoId: number;
  lastModified: number; // 最后修改时间戳
  cloudModified?: number; // 云端修改时间戳
  synced: boolean;
  deleted: boolean;
}

/** 解析器输出的单笔片段（尚未写入 store） */
export interface ParsedLedgerSegment {
  segmentIndex: number;
  rawSegment: string;
  amount: number;
  direction: LedgerDirection;
  currency: string;
  memo?: string;
  categoryTagNames?: string[];
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
