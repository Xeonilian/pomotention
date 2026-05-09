type PlannerCommandApi = {
  gotoPrev: () => boolean;
  gotoNext: () => boolean;
  gotoCurrent: () => boolean;
  gotoTodayDay: () => boolean;
  gotoDay: () => boolean;
  gotoWeek: () => boolean;
  gotoMonth: () => boolean;
  gotoYear: () => boolean;
  addTodo: () => boolean;
  addSchedule: () => boolean;
  repeatActivityOnly: () => boolean;
  repeatActivity: () => boolean;
  exportIcs: () => boolean;
};

let plannerCommandApi: PlannerCommandApi | null = null;

export function registerPlannerKeyboardCommandApi(api: PlannerCommandApi) {
  plannerCommandApi = api;
  return () => {
    if (plannerCommandApi === api) plannerCommandApi = null;
  };
}

export function runPlannerKeyboardCommand(command: keyof PlannerCommandApi): boolean {
  const api = plannerCommandApi;
  if (!api) return false;
  const fn = api[command];
  if (typeof fn !== "function") return false;
  return fn();
}
