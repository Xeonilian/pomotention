type TimetableCommandApi = {
  toggleEditor: () => boolean;
  exitEditor: () => boolean;
  toggleType: () => boolean;
};

let timetableCommandApi: TimetableCommandApi | null = null;

export function registerTimetableKeyboardCommandApi(api: TimetableCommandApi) {
  timetableCommandApi = api;
  return () => {
    if (timetableCommandApi === api) timetableCommandApi = null;
  };
}

export function runTimetableKeyboardCommand(command: keyof TimetableCommandApi): boolean {
  const api = timetableCommandApi;
  if (!api) return false;
  const fn = api[command];
  if (typeof fn !== "function") return false;
  return fn();
}
