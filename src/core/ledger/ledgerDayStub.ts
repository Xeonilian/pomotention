import type { Activity } from "@/core/types/Activity";
import type { LedgerEntry } from "@/core/types/LedgerEntry";
import { STANDALONE_LEDGER_ACTIVITY_ID } from "@/core/types/LedgerEntry";
import { getDayStartTimestamp } from "@/core/utils";

/** 统计追加日桶 Activity 的 title 前缀；完整形如 ledger-stub:1720828800000 */
export const LEDGER_STUB_TITLE_PREFIX = "ledger-stub:" as const;

/** 统计追加行 raw_segment 占位（非 title 片段） */
export const LEDGER_AGGREGATE_RAW_SEGMENT = "ledger-stub" as const;

export function buildLedgerStubTitle(dayStart: number): string {
  return `${LEDGER_STUB_TITLE_PREFIX}${dayStart}`;
}

export function isLedgerDayStubActivity(activity: Pick<Activity, "id" | "title">): boolean {
  if (!activity.title.startsWith(LEDGER_STUB_TITLE_PREFIX)) return false;
  const parsed = Number(activity.title.slice(LEDGER_STUB_TITLE_PREFIX.length));
  return Number.isFinite(parsed) && parsed === activity.id;
}

/** 确保某日 ledger 日桶 Activity 存在；id = 日初 ms */
export function ensureLedgerDayStub(activityList: Activity[], appDateTimestamp: number): number {
  const dayStart = getDayStartTimestamp(appDateTimestamp);
  const title = buildLedgerStubTitle(dayStart);
  const existing = activityList.find((a) => a.id === dayStart);
  const now = Date.now();

  if (existing) {
    if (!existing.deleted && !isLedgerDayStubActivity(existing)) {
      throw new Error(`ledger day stub id collision: activity ${dayStart} is not a ledger stub`);
    }
    existing.deleted = false;
    existing.title = title;
    existing.class = "T";
    existing.status = "done";
    existing.parentId = null;
    existing.synced = false;
    existing.lastModified = now;
    return dayStart;
  }

  activityList.push({
    id: dayStart,
    title,
    class: "T",
    status: "done",
    parentId: null,
    lastModified: now,
    synced: false,
    deleted: false,
  });
  return dayStart;
}

/** 该 activity 下无未删 ledger 行时软删 stub */
export function maybeRemoveLedgerDayStub(
  activityList: Activity[],
  ledgerList: readonly LedgerEntry[],
  activityId: number,
): boolean {
  const activity = activityList.find((a) => a.id === activityId);
  if (!activity || activity.deleted || !isLedgerDayStubActivity(activity)) return false;

  const hasActive = ledgerList.some((e) => !e.deleted && e.sourceActivityId === activityId);
  if (hasActive) return false;

  const now = Date.now();
  activity.deleted = true;
  activity.synced = false;
  activity.lastModified = now;
  return true;
}

/** legacy sourceActivityId=0 或 ledger-stub 日桶 */
export function isStandaloneLedgerEntry(
  entry: LedgerEntry,
  getActivity?: (activityId: number) => Pick<Activity, "id" | "title"> | undefined,
): boolean {
  if (entry.sourceActivityId === STANDALONE_LEDGER_ACTIVITY_ID) return true;
  const activity = getActivity?.(entry.sourceActivityId);
  return activity != null && isLedgerDayStubActivity(activity);
}
