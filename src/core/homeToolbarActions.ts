/** Home 顶栏工具：手机端 3 槽 + popover（标签筛选 / 记账 / 生活记录） */

import type { LifeRecordKind } from "@/core/lifeRecord";

export type HomeToolbarActionId = "tagFilter" | "ledger" | LifeRecordKind;

export const HOME_TOOLBAR_ACTION_IDS: HomeToolbarActionId[] = [
  "tagFilter",
  "ledger",
  "drink",
  "eat",
  "toilet",
  "sleep",
];

export const HOME_TOOLBAR_MOBILE_SLOT_COUNT = 3;

export const DEFAULT_HOME_TOOLBAR_MOBILE_PINNED: HomeToolbarActionId[] = ["tagFilter", "ledger", "drink"];

export const HOME_TOOLBAR_ACTION_TITLES: Record<HomeToolbarActionId, string> = {
  tagFilter: "标签筛选",
  ledger: "收支统计",
  drink: "记一次喝水",
  eat: "记一次吃饭",
  toilet: "记一次如厕",
  sleep: "记一次睡觉",
};

const VALID_IDS = new Set<HomeToolbarActionId>(HOME_TOOLBAR_ACTION_IDS);

export function isHomeToolbarActionId(id: unknown): id is HomeToolbarActionId {
  return typeof id === "string" && VALID_IDS.has(id as HomeToolbarActionId);
}

/** 校验并补齐为恰好 3 个固定槽 */
export function normalizeHomeToolbarMobilePinned(raw?: HomeToolbarActionId[] | null): HomeToolbarActionId[] {
  const seen = new Set<HomeToolbarActionId>();
  const result: HomeToolbarActionId[] = [];

  for (const id of raw ?? []) {
    if (!isHomeToolbarActionId(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= HOME_TOOLBAR_MOBILE_SLOT_COUNT) return result;
  }

  for (const id of [...DEFAULT_HOME_TOOLBAR_MOBILE_PINNED, ...HOME_TOOLBAR_ACTION_IDS]) {
    if (result.length >= HOME_TOOLBAR_MOBILE_SLOT_COUNT) break;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result.slice(0, HOME_TOOLBAR_MOBILE_SLOT_COUNT);
}

export function getHomeToolbarOverflowIds(pinned: HomeToolbarActionId[]): HomeToolbarActionId[] {
  const pinnedSet = new Set(normalizeHomeToolbarMobilePinned(pinned));
  return HOME_TOOLBAR_ACTION_IDS.filter((id) => !pinnedSet.has(id));
}

/**
 * 松保存：0 个不变；满槽按选中顺序整批替换；
 * 不足则新项接到末尾，从最前面顶出对应个数。
 */
export function mergeHomeToolbarMobilePinned(
  currentPinned: HomeToolbarActionId[],
  editSelection: HomeToolbarActionId[],
): HomeToolbarActionId[] {
  if (editSelection.length === 0) {
    return normalizeHomeToolbarMobilePinned(currentPinned);
  }

  const selection = editSelection.filter(isHomeToolbarActionId);
  if (selection.length >= HOME_TOOLBAR_MOBILE_SLOT_COUNT) {
    return normalizeHomeToolbarMobilePinned(selection.slice(0, HOME_TOOLBAR_MOBILE_SLOT_COUNT));
  }

  const slots = [...normalizeHomeToolbarMobilePinned(currentPinned)];
  const toPlace = selection.filter((id) => !slots.includes(id));
  if (toPlace.length === 0) {
    return normalizeHomeToolbarMobilePinned(slots);
  }

  // 新项接末尾，左侧顶出
  const next = [...slots, ...toPlace];
  return normalizeHomeToolbarMobilePinned(next.slice(next.length - HOME_TOOLBAR_MOBILE_SLOT_COUNT));
}

/** 编辑态 FIFO 选中列表（最多 3） */
export function toggleHomeToolbarEditSelection(
  current: HomeToolbarActionId[],
  id: HomeToolbarActionId,
): HomeToolbarActionId[] {
  const idx = current.indexOf(id);
  if (idx >= 0) {
    return current.filter((x) => x !== id);
  }
  if (current.length >= HOME_TOOLBAR_MOBILE_SLOT_COUNT) {
    return [...current.slice(1), id];
  }
  return [...current, id];
}

export function isLifeRecordToolbarId(id: HomeToolbarActionId): id is LifeRecordKind {
  return id === "drink" || id === "eat" || id === "toilet" || id === "sleep";
}
