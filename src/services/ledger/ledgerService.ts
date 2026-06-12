import type { Activity } from "@/core/types/Activity";
import type { LedgerEntry } from "@/core/types/LedgerEntry";
import type { ParseLedgerWarning } from "@/core/types/LedgerEntry";
import { parseLedgerSegments, normalizeTitleAfterParse } from "@/core/ledger/parseLedgerSegments";
import { TAG_ID_LEDGER } from "@/core/constants";

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
  warnings: ParseLedgerWarning[];
}

export interface LedgerTagActions {
  resolveOrCreateTagByName: (name: string) => number;
  getActivityTagIds: (activityId: number) => number[];
  setActivityTagIds: (activityId: number, tagIds: number[]) => void;
  markActivityDirty: (activity: Activity) => void;
}

function activeEntriesForTodo(ledgerList: LedgerEntry[], todoId: number): LedgerEntry[] {
  return ledgerList.filter((e) => !e.deleted && e.sourceTodoId === todoId);
}

function activeEntriesForActivity(ledgerList: LedgerEntry[], activityId: number): LedgerEntry[] {
  return ledgerList.filter((e) => !e.deleted && e.sourceActivityId === activityId);
}

function categoryTagIdsFromEntries(entries: LedgerEntry[]): number[] {
  const ids: number[] = [];
  for (const e of entries) {
    if (e.categoryTagId != null && !ids.includes(e.categoryTagId)) {
      ids.push(e.categoryTagId);
    }
  }
  return ids;
}

/** 片段 # 双写：追加新分类 tag，移除本 Todo 不再引用的分类 tag */
function syncActivityCategoryTags(
  ledgerList: LedgerEntry[],
  activityId: number,
  todoId: number,
  previousCategoryTagIds: number[],
  newCategoryTagIds: number[],
  tagActions: LedgerTagActions,
): void {
  const activityTagIds = tagActions.getActivityTagIds(activityId);
  let nextTagIds = [...activityTagIds];

  for (const tagId of previousCategoryTagIds) {
    if (newCategoryTagIds.includes(tagId)) continue;
    const usedElsewhere = ledgerList.some(
      (e) =>
        !e.deleted &&
        e.sourceActivityId === activityId &&
        e.sourceTodoId !== todoId &&
        e.categoryTagId === tagId,
    );
    if (!usedElsewhere && nextTagIds.includes(tagId)) {
      nextTagIds = nextTagIds.filter((id) => id !== tagId);
    }
  }

  for (const tagId of newCategoryTagIds) {
    if (!nextTagIds.includes(tagId)) {
      nextTagIds.push(tagId);
    }
  }

  const unchanged =
    nextTagIds.length === activityTagIds.length && nextTagIds.every((id, i) => id === activityTagIds[i]);
  if (!unchanged) {
    tagActions.setActivityTagIds(activityId, nextTagIds);
  }
}

/** 有有效 ledger 行时打上隐藏 TAG_ID_LEDGER */
export function syncLedgerHiddenTag(
  ledgerList: LedgerEntry[],
  activity: Activity,
  markDirty: (activity: Activity) => void,
): void {
  const hasEntries = activeEntriesForActivity(ledgerList, activity.id).length > 0;
  const tagIds = activity.tagIds ?? [];
  const hasLedgerTag = tagIds.includes(TAG_ID_LEDGER);

  if (hasEntries && !hasLedgerTag) {
    activity.tagIds = [...tagIds, TAG_ID_LEDGER];
    markDirty(activity);
  } else if (!hasEntries && hasLedgerTag) {
    const next = tagIds.filter((id) => id !== TAG_ID_LEDGER);
    activity.tagIds = next.length > 0 ? next : undefined;
    markDirty(activity);
  }
}

/** title 保存后：按 sourceTodoId 全量重解析并替换 ledger 行 */
export function syncLedgerFromTodoTitle(
  ledgerList: LedgerEntry[],
  params: SyncLedgerFromTitleParams,
  activity: Activity,
  tagActions: LedgerTagActions,
): SyncLedgerFromTitleResult {
  const parsed = parseLedgerSegments(params.rawTitle, params.defaultCurrency);
  const normalizedTitle = normalizeTitleAfterParse(params.rawTitle, parsed.ok);
  const now = Date.now();

  const existingForTodo = activeEntriesForTodo(ledgerList, params.todoId);
  const previousCategoryTagIds = categoryTagIdsFromEntries(existingForTodo);

  for (const entry of ledgerList) {
    if (entry.sourceTodoId === params.todoId && !entry.deleted) {
      entry.deleted = true;
      entry.synced = false;
      entry.lastModified = now;
    }
  }

  const newCategoryTagIds: number[] = [];

  for (const seg of parsed.ok) {
    let categoryTagId: number | undefined;
    if (seg.categoryTagName) {
      categoryTagId = tagActions.resolveOrCreateTagByName(seg.categoryTagName);
      if (!newCategoryTagIds.includes(categoryTagId)) {
        newCategoryTagIds.push(categoryTagId);
      }
    }

    ledgerList.push({
      id: now + seg.segmentIndex,
      amount: seg.amount,
      direction: seg.direction,
      currency: seg.currency,
      memo: seg.memo,
      categoryTagId,
      recordedAt: params.recordedAt,
      rawSegment: seg.rawSegment,
      segmentIndex: seg.segmentIndex,
      sourceActivityId: params.activityId,
      sourceTodoId: params.todoId,
      sourceTaskId: params.taskId,
      deleted: false,
      synced: false,
      lastModified: now,
    });
  }

  syncActivityCategoryTags(
    ledgerList,
    params.activityId,
    params.todoId,
    previousCategoryTagIds,
    newCategoryTagIds,
    tagActions,
  );
  syncLedgerHiddenTag(ledgerList, activity, tagActions.markActivityDirty);

  return {
    normalizedTitle,
    entryCount: parsed.ok.length,
    warnings: parsed.warnings,
  };
}

export function getActiveLedgerEntriesForTodo(ledgerList: LedgerEntry[], todoId: number): LedgerEntry[] {
  return activeEntriesForTodo(ledgerList, todoId);
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
