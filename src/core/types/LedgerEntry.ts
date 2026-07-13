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
  /** title 解析片段；统计追加为 `ledger-stub` 占位 */
  rawSegment?: string;
  segmentIndex: number;
  sourceActivityId: number;
  /** 记账所在 todo；聚合日期用对应 todo.id（与 Planner 列表一致）；无则 0 */
  sourceTodoId: number;
  /** 记账所在 schedule；聚合日期用 activityDueRange[0]；无则 0；云表不存，下载后靠 activity 反查 */
  sourceScheduleId?: number;
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

/** @deprecated legacy 本地独立行；新数据用 ledger-stub 日桶 Activity id */
export const STANDALONE_LEDGER_ACTIVITY_ID = 0;
