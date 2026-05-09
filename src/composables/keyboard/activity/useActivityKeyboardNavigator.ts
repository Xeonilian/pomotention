type RowPickerApi = {
  enter: () => boolean;
  move: (delta: 1 | -1) => boolean;
  pickByDigit: (digit: number) => boolean;
  exit: () => void;
  isActive: () => boolean;
};

let rowPickerApi: RowPickerApi | null = null;

export function registerActivityRowPickerApi(api: RowPickerApi) {
  rowPickerApi = api;
  return () => {
    if (rowPickerApi === api) rowPickerApi = null;
  };
}

export function enterActivityRowPicker(): boolean {
  return rowPickerApi?.enter() ?? false;
}

export function moveActivityRowPicker(delta: 1 | -1): boolean {
  return rowPickerApi?.move(delta) ?? false;
}

export function pickActivityRowByDigit(digit: number): boolean {
  return rowPickerApi?.pickByDigit(digit) ?? false;
}

export function exitActivityRowPicker() {
  rowPickerApi?.exit();
}

export function isActivityRowPickerActive(): boolean {
  return rowPickerApi?.isActive() ?? false;
}
