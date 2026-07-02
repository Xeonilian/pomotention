import { describe, it, expect, beforeEach, vi } from "vitest";
import type { LedgerEntry } from "@/core/types/LedgerEntry";
import {
  syncLedgerFromTodoTitle,
  getActiveLedgerEntriesForActivity,
  softDeleteLedgerEntryWithTitle,
  removeRawSegmentFromTitle,
  removeMemoFromDiaryText,
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
