import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import type { Activity } from "@/core/types/Activity";
import type { LifeRecord, Task } from "@/core/types/Task";
import { getLifeRecordKind, isLifeRecordActivity, getLifeRecordDef, isLifeRecordTagId, pickFirstNonLifeRecordTagId, nextEatCourse, drinkKindFromDescription, drinkKindOf, nextDrinkKind, parseLifeRecordPlaceholder, lifeRecordDayOf } from "@/core/lifeRecord";
import { TAG_ID_LIFE_DRINK, TAG_ID_LIFE_SLEEP } from "@/core/constants";
import {
  findLifeRecordTaskForDay,
  findLifeRecordTasksForDay,
  mergeBucketLifeRecords,
  lifeRecordOwnerTaskId,
  buildLifeRecordEntities,
  buildLifeRecordTask,
  appendLifeRecord,
  removeLifeRecord,
  updateLifeRecord,
  sumLifeRecordAmountMl,
  resolveLifeSpanEndAt,
} from "@/services/lifeRecord/lifeRecordService";
const DAY_START = new Date(2026, 8, 2, 0, 0, 0, 0).getTime(); // 2026-09-02 00:00
const IN_DAY = new Date(2026, 8, 2, 10, 30, 0, 0).getTime();
const NEXT_DAY = new Date(2026, 8, 3, 8, 0, 0, 0).getTime();
function makeActivity(overrides: Partial<Activity>): Activity {
  return {
    id: 1,
    title: "x",
    class: "T",
    parentId: null,
    deleted: false,
    synced: false,
    lastModified: 0,
    ...overrides,
  };
}
describe("core/lifeRecord tag 判定", () => {
  it("按 tagIds 判定 kind，非生活记录返回 null", () => {
    expect(getLifeRecordKind({ tagIds: [TAG_ID_LIFE_DRINK] })).toBe("drink");
    expect(getLifeRecordKind({ tagIds: [1, TAG_ID_LIFE_SLEEP] })).toBe("sleep");
    expect(getLifeRecordKind({ tagIds: [1, 2] })).toBeNull();
    expect(getLifeRecordKind({ tagIds: undefined })).toBeNull();
    expect(getLifeRecordKind(undefined)).toBeNull();
    expect(isLifeRecordActivity({ tagIds: [TAG_ID_LIFE_DRINK] })).toBe(true);
    expect(isLifeRecordActivity({ tagIds: [1] })).toBe(false);
  });
  it("每种 kind 的 def 都有标题与固定 tagId", () => {
    expect(getLifeRecordDef("drink").tagId).toBe(TAG_ID_LIFE_DRINK);
    expect(getLifeRecordDef("sleep").title).toBe("睡觉");
  });
  it("取色跳过生活系统 tag", () => {
    expect(isLifeRecordTagId(TAG_ID_LIFE_DRINK)).toBe(true);
    expect(isLifeRecordTagId(1)).toBe(false);
    expect(pickFirstNonLifeRecordTagId([TAG_ID_LIFE_DRINK])).toBeUndefined();
    expect(pickFirstNonLifeRecordTagId([TAG_ID_LIFE_DRINK, 1, 2])).toBe(1);
    expect(pickFirstNonLifeRecordTagId([3, TAG_ID_LIFE_SLEEP])).toBe(3);
  });
});
describe("parseLifeRecordPlaceholder / findLifeRecordTaskForDay", () => {
  it("从 daily_kind_日零点 取日", () => {
    expect(parseLifeRecordPlaceholder(`daily_drink_${DAY_START}`)).toEqual({ kind: "drink", dayStart: DAY_START });
    expect(lifeRecordDayOf({ activityTitle: `daily_sleep_${DAY_START}` })).toBe(DAY_START);
    expect(parseLifeRecordPlaceholder("喝水")).toBeNull();
  });
  it("按标题命中当日该 kind，不看 sourceId 落在哪一天", () => {
    const task = buildLifeRecordTask(NEXT_DAY, `daily_drink_${DAY_START}`);
    expect(findLifeRecordTaskForDay([task], "drink", DAY_START)?.id).toBe(task.id);
    expect(findLifeRecordTaskForDay([task], "drink", NEXT_DAY)).toBeUndefined();
  });
  it("旧数据无占位标题：用 tag + sourceId 窗口兜底", () => {
    const drinkActivity = makeActivity({ id: IN_DAY, title: "喝水", tagIds: [TAG_ID_LIFE_DRINK] });
    const activityById = new Map<number, Activity>([[IN_DAY, drinkActivity]]);
    const task = buildLifeRecordTask(IN_DAY, "喝水");
    expect(findLifeRecordTaskForDay([task], "drink", DAY_START, activityById)?.id).toBe(IN_DAY);
    expect(findLifeRecordTaskForDay([task], "sleep", DAY_START, activityById)).toBeUndefined();
    expect(findLifeRecordTaskForDay([task], "drink", NEXT_DAY, activityById)).toBeUndefined();
  });
  it("已删除不命中", () => {
    const task = { ...buildLifeRecordTask(IN_DAY, `daily_drink_${DAY_START}`), deleted: true };
    expect(findLifeRecordTaskForDay([task], "drink", DAY_START)).toBeUndefined();
  });
  it("同日同 kind 多桶都返回，find 仍取列表里的第一只", () => {
    const first = buildLifeRecordTask(IN_DAY, `daily_drink_${DAY_START}`);
    const second = buildLifeRecordTask(IN_DAY + 1, `daily_drink_${DAY_START}`);
    first.lifeRecords = [{ id: 1, recordedAt: IN_DAY + 2 }];
    second.lifeRecords = [
      { id: 1, recordedAt: IN_DAY },
      { id: 2, recordedAt: IN_DAY + 1 },
    ];
    const tasks = [first, second];
    expect(findLifeRecordTasksForDay(tasks, "drink", DAY_START).map((task) => task.id)).toEqual([first.id, second.id]);
    expect(findLifeRecordTaskForDay(tasks, "drink", DAY_START)?.id).toBe(first.id);
    expect(mergeBucketLifeRecords(tasks).map((record) => record.id)).toEqual([2, 1]);
    expect(lifeRecordOwnerTaskId(tasks, 2, first.id)).toBe(second.id);
    expect(lifeRecordOwnerTaskId(tasks, 1, first.id)).toBe(first.id);
    expect(lifeRecordOwnerTaskId(tasks, 9, first.id)).toBe(first.id);
  });
});
describe("buildLifeRecordEntities", () => {
  it("activity/task 互相关联且落在记录时刻，不建待办", () => {
    const { activity, task } = buildLifeRecordEntities("drink", IN_DAY, { drinkGoalMl: 2000 });
    expect(activity.id).toBe(IN_DAY);
    expect(activity.tagIds).toEqual([TAG_ID_LIFE_DRINK]);
    expect(task.id).toBe(IN_DAY);
    expect(task.sourceId).toBe(activity.id);
    expect(task.lifeRecords).toEqual([]);
    expect(task.drinkGoalMl).toBe(2000);
    expect(activity.taskId).toBe(task.id);
  });
  it("创建即 done；title / activityTitle 均为 daily_kind_日零点", () => {
    const { activity, task } = buildLifeRecordEntities("drink", IN_DAY);
    expect(activity.status).toBe("done");
    expect(activity.title).toBe(`daily_drink_${DAY_START}`);
    expect(task.activityTitle).toBe(`daily_drink_${DAY_START}`);
  });
  it("非 drink 不写 drinkGoalMl", () => {
    const { task } = buildLifeRecordEntities("eat", IN_DAY, { drinkGoalMl: 2000 });
    expect(task.drinkGoalMl).toBeUndefined();
  });
  it("at 非法时仍写出有限 id，不会变成 NaN", () => {
    const { activity, task } = buildLifeRecordEntities("drink", Number.NaN);
    expect(Number.isFinite(activity.id)).toBe(true);
    expect(Number.isFinite(task.id)).toBe(true);
    expect(task.id).toBe(activity.id);
  });
  it("occupiedIds 避免同刻撞号：两类同号，kind 之间 +1", () => {
    const first = buildLifeRecordEntities("drink", IN_DAY);
    const second = buildLifeRecordEntities("eat", IN_DAY, {
      occupiedIds: [first.activity.id],
    });
    expect(first.task.id).toBe(first.activity.id);
    expect(second.activity.id).toBe(IN_DAY + 1);
    expect(second.task.id).toBe(IN_DAY + 1);
  });
  it("四类同刻：activity/task 同号，kind 连续 +1 不是 +2", () => {
    const occupied: number[] = [];
    const kinds = ["drink", "eat", "toilet", "sleep"] as const;
    const built = kinds.map((kind) => {
      const e = buildLifeRecordEntities(kind, IN_DAY, { occupiedIds: occupied });
      occupied.push(e.activity.id);
      return e;
    });
    expect(built.map((e) => e.activity.id)).toEqual([IN_DAY, IN_DAY + 1, IN_DAY + 2, IN_DAY + 3]);
    for (const e of built) {
      expect(e.task.id).toBe(e.activity.id);
    }
  });
  it("buildLifeRecordTask 兜底补建", () => {
    const task: Task = buildLifeRecordTask(100, "喝水", { drinkGoalMl: 1500 });
    expect(task.id).toBe(100);
    expect(task.sourceId).toBe(100);
    expect(task.source).toBe("activity");
    expect(task.lifeRecords).toEqual([]);
    expect(task.drinkGoalMl).toBe(1500);
  });
});
describe("appendLifeRecord", () => {
  it("点事件直接追加，可带 amountMl", () => {
    const { next, record } = appendLifeRecord(undefined, "drink", IN_DAY, { amountMl: 250 });
    expect(next).toHaveLength(1);
    expect(record.recordedAt).toBe(IN_DAY);
    expect(record.amountMl).toBe(250);
    expect(record.endAt).toBeUndefined();
  });
  it("喝水新记录不写 description / drinkKind，种类默认水", () => {
    const { record } = appendLifeRecord(undefined, "drink", IN_DAY, { amountMl: 250 });
    expect(record.description).toBeUndefined();
    expect(record.drinkKind).toBeUndefined();
    expect(drinkKindOf(record)).toBe("water");
    expect(drinkKindFromDescription(undefined)).toBe("water");
    expect(drinkKindFromDescription("饮品")).toBe("beverage");
    expect(drinkKindFromDescription("酒")).toBe("wine");
    expect(drinkKindFromDescription("咖啡")).toBe("coffee");
  });
  it("喝水种类字段优先于旧备注标签", () => {
    expect(drinkKindOf({ description: "酒" })).toBe("wine");
    expect(drinkKindOf({ drinkKind: "coffee", description: "酒" })).toBe("coffee");
  });
  it("喝水类型饮品→水→咖啡→酒→饮品", () => {
    expect(nextDrinkKind("beverage")).toBe("water");
    expect(nextDrinkKind("water")).toBe("coffee");
    expect(nextDrinkKind("coffee")).toBe("wine");
    expect(nextDrinkKind("wine")).toBe("beverage");
    expect(nextDrinkKind(undefined)).toBe("coffee");
  });
  it("吃饭新记录默认 eatCourse 为正餐", () => {
    const { record } = appendLifeRecord(undefined, "eat", IN_DAY, { eatCourse: "meal" });
    expect(record.eatCourse).toBe("meal");
    expect(record.amountMl).toBeUndefined();
  });
  it("吃饭可写水果 eatCourse", () => {
    const { record } = appendLifeRecord(undefined, "eat", IN_DAY, { eatCourse: "apple" });
    expect(record.eatCourse).toBe("apple");
  });
  it("吃饭可写补剂 eatCourse", () => {
    const { record } = appendLifeRecord(undefined, "eat", IN_DAY, { eatCourse: "supplement" });
    expect(record.eatCourse).toBe("supplement");
  });
  it("吃饭类型正餐→甜点→水果→补剂→正餐", () => {
    expect(nextEatCourse("meal")).toBe("dessert");
    expect(nextEatCourse("dessert")).toBe("apple");
    expect(nextEatCourse("apple")).toBe("supplement");
    expect(nextEatCourse("supplement")).toBe("meal");
  });
  it("sumLifeRecordAmountMl 合计", () => {
    expect(sumLifeRecordAmountMl([{ id: 1, recordedAt: 1, amountMl: 250 }, { id: 2, recordedAt: 2, amountMl: 250 }])).toBe(500);
    expect(sumLifeRecordAmountMl([{ id: 1, recordedAt: 1 }])).toBe(0);
  });
  it("isDrinkGoalMet", async () => {
    const { isDrinkGoalMet } = await import("@/services/lifeRecord/lifeRecordService");
    expect(isDrinkGoalMet(2000, 2000)).toBe(true);
    expect(isDrinkGoalMet(1999, 2000)).toBe(false);
    expect(isDrinkGoalMet(500, 0)).toBe(false);
    expect(isDrinkGoalMet(500, undefined)).toBe(false);
  });
});
describe("resolveLifeSpanEndAt", () => {
  it("结束钟点晚于开始：落在开始当天", () => {
    const start = new Date(2026, 9, 18, 6, 0).getTime();
    const pick = new Date(2026, 9, 18, 7, 5).getTime();
    expect(resolveLifeSpanEndAt(start, pick)).toBe(new Date(2026, 9, 18, 7, 5).getTime());
  });
  it("已有次日 endAt 再改钟点：不叠出 25h，仍相对开始日", () => {
    const start = new Date(2026, 9, 18, 6, 0).getTime();
    const existingNextDay = new Date(2026, 9, 19, 7, 5).getTime();
    expect(resolveLifeSpanEndAt(start, existingNextDay)).toBe(new Date(2026, 9, 18, 7, 5).getTime());
  });
  it("结束钟点早于开始：跨到次日；同一分钟保持 0", () => {
    const start = new Date(2026, 9, 18, 23, 0).getTime();
    const wake = new Date(2026, 9, 18, 6, 10).getTime();
    expect(resolveLifeSpanEndAt(start, wake)).toBe(new Date(2026, 9, 19, 6, 10).getTime());
    const same = new Date(2026, 9, 18, 6, 0).getTime();
    expect(resolveLifeSpanEndAt(same, same)).toBe(same);
  });
  it("闭合未结束段：开始已改到晚上、打点在早晨，补到次日", () => {
    const start = new Date(2026, 9, 18, 23, 0).getTime();
    const first = appendLifeRecord(undefined, "sleep", start);
    const closed = appendLifeRecord(first.next, "sleep", new Date(2026, 9, 18, 6, 10).getTime());
    expect(closed.next[0].endAt).toBe(new Date(2026, 9, 19, 6, 10).getTime());
  });
});
describe("appendLifeRecord span", () => {
  it("sleep：首次新开无 endAt，再次 +1 闭合，第三次再开新段", () => {
    const first = appendLifeRecord(undefined, "sleep", IN_DAY);
    expect(first.next[0].endAt).toBeUndefined();
    const second = appendLifeRecord(first.next, "sleep", NEXT_DAY);
    expect(second.next).toHaveLength(1);
    expect(second.next[0].recordedAt).toBe(IN_DAY);
    expect(second.next[0].endAt).toBe(NEXT_DAY);
    const third = appendLifeRecord(second.next, "sleep", NEXT_DAY + 1000);
    expect(third.next).toHaveLength(2);
    expect(third.next[1].endAt).toBeUndefined();
  });
  it("toilet：首次新开无 endAt，再次 +1 闭合", () => {
    const first = appendLifeRecord(undefined, "toilet", IN_DAY);
    expect(first.next[0].endAt).toBeUndefined();
    const second = appendLifeRecord(first.next, "toilet", NEXT_DAY);
    expect(second.next).toHaveLength(1);
    expect(second.next[0].endAt).toBe(NEXT_DAY);
  });
  it("alwaysNew：未闭合时仍新开一行，不写结束时间", () => {
    const first = appendLifeRecord(undefined, "sleep", IN_DAY);
    const second = appendLifeRecord(first.next, "sleep", NEXT_DAY, { alwaysNew: true });
    expect(second.next).toHaveLength(2);
    expect(second.next[0].endAt).toBeUndefined();
    expect(second.next[1].endAt).toBeUndefined();
    expect(second.next[1].recordedAt).toBe(NEXT_DAY);
  });
});
describe("removeLifeRecord / updateLifeRecord", () => {
  const records: LifeRecord[] = [
    { id: 1, recordedAt: IN_DAY },
    { id: 2, recordedAt: NEXT_DAY, description: "面" },
  ];
  it("remove：命中移除，未命中返回 null", () => {
    expect(removeLifeRecord(records, 1)).toEqual([records[1]]);
    expect(removeLifeRecord(records, 999)).toBeNull();
    expect(removeLifeRecord(undefined, 1)).toBeNull();
  });
  it("update：改时间与备注，未命中返回 null", () => {
    const next = updateLifeRecord(records, 2, { endAt: NEXT_DAY + 100, description: "粥" });
    expect(next?.[1].endAt).toBe(NEXT_DAY + 100);
    expect(next?.[1].description).toBe("粥");
    expect(next?.[0]).toEqual(records[0]);
    expect(updateLifeRecord(records, 999, { description: "x" })).toBeNull();
  });
});
// ========== store 级：开门与删空级联 ==========
vi.mock("@/services/data/localStorageService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/data/localStorageService")>();
  return {
    ...actual,
    loadActivities: vi.fn(() => []),
    loadTodos: vi.fn(() => []),
    loadSchedules: vi.fn(() => []),
    loadTasks: vi.fn(() => []),
    loadLedgerEntries: vi.fn(() => []),
    loadTags: vi.fn(() => []),
    loadTemplates: vi.fn(() => []),
  };
});
describe("openLifeRecord / discardLifeRecordTask（store）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });
  it("日视图打开：懒建空桶+目标快照，不追加记录；再开复用", async () => {
    const { useDataStore } = await import("@/stores/useDataStore");
    const { useSettingStore } = await import("@/stores/useSettingStore");
    const { useTagStore } = await import("@/stores/useTagStore");
    const ds = useDataStore();
    const settings = useSettingStore();
    settings.settings.viewSet = "day";
    settings.settings.drinkDailyGoalMl = 2000;
    settings.settings.drinkCupMl = 250;
    ds.openLifeRecord("drink");
    expect(ds.activityList).toHaveLength(1);
    expect(ds.todoList).toHaveLength(0);
    expect(ds.taskList).toHaveLength(1);
    expect(ds.activityList[0].tagIds).toEqual([TAG_ID_LIFE_DRINK]);
    expect(ds.taskList[0].lifeRecords).toEqual([]);
    expect(ds.taskList[0].drinkGoalMl).toBe(2000);
    expect(useTagStore().rawTags.some((t) => t.id === TAG_ID_LIFE_DRINK)).toBe(true);
    const { useDisplayedTaskStore } = await import("@/stores/useDisplayedTaskStore");
    expect(useDisplayedTaskStore().displayedTaskId).toBe(ds.taskList[0].id);
    ds.openLifeRecord("drink");
    expect(ds.activityList).toHaveLength(1);
    expect(ds.taskList[0].lifeRecords).toEqual([]);
  });
  it("表单路径 +1 写入 amountMl；改全局默认不影响已有快照", async () => {
    const { useDataStore } = await import("@/stores/useDataStore");
    const { useSettingStore } = await import("@/stores/useSettingStore");
    const { appendLifeRecord } = await import("@/services/lifeRecord/lifeRecordService");
    const ds = useDataStore();
    const settings = useSettingStore();
    settings.settings.viewSet = "day";
    settings.settings.drinkDailyGoalMl = 2000;
    settings.settings.drinkCupMl = 250;
    ds.openLifeRecord("drink");
    const task = ds.taskList[0];
    const { next } = appendLifeRecord(task.lifeRecords, "drink", IN_DAY, { amountMl: settings.settings.drinkCupMl });
    ds.updateTaskById(task.id, { lifeRecords: next });
    expect(ds.taskList[0].lifeRecords?.[0].amountMl).toBe(250);
    settings.settings.drinkCupMl = 300;
    settings.settings.drinkDailyGoalMl = 3000;
    expect(ds.taskList[0].drinkGoalMl).toBe(2000);
    expect(ds.taskList[0].lifeRecords?.[0].amountMl).toBe(250);
    const again = appendLifeRecord(ds.taskList[0].lifeRecords, "drink", IN_DAY + 1, {
      amountMl: settings.settings.drinkCupMl,
    });
    ds.updateTaskById(task.id, { lifeRecords: again.next });
    expect(ds.taskList[0].lifeRecords?.[1].amountMl).toBe(300);
  });
  it("非日视图 open 为 no-op", async () => {
    const { useDataStore } = await import("@/stores/useDataStore");
    const { useSettingStore } = await import("@/stores/useSettingStore");
    const ds = useDataStore();
    useSettingStore().settings.viewSet = "month";
    ds.openLifeRecord("drink");
    expect(ds.taskList).toHaveLength(0);
  });
  it("ensure 一日 4 类：activity/task id 有限且互不撞，不建待办", async () => {
    const { useDataStore } = await import("@/stores/useDataStore");
    const ds = useDataStore();
    ds.ensureAllLifeRecordTasksForDay(DAY_START);
    expect(ds.activityList).toHaveLength(4);
    expect(ds.todoList).toHaveLength(0);
    const ids = ds.activityList.map((a) => a.id).sort((a, b) => a - b);
    expect(ids[1]).toBe(ids[0] + 1);
    expect(ids[2]).toBe(ids[0] + 2);
    expect(ids[3]).toBe(ids[0] + 3);
    for (const activity of ds.activityList) {
      expect(activity.id).toBeGreaterThanOrEqual(DAY_START);
      expect(activity.id).toBeLessThan(DAY_START + 86400000);
      const task = ds.taskList.find((t) => t.id === activity.id);
      expect(task).toBeTruthy();
      expect(task?.sourceId).toBe(activity.id);
    }
  });
  it("discard 空桶级联软删", async () => {
    const { useDataStore } = await import("@/stores/useDataStore");
    const { useSettingStore } = await import("@/stores/useSettingStore");
    const ds = useDataStore();
    useSettingStore().settings.viewSet = "day";
    ds.openLifeRecord("drink");
    ds.discardLifeRecordTask(ds.taskList[0].id);
    expect(ds.activityList[0].deleted).toBe(true);
    expect(ds.todoList).toHaveLength(0);
    expect(ds.taskList[0].deleted).toBe(true);
  });
  it("有记录时 remove 未删空只更新数组；删空级联", async () => {
    const { useDataStore } = await import("@/stores/useDataStore");
    const { useSettingStore } = await import("@/stores/useSettingStore");
    const { appendLifeRecord } = await import("@/services/lifeRecord/lifeRecordService");
    const ds = useDataStore();
    useSettingStore().settings.viewSet = "day";
    ds.openLifeRecord("drink");
    const taskId = ds.taskList[0].id;
    let next = appendLifeRecord(undefined, "drink", IN_DAY, { amountMl: 250 }).next;
    next = appendLifeRecord(next, "drink", IN_DAY + 1, { amountMl: 250 }).next;
    ds.updateTaskById(taskId, { lifeRecords: next });
    ds.removeLifeRecordAt(taskId, next[0].id);
    expect(ds.taskList[0].lifeRecords).toHaveLength(1);
    expect(ds.taskList[0].deleted).toBeFalsy();
    ds.removeLifeRecordAt(taskId, ds.taskList[0].lifeRecords![0].id);
    expect(ds.activityList[0].deleted).toBe(true);
    expect(ds.todoList).toHaveLength(0);
    expect(ds.taskList[0].deleted).toBe(true);
  });
});
