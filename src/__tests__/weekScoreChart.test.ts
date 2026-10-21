import { describe, expect, it } from "vitest";
import type { LifePointMark } from "@/services/timetable/lifeRecordOverlays";
import { collectWeekScoreSeries, placeWeekScoreBars, scoreBarWidth, WEEK_SCORE_BAR_GAP, WEEK_SCORE_BAR_H } from "@/services/timetable/weekScoreChart";

function mark(partial: Partial<LifePointMark> & Pick<LifePointMark, "kind" | "time">): LifePointMark {
  return {
    recordId: partial.recordId ?? partial.time,
    taskId: 1,
    todoId: 1,
    colorVar: "",
    lane: 0,
    title: "",
    note: "",
    ...partial,
  };
}

describe("collectWeekScoreSeries", () => {
  it("无数字不画；饥浅饱和深红，基线在左", () => {
    const series = collectWeekScoreSeries([
      mark({ kind: "eat", time: 10, hunger: 3, satiety: 8 }),
      mark({ kind: "eat", time: 20, hunger: undefined, satiety: 5 }),
      mark({ kind: "energy", time: 15, energy: 7 }),
      mark({ kind: "reward", time: 15, reward: 9 }),
      mark({ kind: "toilet", time: 30, endAt: 40, energy: 4 }),
      mark({ kind: "drink", time: 12 }),
    ],
    [{ recordId: 1, taskId: 1, todoId: 1, title: "睡觉", note: "", start: 1, end: 2, wakeAt: 50, energy: 6 }],
    );
    const byKind = Object.fromEntries(series.map((s) => [s.kind, s]));
    expect(byKind.energy?.shape).toBe("line");
    expect(byKind.reward?.shape).toBe("line");
    expect(byKind.hunger?.points).toEqual([{ time: 10, value: 3 }]);
    expect(byKind.satiety?.fill).toBe("solid");
    expect(byKind.satiety?.points.map((p) => p.value)).toEqual([8, 5]);
    expect(byKind.energy?.points.map((p) => p.value)).toEqual([7, 4, 6]);
    expect(byKind.reward?.points[0]?.value).toBe(9);
    expect(byKind.drink).toBeUndefined();
  });
});

describe("placeWeekScoreBars", () => {
  it("同时刻也强制留间隔", () => {
    const placed = placeWeekScoreBars(
      collectWeekScoreSeries([
        mark({ kind: "eat", time: 100, hunger: 3, satiety: 8 }),
        mark({ kind: "energy", time: 100, energy: 7 }),
        mark({ kind: "reward", time: 100, reward: 9 }),
      ]),
      () => 100,
    );
    expect(placed.map((b) => b.kind)).toEqual(["hunger", "satiety"]);
    for (let i = 1; i < placed.length; i++) {
      expect(placed[i].y).toBeGreaterThanOrEqual(placed[i - 1].y + WEEK_SCORE_BAR_H + WEEK_SCORE_BAR_GAP);
    }
  });
});

describe("scoreBarWidth", () => {
  it("10 分满宽，1 分十分之一", () => {
    expect(scoreBarWidth(10, 100)).toBe(100);
    expect(scoreBarWidth(1, 100)).toBe(10);
  });
});
