type NavigatorApi = {
  enter: () => boolean;
  move: (delta: 1 | -1) => boolean;
  moveVisible: (delta: 1 | -1) => boolean;
  pickByDigit: (digit: number) => boolean;
  moveField: (delta: 1 | -1) => boolean;
  activateField: () => boolean;
  confirmField: () => boolean;
  navigateSubSelection: (delta: number) => boolean;
  exit: () => void;
  isActive: () => boolean;
};

let navigatorApi: NavigatorApi | null = null;

export function registerActivityNavigatorApi(api: NavigatorApi) {
  navigatorApi = api;
  return () => {
    if (navigatorApi === api) navigatorApi = null;
  };
}

export function enterActivityNavigator(): boolean {
  return navigatorApi?.enter() ?? false;
}

export function moveActivityNavigator(delta: 1 | -1): boolean {
  return navigatorApi?.move(delta) ?? false;
}

export function moveActivityVisibleSelection(delta: 1 | -1): boolean {
  return navigatorApi?.moveVisible(delta) ?? false;
}

export function pickActivityRowByDigit(digit: number): boolean {
  return navigatorApi?.pickByDigit(digit) ?? false;
}

export function moveActivityNavigatorField(delta: 1 | -1): boolean {
  return navigatorApi?.moveField(delta) ?? false;
}

export function activateActivityNavigatorField(): boolean {
  return navigatorApi?.activateField() ?? false;
}

export function confirmActivityNavigatorField(): boolean {
  return navigatorApi?.confirmField() ?? false;
}

export function navigateActivityNavigatorSubSelection(delta: number): boolean {
  return navigatorApi?.navigateSubSelection(delta) ?? false;
}

export function exitActivityNavigator() {
  navigatorApi?.exit();
}

export function isActivityNavigatorActive(): boolean {
  return navigatorApi?.isActive() ?? false;
}
