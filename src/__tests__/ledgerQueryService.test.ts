import { describe, it, expect } from "vitest";
import type { LedgerEntry } from "@/core/types/LedgerEntry";
import type { LedgerTodoRef, LedgerScheduleRef } from "@/services/ledger/ledgerQueryService";
import {
  aggregateLedger,
  buildLedgerPie,
  buildLedgerTrend,
  buildLedgerTableRows,
  filterLedgerEntries,
  resolveLedgerPlannerTs,
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
    sourceScheduleId: 0,
    ...partial,
  };
}

const dayStart = getDayStartTimestamp(new Date(2026, 5, 15).getTime());
const tagName = (id: number) => ({ 1: "生存", 2: "看病", 3: "学习" })[id];

function todoLookup(...items: LedgerTodoRef[]) {
  const map = new Map(items.map((t) => [t.id, t]));
  return { getTodoById: (id: number) => map.get(id) };
}

function scheduleLookup(
  byId: LedgerScheduleRef[],
  byActivity?: Map<number, LedgerScheduleRef>,
) {
  const idMap = new Map(byId.map((s) => [s.id, s]));
  return {
    getTodoById: () => undefined,
    getScheduleById: (id: number) => idMap.get(id),
    getScheduleByActivityId: (activityId: number) => byActivity?.get(activityId),
  };
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
      getTodoById: todoLookup({ id: todoTs }, { id: dayStart + 7200_000 }).getTodoById,
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
      getTodoById: todoLookup({ id: todoTs }).getTodoById,
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
      getTodoById: todoLookup({ id: todoTs }).getTodoById,
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
    const { show, slices } = buildLedgerPie(entries, tagName);
    expect(show).toBe(true);
    expect(slices.find((s) => s.name === "生存")?.value).toBe(90);
    expect(slices.find((s) => s.name === "看病")?.value).toBe(10);
  });

  it("有筛选传入的条目仍按第一个分类 tag 分桶", () => {
    const entries = [entry({ id: 1, sourceTodoId: 100, sourceActivityId: 1, amount: 30, categoryTagIds: [1, 2] })];
    const pie = buildLedgerPie(entries, tagName);
    expect(pie.show).toBe(true);
    expect(pie.slices).toHaveLength(1);
    expect(pie.slices[0]?.name).toBe("生存");
    expect(pie.slices[0]?.value).toBe(30);
  });

  it("小于 1% 并入 Others", () => {
    const entries = [
      entry({ id: 1, sourceTodoId: 100, sourceActivityId: 1, amount: 995, categoryTagIds: [1] }),
      entry({ id: 2, sourceTodoId: 101, sourceActivityId: 1, amount: 5, categoryTagIds: [2] }),
    ];
    const { slices } = buildLedgerPie(entries, tagName);
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
      todoLookup({ id: todoTs }),
    );
    expect(buckets).toHaveLength(7);
    expect(buckets[0].expense).toBe(5);
  });

  it("日视图前后各 3 天共 7 桶", () => {
    const center = dayStart + 12 * 3_600_000;
    const buckets = buildLedgerTrend([], center, center + 86_400_000, "day", { getTodoById: () => undefined });
    expect(buckets).toHaveLength(7);
    expect(buckets[3]?.label).not.toContain("今");
    expect(buckets[3]?.start).toBe(getDayStartTimestamp(center));
  });

  it("年视图无数据时固定 12 个月桶", () => {
    const yearStart = getDayStartTimestamp(new Date(2026, 0, 1).getTime());
    const yearEnd = getDayStartTimestamp(new Date(2027, 0, 1).getTime());
    const buckets = buildLedgerTrend([], yearStart, yearEnd, "year", { getTodoById: () => undefined });
    expect(buckets).toHaveLength(12);
    expect(buckets.map((b) => b.label)).toEqual([
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]);
    expect(buckets.every((b) => b.expense === 0 && b.income === 0)).toBe(true);
  });

  it("年视图按 todo.id 归入对应月份", () => {
    const julyTodoTs = getDayStartTimestamp(new Date(2026, 6, 15).getTime()) + 3600_000;
    const yearStart = getDayStartTimestamp(new Date(2026, 0, 1).getTime());
    const yearEnd = getDayStartTimestamp(new Date(2027, 0, 1).getTime());
    const buckets = buildLedgerTrend(
      [entry({ id: 999_999, sourceTodoId: julyTodoTs, sourceActivityId: 1, amount: 42 })],
      yearStart,
      yearEnd,
      "year",
      todoLookup({ id: julyTodoTs }),
    );
    expect(buckets).toHaveLength(12);
    expect(buckets.filter((b) => b.expense > 0)).toHaveLength(1);
    expect(buckets.find((b) => b.label === "Jul")?.expense).toBe(42);
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
      tagName,
      todoLookup({ id: 100 }, { id: 101 }, { id: 102 }),
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
      getTodoById: todoLookup({ id: dayStart }, { id: dayStart + 1000 }).getTodoById,
      getActivityTagIds: () => [],
      hasStarredTaskForActivity: () => false,
      getTagName: tagName,
    });
    expect(result.stats.entryCount).toBe(2);
    expect(result.stats.net).toBe(70);
  });

  it("年视图汇总全年条目并分月趋势", () => {
    const julyTodoTs = getDayStartTimestamp(new Date(2026, 6, 10).getTime()) + 5000;
    const yearStart = getDayStartTimestamp(new Date(2026, 0, 1).getTime());
    const yearEnd = getDayStartTimestamp(new Date(2027, 0, 1).getTime());
    const result = aggregateLedger({
      entries: [entry({ id: 10, sourceTodoId: julyTodoTs, sourceActivityId: 1, amount: 30, direction: "expense" })],
      rangeStart: yearStart,
      rangeEnd: yearEnd,
      viewScale: "year",
      filterTagIds: [],
      filterStarredOnly: false,
      getTodoById: todoLookup({ id: julyTodoTs }).getTodoById,
      getActivityTagIds: () => [],
      hasStarredTaskForActivity: () => false,
      getTagName: tagName,
    });
    expect(result.stats.entryCount).toBe(1);
    expect(result.stats.totalExpense).toBe(30);
    expect(result.trend).toHaveLength(12);
    expect(result.trend.find((b) => b.label === "Jul")?.expense).toBe(30);
  });
});

describe("resolveLedgerPlannerTs", () => {
  it("云下载无 sourceTodoId 时经 activity_id 反查 todo", () => {
    const todoTs = dayStart + 3600_000;
    const ts = resolveLedgerPlannerTs(entry({ id: 1, sourceTodoId: 0, sourceActivityId: 42 }), {
      getTodoById: () => undefined,
      getTodoByActivityId: () => ({ id: todoTs }),
    });
    expect(ts).toBe(todoTs);
  });

  it("schedule 行按 activityDueRange[0] 归日", () => {
    const dueTs = dayStart + 5 * 3_600_000;
    const scheduleId = 88_001;
    const ts = resolveLedgerPlannerTs(
      entry({ id: 1, sourceTodoId: 0, sourceScheduleId: scheduleId, sourceActivityId: 50 }),
      scheduleLookup([{ id: scheduleId, activityDueRange: [dueTs, "60"] }]),
    );
    expect(ts).toBe(dueTs);
  });

  it("ledger-stub 日桶无 todo 时用 activityId 日初", () => {
    const dayStart = new Date(2026, 6, 13, 0, 0, 0, 0).getTime();
    const ts = resolveLedgerPlannerTs(entry({ id: 1, sourceTodoId: dayStart, sourceActivityId: dayStart }), {
      getTodoById: () => undefined,
      getTodoByActivityId: () => undefined,
      getActivity: () => ({ id: dayStart, title: `ledger-stub:${dayStart}` }),
    });
    expect(ts).toBe(dayStart);
  });
});

describe("filterLedgerEntries schedule", () => {
  it("按 schedule activityDueRange 筛选", () => {
    const dueTs = dayStart + 4 * 3_600_000;
    const scheduleId = 55_001;
    const filtered = filterLedgerEntries({
      entries: [entry({ id: 1, sourceTodoId: 0, sourceScheduleId: scheduleId, sourceActivityId: 9 })],
      rangeStart: dayStart,
      rangeEnd: dayStart + 86_400_000,
      viewScale: "day",
      filterTagIds: [],
      filterStarredOnly: false,
      getTodoById: () => undefined,
      getScheduleById: (id) => (id === scheduleId ? { id: scheduleId, activityDueRange: [dueTs, "0"] } : undefined),
      getActivityTagIds: () => [],
      hasStarredTaskForActivity: () => false,
      getTagName: tagName,
    });
    expect(filtered).toHaveLength(1);
  });
});
