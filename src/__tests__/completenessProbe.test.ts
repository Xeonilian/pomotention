import { describe, it, expect } from "vitest";
import { findActiveCountLeaks } from "@/services/sync/completenessProbe";

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
