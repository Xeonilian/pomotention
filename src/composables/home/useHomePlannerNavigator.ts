import { onMounted, onUnmounted, ref, type Ref } from "vue";
import type { Schedule } from "@/core/types/Schedule";
import type { Todo, TodoWithTaskRecords } from "@/core/types/Todo";
import { registerPlannerNavigatorApi } from "@/composables/keyboard/usePlannerKeyboardNavigator";
import { useSettingStore } from "@/stores/useSettingStore";

/** DayPlanner 暴露给首页键盘导航的 API（与 HomeView ref 类型对齐） */
export type HomeDayPlannerKeyboardExpose = {
  startTodoKeyboardEdit: (field: "title" | "start" | "done") => boolean;
  startScheduleKeyboardEdit: (field: "title" | "start" | "done" | "duration" | "location") => boolean;
  movePlannerKeyboardCell: (delta: 1 | -1) => boolean;
  activatePlannerKeyboardCell: () => boolean;
  toggleSelectedRowCheckKeyboard: () => boolean;
  confirmPlannerKeyboardCellAction: () => boolean;
  navigatePlannerKeyboardSubSelection: (delta: number) => boolean;
};

type PlannerKeyboardRow = { rowId: number };

export interface UseHomePlannerNavigatorOptions {
  settingStore: ReturnType<typeof useSettingStore>;
  dayPlannerRef: Ref<HomeDayPlannerKeyboardExpose | null>;
  todosForCurrentViewWithTaskRecords: Ref<TodoWithTaskRecords[] | undefined>;
  schedulesForCurrentView: Ref<Schedule[] | undefined>;
  todoById: Ref<Map<number, Todo>>;
  scheduleById: Ref<Map<number, Schedule>>;
  selectedRowId: Ref<number | null | undefined>;
  selectedActivityId: Ref<number | null>;
  selectedTaskId: Ref<number | null | undefined>;
  activeId: Ref<number | null | undefined>;
}

/**
 * Planner 行导航（pn）：状态、行列表与 registerPlannerNavigatorApi 生命周期，供 MainLayout 全局键使用。
 */
export function useHomePlannerNavigator(options: UseHomePlannerNavigatorOptions) {
  const {
    settingStore,
    dayPlannerRef,
    todosForCurrentViewWithTaskRecords,
    schedulesForCurrentView,
    todoById,
    scheduleById,
    selectedRowId,
    selectedActivityId,
    selectedTaskId,
    activeId,
  } = options;

  const plannerNavigatorActive = ref(false);

  let unregisterNavigatorApi: (() => void) | null = null;

  function getPlannerKeyboardRows(): PlannerKeyboardRow[] {
    const rows: PlannerKeyboardRow[] = [];
    for (const todo of todosForCurrentViewWithTaskRecords.value ?? []) {
      rows.push({ rowId: todo.id });
    }
    for (const schedule of schedulesForCurrentView.value ?? []) {
      rows.push({ rowId: schedule.id });
    }
    return rows;
  }

  function selectPlannerKeyboardRowById(rowId: number): boolean {
    const todo = todoById.value.get(rowId);
    if (todo) {
      selectedRowId.value = todo.id;
      selectedActivityId.value = todo.activityId;
      selectedTaskId.value = todo.taskId ?? null;
      activeId.value = undefined;
      return true;
    }
    const schedule = scheduleById.value.get(rowId);
    if (schedule) {
      selectedRowId.value = schedule.id;
      selectedActivityId.value = schedule.activityId;
      selectedTaskId.value = schedule.taskId ?? null;
      activeId.value = undefined;
      return true;
    }
    return false;
  }

  function enterPlannerNavigatorMode(): boolean {
    const rows = getPlannerKeyboardRows();
    if (rows.length === 0) return false;
    plannerNavigatorActive.value = true;
    const current = selectedRowId.value;
    const exists = current != null && rows.some((row) => row.rowId === current);
    if (!exists) {
      return selectPlannerKeyboardRowById(rows[0].rowId);
    }
    return true;
  }

  function movePlannerNavigatorMode(delta: 1 | -1): boolean {
    const rows = getPlannerKeyboardRows();
    if (rows.length === 0) return false;
    const currentIndex = rows.findIndex((row) => row.rowId === selectedRowId.value);
    const lastIndex = rows.length - 1;
    let nextIndex = currentIndex === -1 ? (delta > 0 ? 0 : lastIndex) : currentIndex + delta;
    if (nextIndex < 0) nextIndex = lastIndex;
    if (nextIndex > lastIndex) nextIndex = 0;
    return selectPlannerKeyboardRowById(rows[nextIndex].rowId);
  }

  function pickPlannerRowByDigitMode(digit: number): boolean {
    if (digit < 1 || digit > 9) return false;
    const rows = getPlannerKeyboardRows();
    const target = rows[digit - 1];
    if (!target) return false;
    return selectPlannerKeyboardRowById(target.rowId);
  }

  function exitPlannerNavigatorMode() {
    plannerNavigatorActive.value = false;
  }

  function movePlannerNavigatorFieldMode(delta: 1 | -1): boolean {
    if (!plannerNavigatorActive.value) return false;
    if (settingStore.settings.viewSet !== "day") return false;
    return dayPlannerRef.value?.movePlannerKeyboardCell(delta) ?? false;
  }

  function activatePlannerNavigatorFieldMode(): boolean {
    if (!plannerNavigatorActive.value) return false;
    if (settingStore.settings.viewSet !== "day") return false;
    return dayPlannerRef.value?.activatePlannerKeyboardCell() ?? false;
  }

  function confirmPlannerNavigatorFieldMode(): boolean {
    if (!plannerNavigatorActive.value) return false;
    if (settingStore.settings.viewSet !== "day") return false;
    const handled = dayPlannerRef.value?.confirmPlannerKeyboardCellAction() ?? false;
    if (handled) return true;
    exitPlannerNavigatorMode();
    return true;
  }

  function navigatePlannerNavigatorSubSelectionMode(delta: number): boolean {
    if (!plannerNavigatorActive.value) return false;
    if (settingStore.settings.viewSet !== "day") return false;
    return dayPlannerRef.value?.navigatePlannerKeyboardSubSelection(delta) ?? false;
  }

  onMounted(() => {
    unregisterNavigatorApi = registerPlannerNavigatorApi({
      enter: enterPlannerNavigatorMode,
      move: movePlannerNavigatorMode,
      pickByDigit: pickPlannerRowByDigitMode,
      moveField: movePlannerNavigatorFieldMode,
      activateField: activatePlannerNavigatorFieldMode,
      confirmField: confirmPlannerNavigatorFieldMode,
      navigateSubSelection: navigatePlannerNavigatorSubSelectionMode,
      exit: exitPlannerNavigatorMode,
      isActive: () => plannerNavigatorActive.value,
    });
  });

  onUnmounted(() => {
    if (unregisterNavigatorApi) {
      unregisterNavigatorApi();
      unregisterNavigatorApi = null;
    }
  });

  return {
    plannerNavigatorActive,
  };
}
