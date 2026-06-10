import { describe, expect, it } from "vitest";
import { parsePomoSequenceInput, stepDurationSec } from "@/services/timer/parsePomoSequence";

describe("parsePomoSequenceInput HIIT", () => {
  const defaultWork = () => 25;

  it("expands (45+15)×8+(60+20)*6 into alternating work/break seconds", () => {
    const parsed = parsePomoSequenceInput("HIITs=(45+15)x8+(60+20)*6", defaultWork);
    expect(parsed.isHiit).toBe(true);
    expect(parsed.totalWorkSec).toBe(8 * 45 + 6 * 60);
    expect(parsed.hiitExpression).toBe("(45s +15s) x rep 8+(60s +20s) x rep 6");
    expect(parsed.steps).toHaveLength((8 + 6) * 2);
    expect(parsed.steps[0]).toEqual({ type: "work", durationSec: 45 });
    expect(parsed.steps[1]).toEqual({ type: "break", durationSec: 15 });
    expect(parsed.steps[16]).toEqual({ type: "work", durationSec: 60 });
    expect(parsed.steps[17]).toEqual({ type: "break", durationSec: 20 });
  });

  it("accepts HIIT= prefix and unicode multiply sign", () => {
    const parsed = parsePomoSequenceInput("HIIT=(30+10)×2", defaultWork);
    expect(parsed.isHiit).toBe(true);
    expect(parsed.steps).toHaveLength(4);
    expect(parsed.hiitExpression).toBe("(30s +10s) x rep 2");
    expect(stepDurationSec(parsed.steps[0])).toBe(30);
  });

  it("still parses classic w01+01 sequences", () => {
    const parsed = parsePomoSequenceInput("w01+01", defaultWork);
    expect(parsed.isHiit).toBe(false);
    expect(parsed.steps).toEqual([
      { type: "work", duration: 1 },
      { type: "break", duration: 1 },
    ]);
  });
});
