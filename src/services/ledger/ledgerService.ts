import type { LedgerEntry } from "@/core/types/LedgerEntry";
import type { ParseLedgerWarning } from "@/core/types/LedgerEntry";
import { parseLedgerFromTitle } from "@/core/ledger/parseLedgerSegments";

export interface SyncLedgerFromTitleParams {
  todoId: number;
  activityId: number;
  taskId?: number;
  rawTitle: string;
  recordedAt: number;
  defaultCurrency: string;
}

export interface SyncLedgerFromTitleResult {
  normalizedTitle: string;
  entryCount: number;
  appendedCount: number;
  warnings: ParseLedgerWarning[];
}

export interface LedgerTagActions {
  resolveOrCreateTagByName: (name: string) => number;
}

function activeEntriesForTodo(ledgerList: LedgerEntry[], todoId: number): LedgerEntry[] {
  return ledgerList.filter((e) => !e.deleted && e.sourceTodoId === todoId);
}

function nextLedgerEntryId(ledgerList: LedgerEntry[]): number {
  let max = 0;
  for (const e of ledgerList) {
    if (e.id > max) max = e.id;
  }
  return max + 1;
}

function nextSegmentIndexForTodo(ledgerList: LedgerEntry[], todoId: number): number {
  const active = activeEntriesForTodo(ledgerList, todoId);
  if (active.length === 0) return 0;
  return Math.max(...active.map((e) => e.segmentIndex)) + 1;
}

/** title 保存：解析 ￥…￥ 块并追加 ledger；无新块时不删已有行 */
export function syncLedgerFromTodoTitle(
  ledgerList: LedgerEntry[],
  params: SyncLedgerFromTitleParams,
  tagActions: LedgerTagActions,
): SyncLedgerFromTitleResult {
  const parsed = parseLedgerFromTitle(params.rawTitle, params.defaultCurrency);
  const appendedCount = parsed.ok.length;

  if (appendedCount > 0) {
    const now = Date.now();
    let nextId = nextLedgerEntryId(ledgerList);
    let nextSegIdx = nextSegmentIndexForTodo(ledgerList, params.todoId);

    for (const seg of parsed.ok) {
      let categoryTagId: number | undefined;
      if (seg.categoryTagName) {
        categoryTagId = tagActions.resolveOrCreateTagByName(seg.categoryTagName);
      }

      ledgerList.push({
        id: nextId++,
        amount: seg.amount,
        direction: seg.direction,
        currency: seg.currency,
        memo: seg.memo,
        categoryTagId,
        recordedAt: params.recordedAt,
        rawSegment: seg.rawSegment,
        segmentIndex: nextSegIdx++,
        sourceActivityId: params.activityId,
        sourceTodoId: params.todoId,
        sourceTaskId: params.taskId,
        deleted: false,
        synced: false,
        lastModified: now,
      });
    }
  }

  const allActive = activeEntriesForTodo(ledgerList, params.todoId);

  return {
    normalizedTitle: parsed.diaryText,
    entryCount: allActive.length,
    appendedCount,
    warnings: parsed.warnings,
  };
}

export function getActiveLedgerEntriesForTodo(ledgerList: LedgerEntry[], todoId: number): LedgerEntry[] {
  return activeEntriesForTodo(ledgerList, todoId).sort((a, b) => a.segmentIndex - b.segmentIndex);
}

/** 删除/恢复 Activity 时级联软删或恢复 ledger 行 */
export function cascadeLedgerForActivityTree(
  ledgerList: LedgerEntry[],
  activityIds: Set<number>,
  todoIds: Set<number>,
  deleted: boolean,
): void {
  const now = Date.now();
  for (const entry of ledgerList) {
    const matchesActivity = activityIds.has(entry.sourceActivityId);
    const matchesTodo = entry.sourceTodoId != null && todoIds.has(entry.sourceTodoId);
    if (!matchesActivity && !matchesTodo) continue;
    if (entry.deleted === deleted) continue;
    entry.deleted = deleted;
    entry.synced = false;
    entry.lastModified = now;
  }
}
