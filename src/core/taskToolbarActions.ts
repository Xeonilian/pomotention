/** Task 工具栏可配置动作（手机端 2 槽 + popover） */

export type TaskToolbarActionId = "star" | "tag" | "energy" | "reward" | "interruption" | "template";

export const TASK_TOOLBAR_ACTION_IDS: TaskToolbarActionId[] = [
  "star",
  "tag",
  "energy",
  "reward",
  "interruption",
  "template",
];

export const TASK_TOOLBAR_MOBILE_SLOT_COUNT = 2;

export const DEFAULT_TASK_TOOLBAR_MOBILE_PINNED: TaskToolbarActionId[] = ["star", "tag"];

export const TASK_TOOLBAR_ACTION_TITLES: Record<TaskToolbarActionId, string> = {
  star: "星标",
  tag: "标签",
  energy: "能量记录",
  reward: "奖赏记录",
  interruption: "打扰记录",
  template: "模板管理",
};

const VALID_IDS = new Set<TaskToolbarActionId>(TASK_TOOLBAR_ACTION_IDS);

export function isTaskToolbarActionId(id: unknown): id is TaskToolbarActionId {
  return typeof id === "string" && VALID_IDS.has(id as TaskToolbarActionId);
}

/** 校验并补齐为恰好 2 个固定槽 */
export function normalizeTaskToolbarMobilePinned(raw?: TaskToolbarActionId[] | null): TaskToolbarActionId[] {
  const seen = new Set<TaskToolbarActionId>();
  const result: TaskToolbarActionId[] = [];

  for (const id of raw ?? []) {
    if (!isTaskToolbarActionId(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
    if (result.length >= TASK_TOOLBAR_MOBILE_SLOT_COUNT) return result;
  }

  for (const id of [...DEFAULT_TASK_TOOLBAR_MOBILE_PINNED, ...TASK_TOOLBAR_ACTION_IDS]) {
    if (result.length >= TASK_TOOLBAR_MOBILE_SLOT_COUNT) break;
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }

  return result.slice(0, TASK_TOOLBAR_MOBILE_SLOT_COUNT);
}

export function getTaskToolbarOverflowIds(pinned: TaskToolbarActionId[]): TaskToolbarActionId[] {
  const pinnedSet = new Set(normalizeTaskToolbarMobilePinned(pinned));
  return TASK_TOOLBAR_ACTION_IDS.filter((id) => !pinnedSet.has(id));
}

/**
 * 松保存：0 个不变；2 个按选中顺序整批替换；1 个则保留左槽、替换右槽。
 */
export function mergeTaskToolbarMobilePinned(
  currentPinned: TaskToolbarActionId[],
  editSelection: TaskToolbarActionId[],
): TaskToolbarActionId[] {
  if (editSelection.length === 0) {
    return normalizeTaskToolbarMobilePinned(currentPinned);
  }

  const selection = editSelection.filter(isTaskToolbarActionId);
  if (selection.length >= TASK_TOOLBAR_MOBILE_SLOT_COUNT) {
    return normalizeTaskToolbarMobilePinned(selection.slice(0, TASK_TOOLBAR_MOBILE_SLOT_COUNT));
  }

  const slots = [...normalizeTaskToolbarMobilePinned(currentPinned)];
  const id = selection[0];
  if (slots.includes(id)) {
    return normalizeTaskToolbarMobilePinned(slots);
  }

  if (slots.length >= TASK_TOOLBAR_MOBILE_SLOT_COUNT) {
    slots[TASK_TOOLBAR_MOBILE_SLOT_COUNT - 1] = id;
  } else {
    slots.push(id);
  }

  return normalizeTaskToolbarMobilePinned(slots);
}

/** 编辑态 FIFO 选中列表（最多 2） */
export function toggleTaskToolbarEditSelection(
  current: TaskToolbarActionId[],
  id: TaskToolbarActionId,
): TaskToolbarActionId[] {
  const idx = current.indexOf(id);
  if (idx >= 0) {
    return current.filter((x) => x !== id);
  }
  if (current.length >= TASK_TOOLBAR_MOBILE_SLOT_COUNT) {
    return [...current.slice(1), id];
  }
  return [...current, id];
}
