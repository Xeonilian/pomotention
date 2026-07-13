import { describe, it, expect } from "vitest";
import type { Activity } from "@/core/types/Activity";
import {
  buildLedgerStubTitle,
  ensureLedgerDayStub,
  isLedgerDayStubActivity,
  maybeRemoveLedgerDayStub,
} from "@/core/ledger/ledgerDayStub";
import type { LedgerEntry } from "@/core/types/LedgerEntry";

describe("ledgerDayStub", () => {
  it("isLedgerDayStubActivity 校验 title 与 id", () => {
    const dayStart = new Date(2026, 6, 13, 0, 0, 0, 0).getTime();
    expect(isLedgerDayStubActivity({ id: dayStart, title: buildLedgerStubTitle(dayStart) })).toBe(true);
    expect(isLedgerDayStubActivity({ id: dayStart, title: "买菜" })).toBe(false);
    expect(isLedgerDayStubActivity({ id: dayStart, title: `ledger-stub:${dayStart + 1}` })).toBe(false);
  });

  it("ensureLedgerDayStub 复用已删 stub", () => {
    const dayStart = new Date(2026, 6, 13, 0, 0, 0, 0).getTime();
    const activityList: Activity[] = [
      {
        id: dayStart,
        title: buildLedgerStubTitle(dayStart),
        class: "T",
        status: "done",
        parentId: null,
        deleted: true,
        synced: true,
        lastModified: 0,
      },
    ];
    const id = ensureLedgerDayStub(activityList, dayStart);
    expect(id).toBe(dayStart);
    expect(activityList[0].deleted).toBe(false);
    expect(activityList).toHaveLength(1);
  });

  it("maybeRemoveLedgerDayStub 在无 active ledger 时软删", () => {
    const dayStart = new Date(2026, 6, 13, 0, 0, 0, 0).getTime();
    const activityList: Activity[] = [
      {
        id: dayStart,
        title: buildLedgerStubTitle(dayStart),
        class: "T",
        status: "done",
        parentId: null,
        deleted: false,
        synced: false,
        lastModified: 0,
      },
    ];
    const ledgerList: LedgerEntry[] = [
      {
        id: 1,
        amount: 10,
        direction: "expense",
        currency: "CNY",
        rawSegment: "ledger-stub",
        segmentIndex: 0,
        sourceActivityId: dayStart,
        sourceTodoId: dayStart,
        deleted: true,
        synced: false,
        lastModified: 0,
      },
    ];
    expect(maybeRemoveLedgerDayStub(activityList, ledgerList, dayStart)).toBe(true);
    expect(activityList[0].deleted).toBe(true);
  });
});
