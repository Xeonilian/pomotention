type ActivityCommandApi = {
  pickActivity: () => boolean;
  deleteOrRecoverActivity: () => boolean;
  adjustChildRelation: () => boolean;
  addTodo: () => boolean;
  addSchedule: () => boolean;
  addUntaetigkeit: () => boolean;
  toggleQuadrant: () => boolean;
  addKanbanSection: () => boolean;
  removeLastKanbanSection: () => boolean;
};

let activityCommandApi: ActivityCommandApi | null = null;

export function registerActivityKeyboardCommandApi(api: ActivityCommandApi) {
  activityCommandApi = api;
  return () => {
    if (activityCommandApi === api) activityCommandApi = null;
  };
}

export function runActivityKeyboardCommand(command: keyof ActivityCommandApi): boolean {
  const api = activityCommandApi;
  if (!api) return false;
  const fn = api[command];
  if (typeof fn !== "function") return false;
  return fn();
}
