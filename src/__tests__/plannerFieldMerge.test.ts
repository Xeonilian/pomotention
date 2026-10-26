import { describe, expect, it } from "vitest";
import { CLEARED_STATUS, CLEARED_TIME, mergePlannerFields } from "@/services/sync/plannerFieldMerge";

describe("mergePlannerFields", () => {
  it("用新的时间覆盖旧时间", () => {
    const merged = mergePlannerFields(
      { status: "done", startTime: 1_700_000_000_000, doneTime: 1_700_000_100_000 },
      { status: "done", startTime: 1_700_000_200_000, doneTime: 1_700_000_300_000 },
      "cloud-wins",
    );
    expect(merged.startTime).toBe(1_700_000_200_000);
    expect(merged.doneTime).toBe(1_700_000_300_000);
    expect(merged.reupload).toBe(false);
  });

  it("云端是空的时留下本地勾选和时间，并要求回传", () => {
    const merged = mergePlannerFields(
      { status: "done", startTime: 1_700_000_000_000, doneTime: 1_700_000_100_000 },
      { status: "", startTime: null, doneTime: null },
      "cloud-wins",
    );
    expect(merged.status).toBe("done");
    expect(merged.startTime).toBe(1_700_000_000_000);
    expect(merged.doneTime).toBe(1_700_000_100_000);
    expect(merged.reupload).toBe(true);
  });

  it("主动清空的标记会把本地时间清掉", () => {
    const merged = mergePlannerFields(
      { status: "done", doneTime: 1_700_000_100_000 },
      { status: CLEARED_STATUS, doneTime: CLEARED_TIME },
      "cloud-wins",
    );
    expect(merged.status).toBe("");
    expect(merged.doneTime).toBeUndefined();
    expect(merged.reupload).toBe(false);
  });

  it("明确状态仍覆盖勾选", () => {
    const merged = mergePlannerFields({ status: "done", doneTime: 1_700_000_100_000 }, { status: "cancelled", doneTime: 1_700_000_100_000 }, "cloud-wins");
    expect(merged.status).toBe("cancelled");
    expect(merged.reupload).toBe(false);
  });

  it("云端不更新时，只把云端有的值补进本地空格", () => {
    const merged = mergePlannerFields(
      { status: "", startTime: undefined, doneTime: undefined },
      { status: "done", startTime: 1_700_000_000_000, doneTime: 1_700_000_100_000 },
      "fill-only",
    );
    expect(merged.status).toBe("done");
    expect(merged.startTime).toBe(1_700_000_000_000);
    expect(merged.changed).toBe(true);
    expect(merged.reupload).toBe(false);
  });

  it("云端不更新时，不用另一套时间盖掉本地已有时间", () => {
    const merged = mergePlannerFields(
      { status: "done", startTime: 1_700_000_000_000 },
      { status: "done", startTime: 1_700_000_500_000 },
      "fill-only",
    );
    expect(merged.startTime).toBe(1_700_000_000_000);
    expect(merged.changed).toBe(false);
  });
});
