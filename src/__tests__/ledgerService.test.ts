import { describe, it, expect, beforeEach } from "vitest";
import type { Activity } from "@/core/types/Activity";
import type { LedgerEntry } from "@/core/types/LedgerEntry";
import { TAG_ID_LEDGER } from "@/core/constants";
import {
  syncLedgerFromTodoTitle,
  getActiveLedgerEntriesForTodo,
  cascadeLedgerForActivityTree,
  syncLedgerHiddenTag,
} from "@/services/ledger/ledgerService";

function makeActivity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 100,
    title: "",
    class: "T",
    parentId: null,
    lastModified: 0,
    synced: true,
    deleted: false,
    ...overrides,
  };
}

describe("syncLedgerFromTodoTitle", () => {
  let ledgerList: LedgerEntry[];
  let activity: Activity;
  let activityTagIds: number[];

  beforeEach(() => {
    ledgerList = [];
    activityTagIds = [];
    activity = makeActivity();
  });

  const tagActions = {
    resolveOrCreateTagByName: (name: string) => {
      const map: Record<string, number> = { grocery: 501, transport: 502 };
      return map[name] ?? 999;
    },
    getActivityTagIds: () => activityTagIds,
    setActivityTagIds: (_activityId: number, tagIds: number[]) => {
      activityTagIds = tagIds;
      activity.tagIds = tagIds.length > 0 ? tagIds : undefined;
    },
    markActivityDirty: (act: Activity) => {
      act.synced = false;
      act.lastModified = Date.now();
    },
  };

  it("解析成功时写入 ledger 并剥掉片段 #", () => {
    const result = syncLedgerFromTodoTitle(
      ledgerList,
      {
        todoId: 1,
        activityId: 100,
        rawTitle: "开会 ￥-30买菜#grocery",
        recordedAt: 1700000000000,
        defaultCurrency: "CNY",
      },
      activity,
      tagActions,
    );

    expect(result.normalizedTitle).toBe("开会 ￥-30买菜");
    expect(result.entryCount).toBe(1);
    const active = getActiveLedgerEntriesForTodo(ledgerList, 1);
    expect(active).toHaveLength(1);
    expect(active[0]).toMatchObject({
      amount: 30,
      direction: "expense",
      currency: "CNY",
      memo: "买菜",
      categoryTagId: 501,
      sourceTodoId: 1,
      sourceActivityId: 100,
    });
    expect(activityTagIds).toContain(501);
    expect(activity.tagIds).toContain(TAG_ID_LEDGER);
  });

  it("同一 Todo 重保存时替换旧条目", () => {
    syncLedgerFromTodoTitle(
      ledgerList,
      {
        todoId: 1,
        activityId: 100,
        rawTitle: "￥-10早餐",
        recordedAt: 1,
        defaultCurrency: "CNY",
      },
      activity,
      tagActions,
    );
    syncLedgerFromTodoTitle(
      ledgerList,
      {
        todoId: 1,
        activityId: 100,
        rawTitle: "￥-20午餐",
        recordedAt: 2,
        defaultCurrency: "CNY",
      },
      activity,
      tagActions,
    );

    expect(getActiveLedgerEntriesForTodo(ledgerList, 1)).toHaveLength(1);
    expect(getActiveLedgerEntriesForTodo(ledgerList, 1)[0].amount).toBe(20);
    expect(ledgerList.filter((e) => e.deleted)).toHaveLength(1);
  });

  it("无触发符时软删该 Todo 已有条目", () => {
    syncLedgerFromTodoTitle(
      ledgerList,
      {
        todoId: 1,
        activityId: 100,
        rawTitle: "￥-10",
        recordedAt: 1,
        defaultCurrency: "CNY",
      },
      activity,
      tagActions,
    );
    syncLedgerFromTodoTitle(
      ledgerList,
      {
        todoId: 1,
        activityId: 100,
        rawTitle: "普通日记",
        recordedAt: 1,
        defaultCurrency: "CNY",
      },
      activity,
      tagActions,
    );

    expect(getActiveLedgerEntriesForTodo(ledgerList, 1)).toHaveLength(0);
    expect(activityTagIds).not.toContain(TAG_ID_LEDGER);
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

describe("syncLedgerHiddenTag", () => {
  it("无条目时移除 TAG_ID_LEDGER", () => {
    const activity = makeActivity({ tagIds: [TAG_ID_LEDGER, 501] });
    syncLedgerHiddenTag([], activity, (act) => {
      act.synced = false;
    });
    expect(activity.tagIds).toEqual([501]);
  });
});
