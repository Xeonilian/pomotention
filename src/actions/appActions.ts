export type AppActionSource = "keyboard" | "click" | "cli" | "mcp";

export type AppActionId =
  | "view.toggle.activity"
  | "activity.rowPicker.enter"
  | "view.toggle.task"
  | "view.toggle.planner"
  | "view.toggle.schedule"
  | "view.toggle.pomodoro"
  | "route.go.home"
  | "route.go.help"
  | "route.go.search"
  | "route.go.chart"
  | "route.go.settings"
  | "timer.startWork";

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
  enterActivityRowPicker: () => boolean;
}

export function createAppActionRegistry(context: AppActionContext): AppActionRegistry {
  return {
    "view.toggle.activity": {
      run: () => context.togglePanel("activity"),
    },
    "view.toggle.task": {
      run: () => context.togglePanel("task"),
    },
    "activity.rowPicker.enter": {
      run: () => {
        context.enterActivityRowPicker();
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
  };
}

export function dispatchAppAction(registry: AppActionRegistry, actionId: AppActionId, payload: AppActionPayload): boolean {
  const action = registry[actionId];
  if (!action) return false;
  if (action.canRun && !action.canRun(payload)) return false;
  action.run(payload);
  return true;
}
