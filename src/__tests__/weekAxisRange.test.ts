import { describe, it, expect } from "vitest";
import { resolveWeekAxisEndHour, resolveWeekAxisStartHour } from "@/core/utils/weekAxisRange";

const day = (h: number, m = 0) => new Date(2026, 8, 2, h, m, 0, 0).getTime();

describe("resolveWeekAxisStartHour", () => {
  it("无醒来：默认不少于 6，更早活动可上抬", () => {
    expect(resolveWeekAxisStartHour(24, null)).toBe(6);
    expect(resolveWeekAxisStartHour(8, null)).toBe(6);
    expect(resolveWeekAxisStartHour(3, null)).toBe(3);
  });

  it("上午醒来：醒点−1 作上沿（可低于或略高于默认 6）", () => {
    expect(resolveWeekAxisStartHour(24, day(5, 30))).toBe(5);
    expect(resolveWeekAxisStartHour(24, day(8, 0))).toBe(7);
    expect(resolveWeekAxisStartHour(24, day(5, 0))).toBe(4);
    expect(resolveWeekAxisStartHour(3, day(8, 0))).toBe(3);
  });

  it("午睡/下午醒来不得把轴顶压掉默认最少范围", () => {
    expect(resolveWeekAxisStartHour(24, day(17, 0))).toBe(6);
    expect(resolveWeekAxisStartHour(16, day(17, 0))).toBe(6);
    expect(resolveWeekAxisStartHour(24, day(12, 0))).toBe(6);
  });
});

describe("resolveWeekAxisEndHour", () => {
  it("默认至少 22，更晚可撑开", () => {
    expect(resolveWeekAxisEndHour(0)).toBe(22);
    expect(resolveWeekAxisEndHour(17)).toBe(22);
    expect(resolveWeekAxisEndHour(23)).toBe(23);
  });
});
