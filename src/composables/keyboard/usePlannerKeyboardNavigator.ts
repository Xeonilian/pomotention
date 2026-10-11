import { ref } from "vue";

type PlannerNavigatorApi = {
  enter: () => boolean;
  move: (delta: 1 | -1) => boolean;
  hasRows: () => boolean;
  pickByDigit: (digit: number) => boolean;
  moveField: (delta: 1 | -1) => boolean;
  activateField: () => boolean;
  confirmField: () => boolean;
  navigateSubSelection: (delta: number) => boolean;
  exit: () => void;
  isActive: () => boolean;
};

let plannerNavigatorApi: PlannerNavigatorApi | null = null;

/** 注册/注销后递增，让按钮在导航 API 挂上之后重新判断有没有行 */
const plannerNavigatorEpoch = ref(0);

export function registerPlannerNavigatorApi(api: PlannerNavigatorApi) {
  plannerNavigatorApi = api;
  plannerNavigatorEpoch.value += 1;
  return () => {
    if (plannerNavigatorApi === api) {
      plannerNavigatorApi = null;
      plannerNavigatorEpoch.value += 1;
    }
  };
}

export function enterPlannerNavigator(): boolean {
  return plannerNavigatorApi?.enter() ?? false;
}

export function movePlannerNavigator(delta: 1 | -1): boolean {
  return plannerNavigatorApi?.move(delta) ?? false;
}

/** 当前计划视图里是否有可循环选中的行 */
export function hasPlannerNavigatorRows(): boolean {
  void plannerNavigatorEpoch.value;
  return plannerNavigatorApi?.hasRows() ?? false;
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

/** 非 pe 模式：day 视图已选行时由 Space 触发勾选（由 HomeView 注册实现） */
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

/** 非 pe 模式：day 视图已选行时 Enter 进入 title 编辑（由 HomeView 注册实现） */
type PlannerDayEnterEditTitleFn = () => boolean;
let plannerDayEnterEditTitle: PlannerDayEnterEditTitleFn | null = null;

export function registerPlannerDayEnterEditTitle(fn: PlannerDayEnterEditTitleFn) {
  plannerDayEnterEditTitle = fn;
  return () => {
    if (plannerDayEnterEditTitle === fn) plannerDayEnterEditTitle = null;
  };
}

export function tryPlannerDayEnterEditTitle(): boolean {
  return plannerDayEnterEditTitle?.() ?? false;
}
