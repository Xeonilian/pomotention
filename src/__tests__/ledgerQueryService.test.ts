import { describe, it, expect } from "vitest";
import type { LedgerEntry } from "@/core/types/LedgerEntry";
import type { LedgerTodoRef } from "@/services/ledger/ledgerQueryService";
import {
  aggregateLedger,
  buildLedgerPie,
  buildLedgerTrend,
  buildLedgerTableRows,
  filterLedgerEntries,
} from "@/services/ledger/ledgerQueryService";
import { getDayStartTimestamp } from "@/core/utils";

function entry(
  partial: Partial<LedgerEntry> & Pick<LedgerEntry, "id" | "sourceActivityId" | "sourceTodoId">,
): LedgerEntry {
  return {
    amount: 10,
    direction: "expense",
    currency: "CNY",
    rawSegment: "-10",
    segmentIndex: 0,
    lastModified: partial.id,
    synced: false,
    deleted: false,
    ...partial,
  };
}

const dayStart = getDayStartTimestamp(new Date(2026, 5, 15).getTime());
const tagName = (id: number) => ({ 1: "生存", 2: "看病", 3: "学习" })[id];

function todoMap(...items: LedgerTodoRef[]): (id: number) => LedgerTodoRef | undefined {
  const map = new Map(items.map((t) => [t.id, t]));
  return (id) => map.get(id);
}

describe("filterLedgerEntries", () => {
  it("按 todo.id 范围与 activity tag 筛选", () => {
    const todoTs = dayStart + 3600_000;
    const entries = [
      entry({ id: Date.now(), sourceTodoId: todoTs, sourceActivityId: 10, categoryTagIds: [1] }),
      entry({ id: Date.now() + 1, sourceTodoId: dayStart + 7200_000, sourceActivityId: 20, categoryTagIds: [2] }),
    ];
    const filtered = filterLedgerEntries({
      entries,
      rangeStart: dayStart,
      rangeEnd: dayStart + 86_400_000,
      viewScale: "day",
      filterTagIds: [99],
      filterStarredOnly: false,
      getTodoById: todoMap({ id: todoTs }, { id: dayStart + 7200_000 }),
      getActivityTagIds: (id) => (id === 10 ? [99] : [88]),
      hasStarredTaskForActivity: () => false,
      getTagName: tagName,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].sourceActivityId).toBe(10);
  });

  it("录入时刻与 todo 日不一致时按 todo.id 归日", () => {
    const todoTs = dayStart + 10_000;
    const entries = [
      entry({ id: dayStart + 86_400_000 + 999, sourceTodoId: todoTs, sourceActivityId: 1 }),
    ];
    const inDay = filterLedgerEntries({
      entries,
      rangeStart: dayStart,
      rangeEnd: dayStart + 86_400_000,
      viewScale: "day",
      filterTagIds: [],
      filterStarredOnly: false,
      getTodoById: todoMap({ id: todoTs }),
      getActivityTagIds: () => [],
      hasStarredTaskForActivity: () => false,
      getTagName: tagName,
    });
    const nextDay = filterLedgerEntries({
      entries,
      rangeStart: dayStart + 86_400_000,
      rangeEnd: dayStart + 2 * 86_400_000,
      viewScale: "day",
      filterTagIds: [],
      filterStarredOnly: false,
      getTodoById: todoMap({ id: todoTs }),
      getActivityTagIds: () => [],
      hasStarredTaskForActivity: () => false,
      getTagName: tagName,
    });
    expect(inDay).toHaveLength(1);
    expect(nextDay).toHaveLength(0);
  });
});

describe("buildLedgerPie", () => {
  it("无筛选时用第一个分类 tag", () => {
    const entries = [
      entry({ id: 1, sourceTodoId: 100, sourceActivityId: 1, amount: 90, categoryTagIds: [1] }),
      entry({ id: 2, sourceTodoId: 101, sourceActivityId: 1, amount: 10, categoryTagIds: [2] }),
    ];
    const { show, slices } = buildLedgerPie(entries, [], tagName);
    expect(show).toBe(true);
    expect(slices.find((s) => s.name === "生存")?.value).toBe(90);
    expect(slices.find((s) => s.name === "看病")?.value).toBe(10);
  });

  it("已筛选且无第二分类时不显示饼图", () => {
    const entries = [entry({ id: 1, sourceTodoId: 100, sourceActivityId: 1, categoryTagIds: [1] })];
    const pie = buildLedgerPie(entries, [99], tagName);
    expect(pie.show).toBe(false);
  });

  it("小于 1% 并入 Others", () => {
    const entries = [
      entry({ id: 1, sourceTodoId: 100, sourceActivityId: 1, amount: 995, categoryTagIds: [1] }),
      entry({ id: 2, sourceTodoId: 101, sourceActivityId: 1, amount: 5, categoryTagIds: [2] }),
    ];
    const { slices } = buildLedgerPie(entries, [], tagName);
    expect(slices.some((s) => s.name === "Others")).toBe(true);
    expect(slices.some((s) => s.name === "看病")).toBe(false);
  });
});

describe("buildLedgerTrend", () => {
  it("周视图按 todo.id 分日分桶", () => {
    const weekStart = getDayStartTimestamp(new Date(2026, 5, 9).getTime());
    const todoTs = weekStart + 3600_000;
    const buckets = buildLedgerTrend(
      [entry({ id: 999_999, sourceTodoId: todoTs, sourceActivityId: 1, amount: 5 })],
      weekStart,
      weekStart + 7 * 86_400_000,
      "week",
      todoMap({ id: todoTs }),
    );
    expect(buckets).toHaveLength(7);
    expect(buckets[0].expense).toBe(5);
  });

  it("日视图前后各 3 天共 7 桶", () => {
    const center = dayStart + 12 * 3_600_000;
    const buckets = buildLedgerTrend([], center, center + 86_400_000, "day", () => undefined);
    expect(buckets).toHaveLength(7);
    expect(buckets[3]?.label).not.toContain("今");
    expect(buckets[3]?.start).toBe(getDayStartTimestamp(center));
  });
});

describe("buildLedgerTableRows", () => {
  it("收入在上、支出在下；组内按时序", () => {
    const rows = buildLedgerTableRows(
      [
        entry({ id: 1, sourceTodoId: 100, sourceActivityId: 1, amount: 5, direction: "income" }),
        entry({ id: 2, sourceTodoId: 101, sourceActivityId: 1, amount: 10, direction: "expense" }),
        entry({ id: 3, sourceTodoId: 102, sourceActivityId: 1, amount: 20, direction: "expense" }),
      ],
      [],
      tagName,
      todoMap({ id: 100 }, { id: 101 }, { id: 102 }),
      "time",
    );
    expect(rows.map((r) => r.direction)).toEqual(["income", "expense", "expense"]);
    expect(rows[0]!.amount).toBe(5);
  });
});

describe("aggregateLedger", () => {
  it("汇总笔数与净值", () => {
    const result = aggregateLedger({
      entries: [
        entry({ id: 10, sourceTodoId: dayStart, sourceActivityId: 1, amount: 30, direction: "expense" }),
        entry({ id: 11, sourceTodoId: dayStart + 1000, sourceActivityId: 1, amount: 100, direction: "income" }),
      ],
      rangeStart: dayStart,
      rangeEnd: dayStart + 86_400_000,
      viewScale: "day",
      filterTagIds: [],
      filterStarredOnly: false,
      getTodoById: todoMap({ id: dayStart }, { id: dayStart + 1000 }),
      getActivityTagIds: () => [],
      hasStarredTaskForActivity: () => false,
      getTagName: tagName,
    });
    expect(result.stats.entryCount).toBe(2);
    expect(result.stats.net).toBe(70);
  });
});
