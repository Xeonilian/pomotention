/**
 * 活动四象限：仅用 Urgent(85)、Important(126) 两枚标签划分。
 */
import type { InjectionKey, Ref } from "vue";
import type { Activity } from "@/core/types/Activity";
import type { useDataStore } from "@/stores/useDataStore";
import { TAG_ID_IMPORTANT, TAG_ID_URGENT } from "@/core/constants";

type DataStore = ReturnType<typeof useDataStore>;

export type ActivityQuadrantKey = "urgentImportant" | "importantOnly" | "urgentOnly" | "neither";

/** 与 ActivitySection 排序下拉一致，象限模式四格共享同一排序态 */
export type ActivitySectionSortKey = "rank" | "due" | "type" | "tag";

export type KanbanQuadrantUiLabels = Record<ActivityQuadrantKey, string>;

export const DEFAULT_KANBAN_QUADRANT_UI_LABELS: KanbanQuadrantUiLabels = {
  importantOnly: "Important, not Urgent",
  urgentImportant: "Urgent & Important",
  urgentOnly: "Urgent, not Important",
  neither: "Later",
};

/** ActivitySheet provide → 象限下列头-only / list-only 的 ActivitySection 共用排序 */
export const ACTIVITY_QUADRANT_SORT_KEY: InjectionKey<Ref<ActivitySectionSortKey>> = Symbol("activityQuadrantSort");

const QUADRANT_KEYS: ActivityQuadrantKey[] = ["urgentImportant", "importantOnly", "urgentOnly", "neither"];

export function isActivityQuadrantKey(s: string): s is ActivityQuadrantKey {
  return QUADRANT_KEYS.includes(s as ActivityQuadrantKey);
}

export type QuadrantDragEndPayload = {
  event: PointerEvent;
  activity: Activity;
  clientX: number;
  clientY: number;
};

/** ActivitySheet provide → ActivitySection inject，松手时尝试写入象限标签 */
export const ACTIVITY_QUADRANT_DRAG_END_KEY: InjectionKey<(payload: QuadrantDragEndPayload) => void> = Symbol("activityQuadrantDragEnd");

/** ActivitySheet provide → 列头退出窄屏「独奏」仅显示一格 */
export const ACTIVITY_QUADRANT_SOLO_KEY: InjectionKey<{
  soloQuadrantKey: Ref<ActivityQuadrantKey | null>;
  exitSolo: () => void;
}> = Symbol("activityQuadrantSolo");

export function getActivityQuadrantKey(activity: Activity): ActivityQuadrantKey {
  const ids = activity.tagIds ?? [];
  const hasU = ids.includes(TAG_ID_URGENT);
  const hasI = ids.includes(TAG_ID_IMPORTANT);
  if (hasU && hasI) return "urgentImportant";
  if (hasI) return "importantOnly";
  if (hasU) return "urgentOnly";
  return "neither";
}

export function filterActivitiesForQuadrantKey(pool: Activity[], key: ActivityQuadrantKey): Activity[] {
  return pool.filter((a) => getActivityQuadrantKey(a) === key);
}

/** 与 ActivityRow 日期列 + ActivitySheet.getCountdownClass 一致：待办看 dueDate，日程看 dueRange[0]，v0.6.8 起废弃 */
export function getActivityPrimaryDueMs(activity: Activity): number | null {
  if (activity.class === "T") {
    const d = activity.dueDate;
    return d != null && d !== 0 ? d : null;
  }
  const r = activity.dueRange?.[0];
  return r != null && r !== 0 ? r : null;
}

type DueDayBucket = "none" | "past" | "today" | "future";

function dueDayBucket(dueMs: number | null): DueDayBucket {
  if (dueMs == null) return "none";
  const now = new Date();
  const due = new Date(dueMs);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due.getTime() - now.setHours(0, 0, 0, 0)) / 86400000);
  if (diff === 0) return "today";
  if (diff < 0) return "past";
  return "future";
}

const quadrantDueDayPrev = new Map<number, DueDayBucket>();

/**
 * 四象限模式：按主到期日与 ActivitySheet.getCountdownClass 同源口径同步象限标签。 v0.6.8 起废弃 getCountdownClass 函数。
 * 凡改动 tagIds 均经 dataStore.setActivityTags / applyQuadrantToActivity，与 store 内 lastModified、synced、持久化、防抖上传一致。
 * - 到期日从非今天变为今天：追加 TAG_ID_URGENT（85）；用户当日手动去掉 urgent 后不会反复补回。
 * - 到期日从当天改为未来或清空主到期：去掉 TAG_ID_URGENT（保留 126）；与「当天→过期」整组进 Later 分支区分。
 * - 主到期已过期（diff&lt;0，即 countdown-boom）：若有 urgent/important，则写入 Later（去掉 85、126）；手动改日期同样会触发。
 */
export function syncQuadrantTagsFromPrimaryDue(store: DataStore, activities: readonly Activity[]): void {
  const seen = new Set<number>();

  for (const a of activities) {
    if (a.deleted || a.status === "cancelled" || a.isUntaetigkeit) continue;

    seen.add(a.id);
    const dueMs = getActivityPrimaryDueMs(a);
    const bucket = dueDayBucket(dueMs);
    const before = quadrantDueDayPrev.get(a.id);

    if (bucket === "past") {
      const ids = a.tagIds ?? [];
      if (ids.includes(TAG_ID_URGENT) || ids.includes(TAG_ID_IMPORTANT)) {
        applyQuadrantToActivity(store, a.id, "neither");
      }
    } else if (before === "today" && (bucket === "future" || bucket === "none")) {
      // 主到期离开「当天」落到未来或无日期：撤销 urgent（日程 S 改约时常用）
      const ids = a.tagIds ?? [];
      if (ids.includes(TAG_ID_URGENT)) {
        const next = ids.filter((id) => id !== TAG_ID_URGENT);
        store.setActivityTags(a.id, next.length ? next : []);
      }
    } else if (bucket === "today" && before !== "today" && !a.tagIds?.includes(TAG_ID_URGENT)) {
      const next = [...(a.tagIds ?? []), TAG_ID_URGENT];
      store.setActivityTags(a.id, next);
    }

    quadrantDueDayPrev.set(a.id, bucket);
  }

  for (const id of quadrantDueDayPrev.keys()) {
    if (!seen.has(id)) quadrantDueDayPrev.delete(id);
  }
}

/** 松手投放象限：仅通过 store.setActivityTags 写标签，保证云端待同步元数据与拖动路径一致 */
export function applyQuadrantToActivity(store: DataStore, activityId: number, targetKey: ActivityQuadrantKey): void {
  const activity = store.activityById.get(activityId);
  if (!activity || activity.deleted) return;

  if (getActivityQuadrantKey(activity) === targetKey) return;

  const rest = (activity.tagIds ?? []).filter((id) => id !== TAG_ID_URGENT && id !== TAG_ID_IMPORTANT);
  let next: number[];
  switch (targetKey) {
    case "urgentImportant":
      next = [...rest, TAG_ID_URGENT, TAG_ID_IMPORTANT];
      break;
    case "importantOnly":
      next = [...rest, TAG_ID_IMPORTANT];
      break;
    case "urgentOnly":
      next = [...rest, TAG_ID_URGENT];
      break;
    case "neither":
      next = rest;
      break;
  }
  store.setActivityTags(activityId, next.length ? next : []);
}

/** 指针下最近的象限投放区（含空白 padding） */
export function findQuadrantKeyFromPoint(clientX: number, clientY: number): ActivityQuadrantKey | null {
  const els = document.elementsFromPoint(clientX, clientY);
  for (const el of els) {
    const host = (el as HTMLElement).closest?.("[data-quadrant]");
    if (!host) continue;
    const attr = host.getAttribute("data-quadrant");
    if (attr && isActivityQuadrantKey(attr)) return attr;
  }
  return null;
}
