import type { LedgerDirection, LedgerEntry } from "@/core/types/LedgerEntry";
import { matchesActivityFilter } from "@/composables/filter/useActivityFilter";
import { addDays, getDayStartTimestamp } from "@/core/utils";

export type LedgerViewScale = "day" | "week" | "month" | "year";
export type LedgerTableSort = "time" | "tag";

/** 与 todosForCurrentView 一致：todo.id 决定所属日 */
export type LedgerTodoRef = { id: number; deleted?: boolean };

export interface LedgerQueryParams {
  entries: readonly LedgerEntry[];
  rangeStart: number;
  rangeEnd: number;
  viewScale: LedgerViewScale;
  filterTagIds: readonly number[];
  filterStarredOnly: boolean;
  getTodoById: (todoId: number) => LedgerTodoRef | undefined;
  getTodoByActivityId?: (activityId: number) => LedgerTodoRef | undefined;
  getActivityTagIds: (activityId: number) => number[] | undefined;
  hasStarredTaskForActivity: (activityId: number) => boolean;
  getTagName: (tagId: number) => string | undefined;
}
export interface LedgerSummaryStats {
  entryCount: number;
  totalExpense: number;
  totalIncome: number;
  net: number;
}

export interface LedgerPieSlice {
  name: string;
  value: number;
  tagId?: number;
}

export interface LedgerTrendBucket {
  key: string;
  label: string;
  start: number;
  expense: number;
  income: number;
}

export interface LedgerTableRow {
  id: number;
  recordedAt: number;
  direction: LedgerDirection;
  amount: number;
  memo?: string;
  categoryLabels: string[];
  sortTagLabel: string;
}

export interface LedgerAggregateResult {
  stats: LedgerSummaryStats;
  pie: { show: boolean; slices: LedgerPieSlice[] };
  trend: LedgerTrendBucket[];
  tableRows: LedgerTableRow[];
}

const UNCATEGORIZED = "未分类";
const OTHERS_LABEL = "Others";

function getStartOfWeek(ts: number): number {
  const weekStartsOn = 1;
  const d = new Date(getDayStartTimestamp(ts));
  const jsDay = d.getDay();
  const offset = (jsDay - weekStartsOn + 7) % 7;
  return addDays(d.getTime(), -offset);
}

function getStartOfMonth(ts: number): number {
  const d = new Date(ts);
  const m0 = new Date(d.getFullYear(), d.getMonth(), 1);
  m0.setHours(0, 0, 0, 0);
  return m0.getTime();
}

function signedAmount(entry: LedgerEntry): number {
  return entry.direction === "income" ? entry.amount : -entry.amount;
}

function expenseAmount(entry: LedgerEntry): number {
  return entry.direction === "expense" ? entry.amount : 0;
}

function incomeAmount(entry: LedgerEntry): number {
  return entry.direction === "income" ? entry.amount : 0;
}

/** activity 与 todo 1:1（todoByActivityId）；优先 sourceTodoId，否则按 sourceActivityId 查 todo */
export function resolveLedgerPlannerTs(
  entry: LedgerEntry,
  getTodoById: (todoId: number) => LedgerTodoRef | undefined,
  getTodoByActivityId?: (activityId: number) => LedgerTodoRef | undefined,
): number | undefined {
  const byTodoId = entry.sourceTodoId ? getTodoById(entry.sourceTodoId) : undefined;
  const todo =
    byTodoId && !byTodoId.deleted ? byTodoId : getTodoByActivityId?.(entry.sourceActivityId);
  if (!todo || todo.deleted) return undefined;
  return todo.id;
}

/** 与 Planner 相同的 tag / 加星筛选；范围按 todo.id */
export function filterLedgerEntries(params: LedgerQueryParams): LedgerEntry[] {
  const {
    entries,
    rangeStart,
    rangeEnd,
    filterTagIds,
    filterStarredOnly,
    getTodoById,
    getTodoByActivityId,
    getActivityTagIds,
    hasStarredTaskForActivity,
  } = params;

  return entries.filter((entry) => {
    if (entry.deleted) return false;
    const plannerTs = resolveLedgerPlannerTs(entry, getTodoById, getTodoByActivityId);
    if (plannerTs == null || plannerTs < rangeStart || plannerTs >= rangeEnd) return false;
    const activityId = entry.sourceActivityId;
    return matchesActivityFilter({
      filterTagIds,
      filterStarredOnly,
      activityId,
      activityTagIds: getActivityTagIds(activityId),
      hasStarredTaskForActivity,
    });
  });
}

function primaryCategoryTagId(entry: LedgerEntry): number | undefined {
  return entry.categoryTagIds?.[0];
}

function categoryLabels(entry: LedgerEntry, getTagName: (id: number) => string | undefined): string[] {
  const ids = entry.categoryTagIds ?? [];
  if (ids.length === 0) return [];
  return ids.map((id) => getTagName(id) ?? `#${id}`);
}

function sortTagLabel(entry: LedgerEntry, getTagName: (id: number) => string | undefined): string {
  const tagId = primaryCategoryTagId(entry);
  if (tagId == null) return UNCATEGORIZED;
  return getTagName(tagId) ?? `#${tagId}`;
}

export function buildLedgerStats(entries: readonly LedgerEntry[]): LedgerSummaryStats {
  let totalExpense = 0;
  let totalIncome = 0;
  for (const entry of entries) {
    totalExpense += expenseAmount(entry);
    totalIncome += incomeAmount(entry);
  }
  return {
    entryCount: entries.length,
    totalExpense,
    totalIncome,
    net: totalIncome - totalExpense,
  };
}

/** 支出饼图：按 categoryTagIds[0]；<1% 并入 Others */
export function buildLedgerPie(
  entries: readonly LedgerEntry[],
  getTagName: (tagId: number) => string | undefined,
): { show: boolean; slices: LedgerPieSlice[] } {
  const bucket = new Map<string, { value: number; tagId?: number }>();
  for (const entry of entries) {
    if (entry.direction !== "expense") continue;
    const tagId = primaryCategoryTagId(entry);
    const name = tagId != null ? (getTagName(tagId) ?? `#${tagId}`) : UNCATEGORIZED;
    const prev = bucket.get(name) ?? { value: 0, tagId };
    prev.value += entry.amount;
    bucket.set(name, prev);
  }

  const rawSlices: LedgerPieSlice[] = [...bucket.entries()]
    .map(([name, { value, tagId }]) => ({ name, value, tagId }))
    .filter((s) => s.value > 0)
    .sort((a, b) => b.value - a.value);

  const total = rawSlices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) {
    return { show: true, slices: [] };
  }

  const main: LedgerPieSlice[] = [];
  let others = 0;
  for (const slice of rawSlices) {
    if (slice.value / total < 0.01) {
      others += slice.value;
    } else {
      main.push(slice);
    }
  }
  if (others > 0) {
    main.push({ name: OTHERS_LABEL, value: others });
  }

  return { show: true, slices: main };
}

function formatDayLabel(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatYearMonthLabel(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short" });
}

function getISOWeekNumber(ts: number): number {
  const d = new Date(ts);
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((+date - +firstThursday) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

function buildTrendBuckets(rangeStart: number, rangeEnd: number, viewScale: LedgerViewScale): LedgerTrendBucket[] {
  const buckets: LedgerTrendBucket[] = [];

  if (viewScale === "day") {
    const center = getDayStartTimestamp(rangeStart);
    for (let offset = -3; offset <= 3; offset++) {
      const start = addDays(center, offset);
      buckets.push({
        key: `d-${start}`,
        label: formatDayLabel(start),
        start,
        expense: 0,
        income: 0,
      });
    }
    return buckets;
  }

  if (viewScale === "week") {
    for (let d = 0; d < 7; d++) {
      const start = addDays(rangeStart, d);
      if (start >= rangeEnd) break;
      buckets.push({ key: `d-${start}`, label: formatDayLabel(start), start, expense: 0, income: 0 });
    }
    return buckets;
  }

  if (viewScale === "month") {
    let cursor = getStartOfWeek(rangeStart);
    while (cursor < rangeEnd) {
      buckets.push({
        key: `w-${cursor}`,
        label: String(getISOWeekNumber(cursor)),
        start: cursor,
        expense: 0,
        income: 0,
      });
      cursor = addDays(cursor, 7);
    }
    return buckets;
  }

  let cursor = getStartOfMonth(rangeStart);
  while (cursor < rangeEnd) {
    buckets.push({
      key: `m-${cursor}`,
      label: formatYearMonthLabel(cursor),
      start: cursor,
      expense: 0,
      income: 0,
    });
    const d = new Date(cursor);
    cursor = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
  }
  return buckets;
}

function findTrendBucketIndex(buckets: LedgerTrendBucket[], plannerTs: number, viewScale: LedgerViewScale): number {
  if (buckets.length === 0) return -1;

  if (viewScale === "day") {
    const dayStart = getDayStartTimestamp(plannerTs);
    return buckets.findIndex((b) => b.start === dayStart);
  }

  for (let i = buckets.length - 1; i >= 0; i--) {
    const start = buckets[i]!.start;
    const nextStart = i + 1 < buckets.length ? buckets[i + 1]!.start : Number.POSITIVE_INFINITY;
    if (plannerTs >= start && plannerTs < nextStart) return i;
  }
  return buckets.length - 1;
}

function sortTableRows(rows: LedgerTableRow[], sort: LedgerTableSort): LedgerTableRow[] {
  const sortGroup = (group: LedgerTableRow[]): LedgerTableRow[] => {
    const copy = [...group];
    if (sort === "time") {
      copy.sort((a, b) => b.recordedAt - a.recordedAt);
    } else {
      copy.sort((a, b) => {
        const tagCmp = a.sortTagLabel.localeCompare(b.sortTagLabel, "zh-CN");
        if (tagCmp !== 0) return tagCmp;
        return b.recordedAt - a.recordedAt;
      });
    }
    return copy;
  };
  return [...sortGroup(rows.filter((r) => r.direction === "income")), ...sortGroup(rows.filter((r) => r.direction === "expense"))];
}

function resolveTrendQueryRange(rangeStart: number, rangeEnd: number, viewScale: LedgerViewScale): { start: number; end: number } {
  if (viewScale !== "day") return { start: rangeStart, end: rangeEnd };
  const center = getDayStartTimestamp(rangeStart);
  return { start: addDays(center, -3), end: addDays(center, 4) };
}

export function buildLedgerTrend(
  entries: readonly LedgerEntry[],
  rangeStart: number,
  rangeEnd: number,
  viewScale: LedgerViewScale,
  getTodoById: (todoId: number) => LedgerTodoRef | undefined,
  getTodoByActivityId?: (activityId: number) => LedgerTodoRef | undefined,
): LedgerTrendBucket[] {
  const buckets = buildTrendBuckets(rangeStart, rangeEnd, viewScale);
  for (const entry of entries) {
    const plannerTs = resolveLedgerPlannerTs(entry, getTodoById, getTodoByActivityId);
    if (plannerTs == null) continue;
    const idx = findTrendBucketIndex(buckets, plannerTs, viewScale);
    if (idx < 0) continue;
    buckets[idx]!.expense += expenseAmount(entry);
    buckets[idx]!.income += incomeAmount(entry);
  }
  return buckets;
}

export function buildLedgerTableRows(
  entries: readonly LedgerEntry[],
  getTagName: (id: number) => string | undefined,
  getTodoById: (todoId: number) => LedgerTodoRef | undefined,
  sort: LedgerTableSort,
  getTodoByActivityId?: (activityId: number) => LedgerTodoRef | undefined,
): LedgerTableRow[] {
  const rows: LedgerTableRow[] = [];
  for (const entry of entries) {
    const plannerTs = resolveLedgerPlannerTs(entry, getTodoById, getTodoByActivityId);
    if (plannerTs == null) continue;
    rows.push({
      id: entry.id,
      recordedAt: plannerTs,
      direction: entry.direction,
      amount: entry.amount,
      memo: entry.memo,
      categoryLabels: categoryLabels(entry, getTagName),
      sortTagLabel: sortTagLabel(entry, getTagName),
    });
  }

  return sortTableRows(rows, sort);
}

export function aggregateLedger(params: LedgerQueryParams, tableSort: LedgerTableSort = "time"): LedgerAggregateResult {
  const filtered = filterLedgerEntries(params);
  const trendRange = resolveTrendQueryRange(params.rangeStart, params.rangeEnd, params.viewScale);
  const trendEntries =
    params.viewScale === "day"
      ? filterLedgerEntries({ ...params, rangeStart: trendRange.start, rangeEnd: trendRange.end })
      : filtered;
  return {
    stats: buildLedgerStats(filtered),
    pie: buildLedgerPie(filtered, params.getTagName),
    trend: buildLedgerTrend(
      trendEntries,
      params.rangeStart,
      params.rangeEnd,
      params.viewScale,
      params.getTodoById,
      params.getTodoByActivityId,
    ),
    tableRows: buildLedgerTableRows(
      filtered,
      params.getTagName,
      params.getTodoById,
      tableSort,
      params.getTodoByActivityId,
    ),
  };
}

export function formatLedgerMoney(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2);
}

/** 明细表金额：固定两位小数 */
export function formatLedgerMoneyFixed(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return rounded.toFixed(2);
}

export { signedAmount };
