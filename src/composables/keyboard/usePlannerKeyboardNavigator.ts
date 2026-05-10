type PlannerNavigatorApi = {
  enter: () => boolean;
  move: (delta: 1 | -1) => boolean;
  pickByDigit: (digit: number) => boolean;
  exit: () => void;
  isActive: () => boolean;
};

let plannerNavigatorApi: PlannerNavigatorApi | null = null;

export function registerPlannerNavigatorApi(api: PlannerNavigatorApi) {
  plannerNavigatorApi = api;
  return () => {
    if (plannerNavigatorApi === api) plannerNavigatorApi = null;
  };
}

export function enterPlannerNavigator(): boolean {
  return plannerNavigatorApi?.enter() ?? false;
}

export function movePlannerNavigator(delta: 1 | -1): boolean {
  return plannerNavigatorApi?.move(delta) ?? false;
}

export function pickPlannerRowByDigit(digit: number): boolean {
  return plannerNavigatorApi?.pickByDigit(digit) ?? false;
}

export function exitPlannerNavigator() {
  plannerNavigatorApi?.exit();
}

export function isPlannerNavigatorActive(): boolean {
  return plannerNavigatorApi?.isActive() ?? false;
}
