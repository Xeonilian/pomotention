/** Home 顶栏工具：手机端 2 槽 + popover（标签筛选 / 记账 / 生活记录） */

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

export const HOME_TOOLBAR_MOBILE_SLOT_COUNT = 2;

export const DEFAULT_HOME_TOOLBAR_MOBILE_PINNED: HomeToolbarActionId[] = ["tagFilter", "ledger"];

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

/** 校验并补齐为恰好 2 个固定槽 */
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
 * 松保存：0 个不变；2 个按选中顺序整批替换；1 个则保留左槽、替换右槽。
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
  const id = selection[0];
  if (slots.includes(id)) {
    return normalizeHomeToolbarMobilePinned(slots);
  }

  if (slots.length >= HOME_TOOLBAR_MOBILE_SLOT_COUNT) {
    slots[HOME_TOOLBAR_MOBILE_SLOT_COUNT - 1] = id;
  } else {
    slots.push(id);
  }

  return normalizeHomeToolbarMobilePinned(slots);
}

/** 编辑态 FIFO 选中列表（最多 2） */
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
