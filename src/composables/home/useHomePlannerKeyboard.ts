import type { Ref } from "vue";
import { nextTick } from "vue";
import { activatePlannerNavigatorField, enterPlannerNavigator } from "@/composables/keyboard/usePlannerKeyboardNavigator";
import type { Activity } from "@/core/types/Activity";
import { repeatActivityToDay } from "@/services/activity/repeatActivityToDay";

type PlannerViewType = "day" | "week" | "month" | "year";

type ActivityMapTodo = {
  activityId: number;
};

type ActivityMapSchedule = {
  activityId: number;
};

type MinimalTask = {
  id: number;
};

interface UseHomePlannerKeyboardOptions {
  onDateSet: (mode: "prev" | "next" | "today") => void;
  onQuickAddTodo: () => void;
  onStateLogConfirm: () => void;
  onQuickAddSchedule: (isUntaetigkeit: boolean) => void;
  onRepeatActivity: (noTodoRepeat: boolean) => void;
  onIcsExport: () => Promise<void>;
  onEditField: (field: "title" | "start" | "done" | "duration" | "location") => boolean;
  settingStore: {
    settings: {
      viewSet: PlannerViewType;
      topHeight: number;
    };
  };
  dateService: {
    combineDateAndTime: (baseTs: number, timeTs: number | null) => number;
  };
  appDateTimestamp: Ref<number>;
  activeId: Ref<number | null | undefined>;
  selectedRowId: Ref<number | null | undefined>;
  selectedActivityId: Ref<number | null | undefined>;
  selectedTaskId: Ref<number | null | undefined>;
  activityList: Ref<Activity[]>;
  taskList: Ref<MinimalTask[]>;
  activityById: Ref<Map<number, Activity>>;
  todoById: Ref<Map<number, ActivityMapTodo>>;
  scheduleById: Ref<Map<number, ActivityMapSchedule>>;
  saveAllDebounced: () => void;
  createTaskFromActivity: (activityId: number, title: string) => MinimalTask;
}

export function useHomePlannerKeyboard(options: UseHomePlannerKeyboardOptions) {
  const plannerGotoPrev = (): boolean => {
    options.onDateSet("prev");
    return true;
  };

  const plannerGotoNext = (): boolean => {
    options.onDateSet("next");
    return true;
  };

  const plannerGotoCurrent = (): boolean => {
    options.onDateSet("today");
    return true;
  };

  const plannerGotoTodayDay = (): boolean => {
    options.settingStore.settings.viewSet = "day";
    options.settingStore.settings.topHeight = 610;
    options.onDateSet("today");
    return true;
  };

  const plannerGotoDay = (): boolean => {
    options.settingStore.settings.viewSet = "day";
    options.settingStore.settings.topHeight = 300;
    return true;
  };

  const plannerGotoWeek = (): boolean => {
    options.settingStore.settings.viewSet = "week";
    options.settingStore.settings.topHeight = 610;
    return true;
  };

  const plannerGotoMonth = (): boolean => {
    options.settingStore.settings.viewSet = "month";
    options.settingStore.settings.topHeight = 610;
    return true;
  };

  const plannerGotoYear = (): boolean => {
    options.settingStore.settings.viewSet = "year";
    options.settingStore.settings.topHeight = 450;
    return true;
  };

  /** 快速新增后进入 Planner navigator 并激活当前格编辑（day 视图下等同 pn 后 Space） */
  const schedulePlannerNavigatorEnterAndActivate = () => {
    void nextTick(() => {
      if (!enterPlannerNavigator()) return;
      void nextTick(() => {
        activatePlannerNavigatorField();
      });
    });
  };

  const plannerAddTodo = (): boolean => {
    options.onQuickAddTodo();
    schedulePlannerNavigatorEnterAndActivate();
    return true;
  };

  const plannerStateLog = (): boolean => {
    options.onStateLogConfirm();
    return true;
  };

  const plannerAddSchedule = (): boolean => {
    options.onQuickAddSchedule(false);
    schedulePlannerNavigatorEnterAndActivate();
    return true;
  };

  const getRepeatSourceActivity = (): Activity | null => {
    if (options.selectedRowId.value != null) {
      const todo = options.todoById.value.get(options.selectedRowId.value);
      const schedule = options.scheduleById.value.get(options.selectedRowId.value);
      const sourceActivityId = todo?.activityId ?? schedule?.activityId;
      if (!sourceActivityId) return null;
      return options.activityById.value.get(sourceActivityId) ?? null;
    }
    if (options.activeId.value == null) return null;
    return options.activityById.value.get(options.activeId.value) ?? null;
  };

  const plannerRepeatActivityOnly = (): boolean => {
    const sourceActivity = getRepeatSourceActivity();
    if (!sourceActivity) return false;

    const result = repeatActivityToDay({
      sourceActivity,
      targetDayStart: options.appDateTimestamp.value,
      isTargetDayToday: true,
      activityOnly: true,
      combineDateAndTime: options.dateService.combineDateAndTime,
    });
    options.activityList.value.push(result.activity);
    options.taskList.value = [...options.taskList.value, result.task];
    options.activeId.value = result.activity.id;
    options.selectedActivityId.value = result.activity.id;
    options.selectedTaskId.value = result.task.id;
    options.selectedRowId.value = null;
    options.saveAllDebounced();
    return true;
  };

  const plannerRepeatActivity = (): boolean => {
    if (options.selectedRowId.value == null && options.activeId.value == null) return false;
    options.onRepeatActivity(false);
    return true;
  };

  const plannerExportIcs = (): boolean => {
    if (options.selectedRowId.value == null) return false;
    void options.onIcsExport();
    return true;
  };

  const plannerEditField = (field: "title" | "start" | "done" | "duration" | "location"): boolean => {
    return options.onEditField(field);
  };

  return {
    plannerCommandApi: {
      gotoPrev: plannerGotoPrev,
      gotoNext: plannerGotoNext,
      gotoCurrent: plannerGotoCurrent,
      gotoTodayDay: plannerGotoTodayDay,
      gotoDay: plannerGotoDay,
      gotoWeek: plannerGotoWeek,
      gotoMonth: plannerGotoMonth,
      gotoYear: plannerGotoYear,
      addTodo: plannerAddTodo,
      stateLog: plannerStateLog,
      addSchedule: plannerAddSchedule,
      repeatActivityOnly: plannerRepeatActivityOnly,
      repeatActivity: plannerRepeatActivity,
      exportIcs: plannerExportIcs,
      editField: plannerEditField,
    },
  };
}
