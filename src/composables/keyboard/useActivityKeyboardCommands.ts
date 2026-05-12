type ActivityCommandApi = {
  pickActivity: () => boolean;
  deleteOrRecoverActivity: () => boolean;
  toggleChild: () => boolean;
  addTodo: () => boolean;
  addSchedule: () => boolean;
  addUntaetigkeit: () => boolean;
  toggleQuadrant: () => boolean;
  addKanbanSection: () => boolean;
  removeKanbanSection: () => boolean;
  editField: (field: "title" | "dueDate" | "place" | "duration" | "scheduleTime" | "pomoEstimate") => boolean;
};

let activityCommandApi: ActivityCommandApi | null = null;

export function registerActivityKeyboardCommandApi(api: ActivityCommandApi) {
  activityCommandApi = api;
  return () => {
    if (activityCommandApi === api) activityCommandApi = null;
  };
}

export function runActivityKeyboardCommand(command: keyof ActivityCommandApi): boolean {
  if (command === "editField") return false;
  const api = activityCommandApi;
  if (!api) return false;
  const fn = api[command] as (() => boolean) | undefined;
  if (typeof fn !== "function") return false;
  return fn();
}

export function runActivityEditFieldCommand(field: "title" | "dueDate" | "place" | "duration" | "scheduleTime" | "pomoEstimate"): boolean {
  return activityCommandApi?.editField(field) ?? false;
}
