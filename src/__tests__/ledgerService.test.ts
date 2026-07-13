import { describe, it, expect, beforeEach, vi } from "vitest";
import type { Activity } from "@/core/types/Activity";
import type { LedgerEntry } from "@/core/types/LedgerEntry";
import { buildLedgerStubTitle } from "@/core/ledger/ledgerDayStub";
import {
  syncLedgerFromTodoTitle,
  getActiveLedgerEntriesForActivity,
  softDeleteLedgerEntryWithTitle,
  removeRawSegmentFromTitle,
  removeMemoFromDiaryText,
  createStandaloneLedgerEntry,
  updateLedgerEntry,
  deleteLedgerEntryFromAggregate,
} from "@/services/ledger/ledgerService";

describe("syncLedgerFromTodoTitle v1", () => {
  let ledgerList: LedgerEntry[];

  beforeEach(() => {
    ledgerList = [];
  });

  const tagActions = {
    resolveOrCreateTagByName: (name: string) => {
      const map: Record<string, number> = { grocery: 501, transport: 502 };
      return map[name] ?? 999;
    },
  };

  it("schedule title 写入 sourceScheduleId", () => {
    const result = syncLedgerFromTodoTitle(
      ledgerList,
      {
        activityId: 200,
        scheduleId: 55_002,
        rawTitle: "-15 咖啡￥",
        defaultCurrency: "CNY",
      },
      tagActions,
    );
    expect(result.appendedCount).toBe(1);
    expect(ledgerList[0]).toMatchObject({
      sourceActivityId: 200,
      sourceTodoId: 0,
      sourceScheduleId: 55_002,
      amount: 15,
    });
    expect(result.normalizedTitle).toBe("咖啡（-15）");
  });

  it("解析记账段、回写日记与汇总括号", () => {
    const result = syncLedgerFromTodoTitle(
      ledgerList,
      {
        activityId: 100,
        todoId: 1000,
        rawTitle: "买菜 -30 西瓜 -25#grocery 喝的￥",
        defaultCurrency: "CNY",
      },
      tagActions,
    );

    expect(result.normalizedTitle).toBe("买菜 西瓜 喝的（-55）");
    expect(result.appendedCount).toBe(2);
    const active = getActiveLedgerEntriesForActivity(ledgerList, 100);
    expect(active).toHaveLength(2);
    expect(active[0]).toMatchObject({
      amount: 30,
      direction: "expense",
      memo: "西瓜",
      categoryTagIds: undefined,
      sourceTodoId: 1000,
    });
    expect(active[1].categoryTagIds).toEqual([501]);
  });

  it("再次保存无新记账段时保留条目并重写括号", () => {
    syncLedgerFromTodoTitle(
      ledgerList,
      { activityId: 100, todoId: 1000, rawTitle: "-10 早餐￥", defaultCurrency: "CNY" },
      tagActions,
    );
    const result = syncLedgerFromTodoTitle(
      ledgerList,
      { activityId: 100, todoId: 1000, rawTitle: "普通日记", defaultCurrency: "CNY" },
      tagActions,
    );

    expect(getActiveLedgerEntriesForActivity(ledgerList, 100)).toHaveLength(1);
    expect(result.normalizedTitle).toBe("普通日记（-10）");
  });

  it("无结尾符不入账", () => {
    const result = syncLedgerFromTodoTitle(
      ledgerList,
      { activityId: 100, todoId: 1000, rawTitle: "开会 -30买菜", defaultCurrency: "CNY" },
      tagActions,
    );
    expect(result.appendedCount).toBe(0);
    expect(ledgerList).toHaveLength(0);
    expect(result.normalizedTitle).toBe("开会 -30买菜");
  });

  it("新行 id 为时间戳", () => {
    const before = Date.now();
    syncLedgerFromTodoTitle(
      ledgerList,
      { activityId: 100, todoId: 1000, rawTitle: "-10 早餐￥", defaultCurrency: "CNY" },
      tagActions,
    );
    expect(ledgerList[0].id).toBeGreaterThanOrEqual(before);
    expect(ledgerList[0].id).toBeLessThanOrEqual(Date.now());
  });

  it("同毫秒多笔 id 递增", () => {
    const fixed = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(fixed);
    syncLedgerFromTodoTitle(
      ledgerList,
      { activityId: 100, todoId: 1000, rawTitle: "-30 西瓜 -25 喝的￥", defaultCurrency: "CNY" },
      tagActions,
    );
    const ids = ledgerList.map((e) => e.id).sort((a, b) => a - b);
    expect(ids).toEqual([fixed, fixed + 1]);
    vi.restoreAllMocks();
  });
});

describe("softDeleteLedgerEntryWithTitle", () => {
  it("删条目并重写 title", () => {
    const ledgerList: LedgerEntry[] = [
      {
        id: 1,
        amount: 30,
        direction: "expense",
        currency: "CNY",
        memo: "西瓜",
        rawSegment: "-30 西瓜",
        segmentIndex: 0,
        sourceActivityId: 100,
        sourceTodoId: 1000,
        deleted: false,
        synced: false,
        lastModified: 0,
      },
    ];
    const { title, deleted } = softDeleteLedgerEntryWithTitle(
      ledgerList,
      1,
      "买菜 西瓜（-30）",
    );
    expect(deleted).toBe(true);
    expect(title).toBe("买菜");
    expect(ledgerList[0].deleted).toBe(true);
  });

  it("对不上原文时静默", () => {
    const ledgerList: LedgerEntry[] = [
      {
        id: 1,
        amount: 30,
        direction: "expense",
        currency: "CNY",
        rawSegment: "-30 西瓜",
        segmentIndex: 0,
        sourceActivityId: 100,
        sourceTodoId: 1000,
        deleted: false,
        synced: false,
        lastModified: 0,
      },
    ];
    const { title } = softDeleteLedgerEntryWithTitle(ledgerList, 1, "用户改过的标题");
    expect(title).toBe("用户改过的标题");
  });
});

describe("ledger v3 aggregate CRUD", () => {
  let ledgerList: LedgerEntry[];
  let activityList: Activity[];

  beforeEach(() => {
    ledgerList = [];
    activityList = [];
  });

  it("createStandaloneLedgerEntry 创建日桶 stub 并挂账", () => {
    const dayStart = new Date(2026, 6, 13, 0, 0, 0, 0).getTime();
    const entry = createStandaloneLedgerEntry(ledgerList, activityList, {
      appDateTimestamp: dayStart + 3600_000,
      defaultCurrency: "CNY",
      amount: 20,
      memo: "咖啡",
    });
    expect(entry.sourceActivityId).toBe(dayStart);
    expect(entry.sourceTodoId).toBe(dayStart);
    expect(entry.rawSegment).toBe("ledger-stub");
    expect(ledgerList).toHaveLength(1);
    expect(activityList).toHaveLength(1);
    expect(activityList[0]).toMatchObject({
      id: dayStart,
      title: buildLedgerStubTitle(dayStart),
      class: "T",
      status: "done",
      deleted: false,
    });
  });

  it("同日多笔共用同一 stub activityId", () => {
    const dayStart = new Date(2026, 6, 13, 0, 0, 0, 0).getTime();
    createStandaloneLedgerEntry(ledgerList, activityList, {
      appDateTimestamp: dayStart,
      defaultCurrency: "CNY",
      amount: 10,
    });
    createStandaloneLedgerEntry(ledgerList, activityList, {
      appDateTimestamp: dayStart,
      defaultCurrency: "CNY",
      amount: 20,
    });
    expect(activityList).toHaveLength(1);
    expect(ledgerList.map((e) => e.sourceActivityId)).toEqual([dayStart, dayStart]);
    expect(ledgerList.map((e) => e.segmentIndex)).toEqual([0, 1]);
  });

  it("updateLedgerEntry 重写 title 括号", () => {
    ledgerList.push({
      id: 1,
      amount: 30,
      direction: "expense",
      currency: "CNY",
      memo: "西瓜",
      rawSegment: "-30 西瓜",
      segmentIndex: 0,
      sourceActivityId: 100,
      sourceTodoId: 1000,
      deleted: false,
      synced: false,
      lastModified: 0,
    });
    const result = updateLedgerEntry(ledgerList, 1, { amount: 40 }, "买菜 西瓜（-30）");
    expect(result.updated).toBe(true);
    expect(result.title).toBe("买菜 西瓜（-40）");
    expect(ledgerList[0].amount).toBe(40);
  });

  it("deleteLedgerEntryFromAggregate 独立行删最后一笔时收 stub", () => {
    const dayStart = new Date(2026, 6, 13, 0, 0, 0, 0).getTime();
    createStandaloneLedgerEntry(ledgerList, activityList, {
      appDateTimestamp: dayStart,
      defaultCurrency: "CNY",
      amount: 10,
    });
    const entryId = ledgerList[0]!.id;
    const getActivity = (id: number) => activityList.find((a) => a.id === id);
    const result = deleteLedgerEntryFromAggregate(ledgerList, entryId, undefined, {
      activityList,
      getActivity,
    });
    expect(result.updated).toBe(true);
    expect(result.title).toBeUndefined();
    expect(ledgerList[0].deleted).toBe(true);
    expect(activityList[0].deleted).toBe(true);
  });

  it("deleteLedgerEntryFromAggregate legacy sourceActivityId=0 仍仅软删", () => {
    ledgerList.push({
      id: 9,
      amount: 10,
      direction: "expense",
      currency: "CNY",
      rawSegment: "-10￥",
      segmentIndex: 0,
      sourceActivityId: 0,
      sourceTodoId: 1_700_000_000_000,
      deleted: false,
      synced: false,
      lastModified: 0,
    });
    const result = deleteLedgerEntryFromAggregate(ledgerList, 9);
    expect(result.updated).toBe(true);
    expect(result.title).toBeUndefined();
    expect(ledgerList[0].deleted).toBe(true);
  });
});

describe("removeMemoFromDiaryText", () => {
  it("去掉 memo 词", () => {
    expect(removeMemoFromDiaryText("买菜 西瓜 喝的", "西瓜")).toBe("买菜 喝的");
  });
});

describe("removeRawSegmentFromTitle", () => {
  it("删除片段并收拢空格", () => {
    expect(removeRawSegmentFromTitle("买菜 -30 西瓜 喝的", "-30 西瓜")).toBe("买菜 喝的");
  });
});

describe("softDeleteLedgerEntryWithTitle memo", () => {
  it("保存后 title 按 memo 删字并重写括号", () => {
    const ledgerList: LedgerEntry[] = [
      {
        id: 1,
        amount: 30,
        direction: "expense",
        currency: "CNY",
        memo: "西瓜",
        rawSegment: "-30 西瓜",
        segmentIndex: 0,
        sourceActivityId: 100,
        sourceTodoId: 1000,
        deleted: false,
        synced: false,
        lastModified: 0,
      },
      {
        id: 2,
        amount: 25,
        direction: "expense",
        currency: "CNY",
        memo: "喝的",
        rawSegment: "-25#grocery 喝的",
        segmentIndex: 1,
        sourceActivityId: 100,
        sourceTodoId: 1000,
        deleted: false,
        synced: false,
        lastModified: 0,
      },
    ];
    const { title, deleted } = softDeleteLedgerEntryWithTitle(
      ledgerList,
      1,
      "买菜 西瓜 喝的（-55）",
    );
    expect(deleted).toBe(true);
    expect(title).toBe("买菜 喝的（-25）");
  });
});
