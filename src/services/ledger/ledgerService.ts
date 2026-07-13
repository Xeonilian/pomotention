import type { Activity } from "@/core/types/Activity";
import type { LedgerEntry, LedgerDirection } from "@/core/types/LedgerEntry";
import type { ParseLedgerWarning } from "@/core/types/LedgerEntry";
import {
  ensureLedgerDayStub,
  isStandaloneLedgerEntry,
  LEDGER_AGGREGATE_RAW_SEGMENT,
  maybeRemoveLedgerDayStub,
} from "@/core/ledger/ledgerDayStub";

export { isStandaloneLedgerEntry };
import {
  composeLedgerTitle,
  formatLedgerSummaryBracket,
  parseLedgerFromTitle,
  stripLedgerSummarySuffix,
} from "@/core/ledger/parseLedgerSegments";

export interface SyncLedgerFromTitleParams {
  activityId: number;
  rawTitle: string;
  defaultCurrency: string;
  /** todo 行保存时传入 */
  todoId?: number;
  /** schedule 行保存时传入 */
  scheduleId?: number;
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

export interface LedgerEntryPatch {
  amount?: number;
  direction?: LedgerDirection;
  memo?: string;
  categoryTagIds?: number[];
  currency?: string;
}

export interface LedgerAggregateMutationResult {
  updated: boolean;
  /** title 来源行：新 activity title；独立行无 */
  title?: string;
  activityId?: number;
}

function activeEntriesForActivity(ledgerList: LedgerEntry[], activityId: number): LedgerEntry[] {
  return ledgerList.filter((e) => !e.deleted && e.sourceActivityId === activityId);
}

function collectUsedLedgerIds(ledgerList: LedgerEntry[]): Set<number> {
  return new Set(ledgerList.map((e) => e.id));
}

/** 分配新 id：以当前时间为基准，避开已有 id（同毫秒多笔递增） */
function allocateLedgerEntryIds(ledgerList: LedgerEntry[], count: number): number[] {
  const used = collectUsedLedgerIds(ledgerList);
  let candidate = Date.now();
  const ids: number[] = [];
  for (let i = 0; i < count; i++) {
    while (used.has(candidate)) candidate++;
    ids.push(candidate);
    used.add(candidate);
    candidate++;
  }
  return ids;
}

function nextSegmentIndexForActivity(ledgerList: LedgerEntry[], activityId: number): number {
  const active = activeEntriesForActivity(ledgerList, activityId);
  if (active.length === 0) return 0;
  return Math.max(...active.map((e) => e.segmentIndex)) + 1;
}

function resolveCategoryTagIds(names: string[] | undefined, tagActions: LedgerTagActions): number[] | undefined {
  if (!names || names.length === 0) return undefined;
  return names.map((n) => tagActions.resolveOrCreateTagByName(n));
}

function buildNormalizedTitle(diaryText: string, ledgerList: LedgerEntry[], activityId: number): string {
  const active = activeEntriesForActivity(ledgerList, activityId);
  const bracket = formatLedgerSummaryBracket(active);
  return composeLedgerTitle(diaryText, bracket);
}

/** 仅重写汇总括号（保存后 title 无逐笔 grammar） */
export function rebuildActivityTitleBracket(
  ledgerList: LedgerEntry[],
  activityId: number,
  currentTitle: string,
  options?: { memoReplace?: [oldMemo: string, newMemo: string] },
): string {
  let diary = stripLedgerSummarySuffix(currentTitle).trim();
  const [oldMemo, newMemo] = options?.memoReplace ?? [];
  if (oldMemo && newMemo && oldMemo !== newMemo) {
    const replaced = removeMemoFromDiaryText(diary, oldMemo);
    if (replaced !== diary) {
      diary = replaced;
      if (newMemo.trim()) {
        diary = diary ? `${diary} ${newMemo.trim()}` : newMemo.trim();
      }
    }
  }
  return buildNormalizedTitle(diary, ledgerList, activityId);
}

function buildSyntheticRawSegment(direction: LedgerDirection, amount: number, memo?: string): string {
  const sign = direction === "income" ? "+" : "-";
  const memoPart = memo?.trim() ? ` ${memo.trim()}` : "";
  return `${sign}${amount}${memoPart}￥`;
}

/** 统计弹窗追加：独立入账行（挂 ledger-stub 日桶 Activity） */
export function createStandaloneLedgerEntry(
  ledgerList: LedgerEntry[],
  activityList: Activity[],
  params: {
    appDateTimestamp: number;
    defaultCurrency: string;
    amount?: number;
    direction?: LedgerDirection;
    memo?: string;
    categoryTagIds?: number[];
  },
): LedgerEntry {
  const now = Date.now();
  const direction = params.direction ?? "expense";
  const amount = params.amount ?? 0;
  const currency = params.defaultCurrency;
  const memo = params.memo?.trim() || undefined;
  const [id] = allocateLedgerEntryIds(ledgerList, 1);
  const dayStart = ensureLedgerDayStub(activityList, params.appDateTimestamp);
  const entry: LedgerEntry = {
    id: id!,
    amount,
    direction,
    currency,
    memo,
    categoryTagIds: params.categoryTagIds?.length ? [...params.categoryTagIds] : undefined,
    rawSegment: LEDGER_AGGREGATE_RAW_SEGMENT,
    segmentIndex: nextSegmentIndexForActivity(ledgerList, dayStart),
    sourceActivityId: dayStart,
    sourceTodoId: dayStart,
    sourceScheduleId: 0,
    deleted: false,
    synced: false,
    lastModified: now,
  };
  ledgerList.push(entry);
  return entry;
}

/** 统计弹窗改一笔；title 来源行同步汇总括号 */
export function updateLedgerEntry(
  ledgerList: LedgerEntry[],
  entryId: number,
  patch: LedgerEntryPatch,
  activityTitle?: string,
  getActivity?: (activityId: number) => Pick<Activity, "id" | "title"> | undefined,
): LedgerAggregateMutationResult {
  const entry = ledgerList.find((e) => e.id === entryId);
  if (!entry || entry.deleted) return { updated: false };

  const oldMemo = entry.memo;
  const now = Date.now();
  if (patch.amount != null) entry.amount = patch.amount;
  if (patch.direction != null) entry.direction = patch.direction;
  if (patch.currency != null) entry.currency = patch.currency;
  if (patch.memo !== undefined) entry.memo = patch.memo.trim() || undefined;
  if (patch.categoryTagIds !== undefined) {
    entry.categoryTagIds = patch.categoryTagIds.length ? [...patch.categoryTagIds] : undefined;
  }
  if (!isStandaloneLedgerEntry(entry, getActivity)) {
    entry.rawSegment = buildSyntheticRawSegment(entry.direction, entry.amount, entry.memo);
  }
  entry.synced = false;
  entry.lastModified = now;

  if (isStandaloneLedgerEntry(entry, getActivity)) {
    return { updated: true };
  }

  const title = rebuildActivityTitleBracket(ledgerList, entry.sourceActivityId, activityTitle ?? "", {
    memoReplace: patch.memo !== undefined && oldMemo !== entry.memo ? [oldMemo ?? "", entry.memo ?? ""] : undefined,
  });
  return { updated: true, title, activityId: entry.sourceActivityId };
}

/** 统计弹窗删一笔；独立行仅软删，title 行复用现有逻辑 */
export function deleteLedgerEntryFromAggregate(
  ledgerList: LedgerEntry[],
  entryId: number,
  activityTitle?: string,
  options?: {
    activityList?: Activity[];
    getActivity?: (activityId: number) => Pick<Activity, "id" | "title"> | undefined;
  },
): LedgerAggregateMutationResult {
  const entry = ledgerList.find((e) => e.id === entryId);
  if (!entry || entry.deleted) return { updated: false };

  if (isStandaloneLedgerEntry(entry, options?.getActivity)) {
    const now = Date.now();
    entry.deleted = true;
    entry.synced = false;
    entry.lastModified = now;
    if (options?.activityList) {
      maybeRemoveLedgerDayStub(options.activityList, ledgerList, entry.sourceActivityId);
    }
    return { updated: true };
  }

  const { title, deleted } = softDeleteLedgerEntryWithTitle(ledgerList, entryId, activityTitle ?? "");
  if (!deleted) return { updated: false };
  return { updated: true, title, activityId: entry.sourceActivityId };
}

/** title 保存：解析记账段并追加；重写汇总括号 */
export function syncLedgerFromTodoTitle(
  ledgerList: LedgerEntry[],
  params: SyncLedgerFromTitleParams,
  tagActions: LedgerTagActions,
): SyncLedgerFromTitleResult {
  const parsed = parseLedgerFromTitle(params.rawTitle, params.defaultCurrency);
  const appendedCount = parsed.ok.length;

  if (appendedCount > 0) {
    const now = Date.now();
    const newIds = allocateLedgerEntryIds(ledgerList, appendedCount);
    let nextSegIdx = nextSegmentIndexForActivity(ledgerList, params.activityId);

    parsed.ok.forEach((seg, i) => {
      ledgerList.push({
        id: newIds[i]!,
        amount: seg.amount,
        direction: seg.direction,
        currency: seg.currency,
        memo: seg.memo,
        categoryTagIds: resolveCategoryTagIds(seg.categoryTagNames, tagActions),
        rawSegment: seg.rawSegment,
        segmentIndex: nextSegIdx++,
        sourceActivityId: params.activityId,
        sourceTodoId: params.todoId ?? 0,
        sourceScheduleId: params.scheduleId ?? 0,
        deleted: false,
        synced: false,
        lastModified: now,
      });
    });
  }

  const diaryBase =
    appendedCount > 0
      ? parsed.diaryText
      : stripLedgerSummarySuffix(params.rawTitle).trim();

  const normalizedTitle = buildNormalizedTitle(diaryBase, ledgerList, params.activityId);
  const allActive = activeEntriesForActivity(ledgerList, params.activityId);

  return {
    normalizedTitle,
    entryCount: allActive.length,
    appendedCount,
    warnings: parsed.warnings,
  };
}

export function getActiveLedgerEntriesForActivity(ledgerList: LedgerEntry[], activityId: number): LedgerEntry[] {
  return activeEntriesForActivity(ledgerList, activityId).sort((a, b) => a.segmentIndex - b.segmentIndex);
}

/** @deprecated 按 todo 展示时用 activityId */
export function getActiveLedgerEntriesForTodo(ledgerList: LedgerEntry[], _todoId: number, activityId: number): LedgerEntry[] {
  return getActiveLedgerEntriesForActivity(ledgerList, activityId);
}

/** 从 title 删除 rawSegment 并收拢空白 */
export function removeRawSegmentFromTitle(title: string, rawSegment: string): string {
  if (!rawSegment) return title;
  const idx = title.indexOf(rawSegment);
  if (idx < 0) return title;
  return title
    .slice(0, idx)
    .concat(title.slice(idx + rawSegment.length))
    .replace(/\s+/g, " ")
    .trim();
}

/** 从日记正文去掉一笔的 memo（保存后 title 无 rawSegment 时用） */
export function removeMemoFromDiaryText(diary: string, memo?: string): string {
  if (!memo?.trim()) return diary.trim();
  const escaped = memo.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return diary
    .replace(new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "u"), " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** 软删一笔并尝试反写 title；对不上原文则静默 */
export function softDeleteLedgerEntryWithTitle(
  ledgerList: LedgerEntry[],
  entryId: number,
  currentTitle: string,
  tagActions?: LedgerTagActions,
): { title: string; deleted: boolean } {
  const entry = ledgerList.find((e) => e.id === entryId);
  if (!entry || entry.deleted) return { title: currentTitle, deleted: false };

  const now = Date.now();
  entry.deleted = true;
  entry.synced = false;
  entry.lastModified = now;

  const diaryOnly = stripLedgerSummarySuffix(currentTitle);
  let title = removeRawSegmentFromTitle(diaryOnly, entry.rawSegment ?? "");
  if (title === diaryOnly) {
    title = removeMemoFromDiaryText(diaryOnly, entry.memo);
  }
  const active = activeEntriesForActivity(ledgerList, entry.sourceActivityId);
  const bracket = formatLedgerSummaryBracket(active);
  title = composeLedgerTitle(title, bracket);

  void tagActions;
  return { title, deleted: true };
}

/** 删除/恢复 Activity 时级联软删或恢复 ledger 行 */
export function cascadeLedgerForActivityTree(
  ledgerList: LedgerEntry[],
  activityIds: Set<number>,
  _todoIds: Set<number>,
  deleted: boolean,
): void {
  const now = Date.now();
  for (const entry of ledgerList) {
    if (!activityIds.has(entry.sourceActivityId)) continue;
    if (entry.deleted === deleted) continue;
    entry.deleted = deleted;
    entry.synced = false;
    entry.lastModified = now;
  }
}
