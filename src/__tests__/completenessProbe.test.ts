import { describe, it, expect } from "vitest";
import { findActiveCountLeaks, shouldPullFirstByCursor } from "@/services/sync/completenessProbe";

describe("findActiveCountLeaks", () => {
  it("云端未删除数更多时判为漏下", () => {
    const leaks = findActiveCountLeaks([
      { name: "Tasks", cloud: 100, local: 18 },
      { name: "Todos", cloud: 10, local: 10 },
    ]);
    expect(leaks).toEqual([{ name: "Tasks", cloud: 100, local: 18 }]);
  });

  it("本地比云端多不当成漏下载", () => {
    const leaks = findActiveCountLeaks([{ name: "Tasks", cloud: 5, local: 8 }]);
    expect(leaks).toEqual([]);
  });

  it("条数相等则无漏", () => {
    const leaks = findActiveCountLeaks([{ name: "Activities", cloud: 3, local: 3 }]);
    expect(leaks).toEqual([]);
  });
});

describe("shouldPullFirstByCursor", () => {
  it("云端新于本地游标 → 先下", () => {
    expect(shouldPullFirstByCursor(1_000, 2_000)).toBe(true);
  });

  it("云端不新于本地游标 → 仍先上", () => {
    expect(shouldPullFirstByCursor(2_000, 2_000)).toBe(false);
    expect(shouldPullFirstByCursor(3_000, 2_000)).toBe(false);
  });

  it("本地游标为 0 且云端有数据 → 先下", () => {
    expect(shouldPullFirstByCursor(0, 1_000)).toBe(true);
  });

  it("本地游标为 0 且云端空 → 先上播种", () => {
    expect(shouldPullFirstByCursor(0, 0)).toBe(false);
  });
});
