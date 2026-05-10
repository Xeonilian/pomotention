export type AppActionSource = "keyboard" | "click" | "cli" | "mcp";

export type AppActionId =
  | "view.toggle.activity"
  | "activity.navigator.enter"
  | "activity.pick"
  | "activity.deleteOrRecover"
  | "activity.adjustChildRelation"
  | "activity.addTodo"
  | "activity.addSchedule"
  | "activity.addUntaetigkeit"
  | "activity.toggleQuadrant"
  | "activity.addKanbanSection"
  | "activity.removeLastKanbanSection"
  | "activity.editTitle"
  | "activity.editDueDate"
  | "activity.editPlace"
  | "activity.editDuration"
  | "activity.editScheduleTime"
  | "activity.editPomoEstimate"
  | "activity.repeatActivity"
  | "task.openEditor"
  | "task.toggleStar"
  | "task.openTagManager"
  | "task.openEnergyDialog"
  | "task.openRewardDialog"
  | "task.openInterruptionDialog"
  | "task.openTemplateDialog"
  | "task.goPrev"
  | "task.goNext"
  | "planner.gotoPrev"
  | "planner.navigator.enter"
  | "planner.gotoNext"
  | "planner.gotoCurrent"
  | "planner.gotoTodayDay"
  | "planner.gotoDay"
  | "planner.gotoWeek"
  | "planner.gotoMonth"
  | "planner.gotoYear"
  | "planner.addTodo"
  | "planner.addSchedule"
  | "planner.editTitle"
  | "planner.editStart"
  | "planner.editDone"
  | "planner.editDuration"
  | "planner.editLocation"
  | "planner.repeatActivity"
  | "planner.exportIcs"
  | "timetable.toggleEditor"
  | "timetable.exitEditor"
  | "timetable.toggleType"
  | "view.toggle.task"
  | "view.toggle.planner"
  | "view.toggle.schedule"
  | "view.toggle.pomodoro"
  | "route.go.home"
  | "route.go.help"
  | "route.go.search"
  | "route.go.chart"
  | "route.go.settings"
  | "timer.startWork"
  | "timer.startBreak"
  | "timer.stop";

export interface AppActionPayload {
  source: AppActionSource;
  sequence?: string;
}

type TogglePanelKey = "activity" | "task" | "planner" | "schedule" | "pomodoro";

interface AppActionDefinition {
  canRun?: (payload: AppActionPayload) => boolean;
  run: (payload: AppActionPayload) => void;
}

export type AppActionRegistry = Record<AppActionId, AppActionDefinition>;

export interface AppActionContext {
  togglePanel: (panel: TogglePanelKey) => void;
  navigate: (path: "/" | "/search" | "/chart" | "/settings") => void;
  openHelp: () => void;
  canStartTimerWork: () => boolean;
  startTimerWork: () => boolean;
  canStartTimerBreak: () => boolean;
  startTimerBreak: () => boolean;
  canStopTimer: () => boolean;
  stopTimer: () => boolean;
  enterActivityNavigator: () => boolean;
  runActivityCommand: (
    command:
      | "pickActivity"
      | "deleteOrRecoverActivity"
      | "adjustChildRelation"
      | "addTodo"
      | "addSchedule"
      | "addUntaetigkeit"
      | "toggleQuadrant"
      | "addKanbanSection"
      | "removeLastKanbanSection",
  ) => boolean;
  runActivityEditField: (field: "title" | "dueDate" | "place" | "duration" | "scheduleTime" | "pomoEstimate") => boolean;
  runTaskCommand: (
    command:
      | "openEditor"
      | "toggleStar"
      | "openTagManager"
      | "openEnergyDialog"
      | "openRewardDialog"
      | "openInterruptionDialog"
      | "openTemplateDialog"
      | "goPrevTask"
      | "goNextTask",
  ) => boolean;
  runPlannerCommand: (
    command:
      | "gotoPrev"
      | "gotoNext"
      | "gotoCurrent"
      | "gotoTodayDay"
      | "gotoDay"
      | "gotoWeek"
      | "gotoMonth"
      | "gotoYear"
      | "addTodo"
      | "addSchedule"
      | "repeatActivityOnly"
      | "repeatActivity"
      | "exportIcs",
  ) => boolean;
  enterPlannerNavigator: () => boolean;
  runPlannerEditField: (field: "title" | "start" | "done" | "duration" | "location") => boolean;
  runTimetableCommand: (command: "toggleEditor" | "exitEditor" | "toggleType") => boolean;
}

export function createAppActionRegistry(context: AppActionContext): AppActionRegistry {
  return {
    "view.toggle.activity": {
      run: () => context.togglePanel("activity"),
    },
    "view.toggle.task": {
      run: () => context.togglePanel("task"),
    },
    "activity.navigator.enter": {
      run: () => {
        context.enterActivityNavigator();
      },
    },
    "activity.pick": {
      run: () => {
        context.runActivityCommand("pickActivity");
      },
    },
    "activity.deleteOrRecover": {
      run: () => {
        context.runActivityCommand("deleteOrRecoverActivity");
      },
    },
    "activity.adjustChildRelation": {
      run: () => {
        context.runActivityCommand("adjustChildRelation");
      },
    },
    "activity.addTodo": {
      run: () => {
        context.runActivityCommand("addTodo");
      },
    },
    "activity.addSchedule": {
      run: () => {
        context.runActivityCommand("addSchedule");
      },
    },
    "activity.addUntaetigkeit": {
      run: () => {
        context.runActivityCommand("addUntaetigkeit");
      },
    },
    "activity.toggleQuadrant": {
      run: () => {
        context.runActivityCommand("toggleQuadrant");
      },
    },
    "activity.addKanbanSection": {
      run: () => {
        context.runActivityCommand("addKanbanSection");
      },
    },
    "activity.removeLastKanbanSection": {
      run: () => {
        context.runActivityCommand("removeLastKanbanSection");
      },
    },
    "activity.editTitle": {
      run: () => {
        context.runActivityEditField("title");
      },
    },
    "activity.editDueDate": {
      run: () => {
        context.runActivityEditField("dueDate");
      },
    },
    "activity.editPlace": {
      run: () => {
        context.runActivityEditField("place");
      },
    },
    "activity.editDuration": {
      run: () => {
        context.runActivityEditField("duration");
      },
    },
    "activity.editScheduleTime": {
      run: () => {
        context.runActivityEditField("scheduleTime");
      },
    },
    "activity.editPomoEstimate": {
      run: () => {
        context.runActivityEditField("pomoEstimate");
      },
    },
    "activity.repeatActivity": {
      run: () => {
        context.runPlannerCommand("repeatActivityOnly");
      },
    },
    "task.toggleStar": {
      run: () => {
        context.runTaskCommand("toggleStar");
      },
    },
    "task.openEditor": {
      run: () => {
        context.runTaskCommand("openEditor");
      },
    },
    "task.openTagManager": {
      run: () => {
        context.runTaskCommand("openTagManager");
      },
    },
    "task.openEnergyDialog": {
      run: () => {
        context.runTaskCommand("openEnergyDialog");
      },
    },
    "task.openRewardDialog": {
      run: () => {
        context.runTaskCommand("openRewardDialog");
      },
    },
    "task.openInterruptionDialog": {
      run: () => {
        context.runTaskCommand("openInterruptionDialog");
      },
    },
    "task.openTemplateDialog": {
      run: () => {
        context.runTaskCommand("openTemplateDialog");
      },
    },
    "task.goPrev": {
      run: () => {
        context.runTaskCommand("goPrevTask");
      },
    },
    "task.goNext": {
      run: () => {
        context.runTaskCommand("goNextTask");
      },
    },
    "planner.gotoPrev": {
      run: () => {
        context.runPlannerCommand("gotoPrev");
      },
    },
    "planner.navigator.enter": {
      run: () => {
        context.enterPlannerNavigator();
      },
    },
    "planner.gotoNext": {
      run: () => {
        context.runPlannerCommand("gotoNext");
      },
    },
    "planner.gotoCurrent": {
      run: () => {
        context.runPlannerCommand("gotoCurrent");
      },
    },
    "planner.gotoTodayDay": {
      run: () => {
        context.runPlannerCommand("gotoTodayDay");
      },
    },
    "planner.gotoDay": {
      run: () => {
        context.runPlannerCommand("gotoDay");
      },
    },
    "planner.gotoWeek": {
      run: () => {
        context.runPlannerCommand("gotoWeek");
      },
    },
    "planner.gotoMonth": {
      run: () => {
        context.runPlannerCommand("gotoMonth");
      },
    },
    "planner.gotoYear": {
      run: () => {
        context.runPlannerCommand("gotoYear");
      },
    },
    "planner.addTodo": {
      run: () => {
        context.runPlannerCommand("addTodo");
      },
    },
    "planner.addSchedule": {
      run: () => {
        context.runPlannerCommand("addSchedule");
      },
    },
    "planner.editTitle": {
      run: () => {
        context.runPlannerEditField("title");
      },
    },
    "planner.editStart": {
      run: () => {
        context.runPlannerEditField("start");
      },
    },
    "planner.editDone": {
      run: () => {
        context.runPlannerEditField("done");
      },
    },
    "planner.editDuration": {
      run: () => {
        context.runPlannerEditField("duration");
      },
    },
    "planner.editLocation": {
      run: () => {
        context.runPlannerEditField("location");
      },
    },
    "planner.repeatActivity": {
      run: () => {
        context.runPlannerCommand("repeatActivity");
      },
    },
    "planner.exportIcs": {
      run: () => {
        context.runPlannerCommand("exportIcs");
      },
    },
    "timetable.toggleEditor": {
      run: () => {
        context.runTimetableCommand("toggleEditor");
      },
    },
    "timetable.exitEditor": {
      run: () => {
        context.runTimetableCommand("exitEditor");
      },
    },
    "timetable.toggleType": {
      run: () => {
        context.runTimetableCommand("toggleType");
      },
    },
    "view.toggle.planner": {
      run: () => context.togglePanel("planner"),
    },
    "view.toggle.schedule": {
      run: () => context.togglePanel("schedule"),
    },
    "view.toggle.pomodoro": {
      run: () => context.togglePanel("pomodoro"),
    },
    "route.go.home": {
      run: () => context.navigate("/"),
    },
    "route.go.help": {
      run: () => context.openHelp(),
    },
    "route.go.search": {
      run: () => context.navigate("/search"),
    },
    "route.go.chart": {
      run: () => context.navigate("/chart"),
    },
    "route.go.settings": {
      run: () => context.navigate("/settings"),
    },
    "timer.startWork": {
      canRun: () => context.canStartTimerWork(),
      run: () => {
        context.startTimerWork();
      },
    },
    "timer.startBreak": {
      canRun: () => context.canStartTimerBreak(),
      run: () => {
        context.startTimerBreak();
      },
    },
    "timer.stop": {
      canRun: () => context.canStopTimer(),
      run: () => {
        context.stopTimer();
      },
    },
  };
}

export function dispatchAppAction(registry: AppActionRegistry, actionId: AppActionId, payload: AppActionPayload): boolean {
  const action = registry[actionId];
  if (!action) return false;
  if (action.canRun && !action.canRun(payload)) return false;
  action.run(payload);
  return true;
}
