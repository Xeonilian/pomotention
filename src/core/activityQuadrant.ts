/**
 * 活动四象限：仅用 Urgent(1)、Important(2) 两枚标签划分。
 */
import type { InjectionKey } from "vue";
import type { Activity } from "@/core/types/Activity";
import type { useDataStore } from "@/stores/useDataStore";
import { TAG_ID_IMPORTANT, TAG_ID_URGENT } from "@/core/constants";

export type ActivityQuadrantKey = "urgentImportant" | "importantOnly" | "urgentOnly" | "neither";

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
export const ACTIVITY_QUADRANT_DRAG_END_KEY: InjectionKey<(payload: QuadrantDragEndPayload) => void> =
  Symbol("activityQuadrantDragEnd");

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

type DataStore = ReturnType<typeof useDataStore>;

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
