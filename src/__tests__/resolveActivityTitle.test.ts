import { describe, expect, it } from "vitest";
import { resolveActivityTitle } from "@/services/activity/resolveActivityTitle";

describe("resolveActivityTitle", () => {
  it("优先 activity.title", () => {
    expect(resolveActivityTitle({ title: "A" }, "B")).toBe("A");
  });

  it("activity 空标题时用副本", () => {
    expect(resolveActivityTitle({ title: "" }, "B")).toBe("B");
    expect(resolveActivityTitle(undefined, "B")).toBe("B");
  });

  it("都没有时返回空串", () => {
    expect(resolveActivityTitle(null, null)).toBe("");
  });
});
