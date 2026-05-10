import type { Ref } from "vue";
import type { Activity } from "@/core/types/Activity";

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

  const plannerAddTodo = (): boolean => {
    options.onQuickAddTodo();
    return true;
  };

  const plannerAddSchedule = (): boolean => {
    options.onQuickAddSchedule(false);
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

    const repeatedActivity: Activity = {
      ...sourceActivity,
      id: Date.now(),
      title: `${sourceActivity.title} re`,
      taskId: undefined,
      synced: false,
      deleted: false,
      lastModified: Date.now(),
    };

    if (sourceActivity.class === "T") {
      repeatedActivity.status = "ongoing";
      repeatedActivity.dueDate = options.appDateTimestamp.value;
    } else if (sourceActivity.class === "S" && sourceActivity.dueRange) {
      repeatedActivity.dueRange = [
        options.dateService.combineDateAndTime(options.appDateTimestamp.value, sourceActivity.dueRange[0]),
        sourceActivity.dueRange[1],
      ];
    }

    options.activityList.value.push(repeatedActivity);
    const task = options.createTaskFromActivity(repeatedActivity.id, repeatedActivity.title);
    options.taskList.value = [...options.taskList.value, task];
    repeatedActivity.taskId = task.id;
    repeatedActivity.lastModified = Date.now();
    options.activeId.value = repeatedActivity.id;
    options.selectedActivityId.value = repeatedActivity.id;
    options.selectedTaskId.value = task.id;
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
      addSchedule: plannerAddSchedule,
      repeatActivityOnly: plannerRepeatActivityOnly,
      repeatActivity: plannerRepeatActivity,
      exportIcs: plannerExportIcs,
      editField: plannerEditField,
    },
  };
}
