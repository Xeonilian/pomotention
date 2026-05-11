import type { ComputedRef, InjectionKey } from "vue";

export interface ActivityNavigatorInject {
  isActive: ComputedRef<boolean>;
  numberById: ComputedRef<Record<number, number>>;
  currentRowId: ComputedRef<number | null>;
  currentFieldKey: ComputedRef<"title" | "dueDate" | "place" | "duration" | "scheduleTime" | "pomoEstimate" | null>;
}

export const activityNavigatorInjectKey: InjectionKey<ActivityNavigatorInject> = Symbol("activityNavigatorInject");
