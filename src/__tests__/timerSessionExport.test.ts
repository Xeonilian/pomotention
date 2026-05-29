import { describe, expect, it } from "vitest";
import { DEFAULT_TIMER_SESSION_RULES } from "@/core/types/TimerSession";
import type { TimerSessionRecord } from "@/core/types/TimerSession";
import { buildTimerSessionsCsv } from "@/services/timer/timerSessionExport";

const sample: TimerSessionRecord = {
  id: "ts-1",
  category: "work",
  emoji: "🍅",
  startedAt: Date.parse("2026-05-27T09:00:00.000Z"),
  endedAt: Date.parse("2026-05-27T09:25:00.000Z"),
  durationMs: 25 * 60_000,
  plannedDurationMin: 25,
  stateMessage: "Focus task",
  endReason: "completed",
};

describe("buildTimerSessionsCsv", () => {
  it("includes header and session fields", () => {
    const csv = buildTimerSessionsCsv([sample], DEFAULT_TIMER_SESSION_RULES);
    const lines = csv.trim().split("\n");
    expect(lines[0]).toBe(
      "category,started_at,ended_at,duration_sec,planned_duration_min,state_message,tag_names,end_reason",
    );
    expect(lines[1]).toContain("work");
    expect(lines[1]).toContain("Focus task");
    expect(lines[1]).toContain("completed");
    expect(lines[1]).not.toContain("自然结束");
  });

  it("includes tag_names from resolver", () => {
    const withTags = { ...sample, tagIds: [1, 2] };
    const csv = buildTimerSessionsCsv([withTags], DEFAULT_TIMER_SESSION_RULES, (ids) =>
      ids.length ? "focus,deep" : "",
    );
    expect(csv).toContain("focus,deep");
  });

  it("sorts by started_at ascending", () => {
    const later = {
      ...sample,
      id: "ts-2",
      startedAt: sample.startedAt + 60_000,
      endedAt: sample.endedAt + 60_000,
      stateMessage: "Later task",
    };
    const csv = buildTimerSessionsCsv([later, sample], DEFAULT_TIMER_SESSION_RULES);
    const dataLines = csv.trim().split("\n").slice(1);
    expect(dataLines[0]).toContain("Focus task");
    expect(dataLines[1]).toContain("Later task");
  });
});
