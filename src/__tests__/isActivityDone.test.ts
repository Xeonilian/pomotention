import { describe, expect, it } from "vitest";
import { isActivityDone } from "@/services/activity/isActivityDone";
import type { Activity } from "@/core/types/Activity";
import type { Schedule } from "@/core/types/Schedule";
import type { Todo } from "@/core/types/Todo";

function act(partial: Partial<Activity> & Pick<Activity, "id">): Activity {
  return {
    title: "t",
    class: "S",
    parentId: null,
    ...partial,
  } as Activity;
}

describe("isActivityDone", () => {
  it("有 schedule 时只认 schedule.status，忽略 activity.status", () => {
    const activity = act({ id: 1, status: "" });
    const schedule = { id: 10, activityId: 1, status: "done", deleted: false } as Schedule;
    expect(
      isActivityDone(activity, {
        getScheduleByActivityId: (id) => (id === 1 ? schedule : undefined),
      }),
    ).toBe(true);
  });

  it("schedule 未完成时即使 activity 写了 done 也不算完成", () => {
    const activity = act({ id: 1, status: "done" });
    const schedule = { id: 10, activityId: 1, status: "", deleted: false } as Schedule;
    expect(
      isActivityDone(activity, {
        getScheduleByActivityId: (id) => (id === 1 ? schedule : undefined),
      }),
    ).toBe(false);
  });

  it("有 todo 时只认 todo.status", () => {
    const activity = act({ id: 2, class: "T", status: "ongoing" });
    const todo = { id: 20, activityId: 2, status: "done", deleted: false } as Todo;
    expect(
      isActivityDone(activity, {
        getTodoByActivityId: (id) => (id === 2 ? todo : undefined),
      }),
    ).toBe(true);
  });

  it("无下游实例时回退 activity.status（生活记录/stub）", () => {
    expect(isActivityDone(act({ id: 3, status: "done" }))).toBe(true);
    expect(isActivityDone(act({ id: 3, status: "" }))).toBe(false);
  });

  it("已删的下游不算，回退 activity", () => {
    const activity = act({ id: 4, status: "done" });
    const schedule = { id: 40, activityId: 4, status: "", deleted: true } as Schedule;
    expect(
      isActivityDone(activity, {
        getScheduleByActivityId: (id) => (id === 4 ? schedule : undefined),
      }),
    ).toBe(true);
  });
});
