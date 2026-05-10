type PlannerRowPickerApi = {
  enter: () => boolean;
  move: (delta: 1 | -1) => boolean;
  pickByDigit: (digit: number) => boolean;
  exit: () => void;
  isActive: () => boolean;
};

let plannerRowPickerApi: PlannerRowPickerApi | null = null;

export function registerPlannerRowPickerApi(api: PlannerRowPickerApi) {
  plannerRowPickerApi = api;
  return () => {
    if (plannerRowPickerApi === api) plannerRowPickerApi = null;
  };
}

export function enterPlannerRowPicker(): boolean {
  return plannerRowPickerApi?.enter() ?? false;
}

export function movePlannerRowPicker(delta: 1 | -1): boolean {
  return plannerRowPickerApi?.move(delta) ?? false;
}

export function pickPlannerRowByDigit(digit: number): boolean {
  return plannerRowPickerApi?.pickByDigit(digit) ?? false;
}

export function exitPlannerRowPicker() {
  plannerRowPickerApi?.exit();
}

export function isPlannerRowPickerActive(): boolean {
  return plannerRowPickerApi?.isActive() ?? false;
}
