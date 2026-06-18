import { describe, it, expect, beforeEach } from "vitest";
import type { LedgerEntry } from "@/core/types/LedgerEntry";
import {
  syncLedgerFromTodoTitle,
  getActiveLedgerEntriesForTodo,
  cascadeLedgerForActivityTree,
} from "@/services/ledger/ledgerService";

describe("syncLedgerFromTodoTitle MVP", () => {
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

  it("解析 ￥…￥ 块并追加 ledger，title 留日记", () => {
    const result = syncLedgerFromTodoTitle(
      ledgerList,
      {
        todoId: 1,
        activityId: 100,
        rawTitle: "开会 ￥-30买菜#grocery￥",
        recordedAt: 1700000000000,
        defaultCurrency: "CNY",
      },
      tagActions,
    );

    expect(result.normalizedTitle).toBe("开会");
    expect(result.appendedCount).toBe(1);
    const active = getActiveLedgerEntriesForTodo(ledgerList, 1);
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      amount: 30,
      direction: "expense",
      memo: "买菜",
      categoryTagId: 501,
    });
  });

  it("再次保存无新块时不删已有条目", () => {
    syncLedgerFromTodoTitle(
      ledgerList,
      {
        todoId: 1,
        activityId: 100,
        rawTitle: "￥-10早餐￥",
        recordedAt: 1,
        defaultCurrency: "CNY",
      },
      tagActions,
    );
    syncLedgerFromTodoTitle(
      ledgerList,
      {
        todoId: 1,
        activityId: 100,
        rawTitle: "普通日记",
        recordedAt: 2,
        defaultCurrency: "CNY",
      },
      tagActions,
    );

    expect(getActiveLedgerEntriesForTodo(ledgerList, 1)).toHaveLength(1);
    expect(ledgerList.filter((e) => e.deleted)).toHaveLength(0);
  });

  it("追加第二块增量写入", () => {
    syncLedgerFromTodoTitle(
      ledgerList,
      {
        todoId: 1,
        activityId: 100,
        rawTitle: "￥-10早餐￥",
        recordedAt: 1,
        defaultCurrency: "CNY",
      },
      tagActions,
    );
    syncLedgerFromTodoTitle(
      ledgerList,
      {
        todoId: 1,
        activityId: 100,
        rawTitle: "日记 ￥-20午餐￥",
        recordedAt: 2,
        defaultCurrency: "CNY",
      },
      tagActions,
    );

    const active = getActiveLedgerEntriesForTodo(ledgerList, 1);
    expect(active).toHaveLength(2);
    expect(active.map((e) => e.amount).sort()).toEqual([10, 20]);
  });
});

describe("cascadeLedgerForActivityTree", () => {
  it("按 activity/todo 级联软删与恢复", () => {
    const ledgerList: LedgerEntry[] = [
      {
        id: 1,
        amount: 10,
        direction: "expense",
        currency: "CNY",
        recordedAt: 1,
        rawSegment: "￥-10",
        segmentIndex: 0,
        sourceActivityId: 100,
        sourceTodoId: 10,
        deleted: false,
        synced: true,
        lastModified: 0,
      },
    ];

    cascadeLedgerForActivityTree(ledgerList, new Set([100]), new Set([10]), true);
    expect(ledgerList[0].deleted).toBe(true);

    cascadeLedgerForActivityTree(ledgerList, new Set([100]), new Set([10]), false);
    expect(ledgerList[0].deleted).toBe(false);
  });
});
