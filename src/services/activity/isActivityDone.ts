import type { Activity } from "@/core/types/Activity";
import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";

type PlannerLookup = {
  getTodoByActivityId?: (activityId: number) => Todo | undefined;
  getScheduleByActivityId?: (activityId: number) => Schedule | undefined;
};

/**
 * 活动是否已完成：有 todo/schedule 时以它们为准；无下游实例（生活记录/stub 等）才认 activity.status。
 * activity.status="done" 仅作本地复写，不是完成真相。
 */
export function isActivityDone(activity: Activity, lookup: PlannerLookup = {}): boolean {
  const todo = lookup.getTodoByActivityId?.(activity.id);
  if (todo && !todo.deleted) {
    return todo.status === "done";
  }

  const schedule = lookup.getScheduleByActivityId?.(activity.id);
  if (schedule && !schedule.deleted) {
    return schedule.status === "done";
  }

  return activity.status === "done";
}
