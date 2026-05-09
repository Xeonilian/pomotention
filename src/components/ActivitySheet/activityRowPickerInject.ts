import type { ComputedRef, InjectionKey } from "vue";

export interface ActivityRowPickerInject {
  isActive: ComputedRef<boolean>;
  numberById: ComputedRef<Record<number, number>>;
  currentRowId: ComputedRef<number | null>;
}

export const activityRowPickerInjectKey: InjectionKey<ActivityRowPickerInject> = Symbol("activityRowPickerInject");
