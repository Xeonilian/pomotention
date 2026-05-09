type TaskCommandApi = {
  openEditor: () => boolean;
  toggleStar: () => boolean;
  openTagManager: () => boolean;
  openEnergyDialog: () => boolean;
  openRewardDialog: () => boolean;
  openInterruptionDialog: () => boolean;
  openTemplateDialog: () => boolean;
  goPrevTask: () => boolean;
  goNextTask: () => boolean;
};

let taskCommandApi: TaskCommandApi | null = null;

export function registerTaskKeyboardCommandApi(api: TaskCommandApi) {
  taskCommandApi = api;
  return () => {
    if (taskCommandApi === api) taskCommandApi = null;
  };
}

export function runTaskKeyboardCommand(command: keyof TaskCommandApi): boolean {
  const api = taskCommandApi;
  if (!api) return false;
  const fn = api[command];
  if (typeof fn !== "function") return false;
  return fn();
}
