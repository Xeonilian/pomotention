type PlannerNavigatorApi = {
  enter: () => boolean;
  move: (delta: 1 | -1) => boolean;
  pickByDigit: (digit: number) => boolean;
  moveField: (delta: 1 | -1) => boolean;
  activateField: () => boolean;
  confirmField: () => boolean;
  navigateSubSelection: (delta: number) => boolean;
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

export function movePlannerNavigatorField(delta: 1 | -1): boolean {
  return plannerNavigatorApi?.moveField(delta) ?? false;
}

export function activatePlannerNavigatorField(): boolean {
  return plannerNavigatorApi?.activateField() ?? false;
}

export function confirmPlannerNavigatorField(): boolean {
  return plannerNavigatorApi?.confirmField() ?? false;
}

export function navigatePlannerNavigatorSubSelection(delta: number): boolean {
  return plannerNavigatorApi?.navigateSubSelection(delta) ?? false;
}

export function exitPlannerNavigator() {
  plannerNavigatorApi?.exit();
}

export function isPlannerNavigatorActive(): boolean {
  return plannerNavigatorApi?.isActive() ?? false;
}

/** 非 pn 模式：day 视图已选行时由 Space 触发勾选（由 HomeView 注册实现） */
type PlannerDaySpaceToggleCheckFn = () => boolean;
let plannerDaySpaceToggleCheck: PlannerDaySpaceToggleCheckFn | null = null;

export function registerPlannerDaySpaceToggleCheck(fn: PlannerDaySpaceToggleCheckFn) {
  plannerDaySpaceToggleCheck = fn;
  return () => {
    if (plannerDaySpaceToggleCheck === fn) plannerDaySpaceToggleCheck = null;
  };
}

export function tryPlannerDaySpaceToggleCheck(): boolean {
  return plannerDaySpaceToggleCheck?.() ?? false;
}
