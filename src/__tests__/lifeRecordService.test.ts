import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { LifeRecord, Task } from "@/core/types/Task";
import { getLifeRecordKind, isLifeRecordActivity, getLifeRecordDef } from "@/core/lifeRecord";
import { TAG_ID_LIFE_DRINK, TAG_ID_LIFE_SLEEP } from "@/core/constants";
import {
  findLifeRecordTodoForDay,
  buildLifeRecordEntities,
  buildLifeRecordTask,
  appendLifeRecord,
  removeLifeRecord,
  updateLifeRecord,
  sumLifeRecordAmountMl,
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

function makeTodo(overrides: Partial<Todo>): Todo {
  return {
    id: IN_DAY,
    activityId: 1,
    activityTitle: "x",
    priority: 0,
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
});

describe("findLifeRecordTodoForDay", () => {
  const drinkActivity = makeActivity({ id: 100, title: "喝水", tagIds: [TAG_ID_LIFE_DRINK] });
  const activityById = new Map<number, Activity>([[100, drinkActivity]]);

  it("命中当日该 kind 的行", () => {
    const todos = [makeTodo({ id: IN_DAY, activityId: 100 })];
    expect(findLifeRecordTodoForDay(todos, activityById, "drink", DAY_START)?.activityId).toBe(100);
  });

  it("跨天/他 kind/已删除 均不命中", () => {
    expect(findLifeRecordTodoForDay([makeTodo({ id: NEXT_DAY, activityId: 100 })], activityById, "drink", DAY_START)).toBeUndefined();
    expect(findLifeRecordTodoForDay([makeTodo({ id: IN_DAY, activityId: 100 })], activityById, "sleep", DAY_START)).toBeUndefined();
    expect(
      findLifeRecordTodoForDay([makeTodo({ id: IN_DAY, activityId: 100, deleted: true })], activityById, "drink", DAY_START),
    ).toBeUndefined();
    const deletedMap = new Map<number, Activity>([[100, { ...drinkActivity, deleted: true }]]);
    expect(findLifeRecordTodoForDay([makeTodo({ id: IN_DAY, activityId: 100 })], deletedMap, "drink", DAY_START)).toBeUndefined();
  });
});

describe("buildLifeRecordEntities", () => {
  it("三件套互相关联且落在记录时刻", () => {
    const { activity, todo, task } = buildLifeRecordEntities("drink", IN_DAY, { drinkGoalMl: 2000 });
    expect(activity.id).toBe(IN_DAY);
    expect(activity.tagIds).toEqual([TAG_ID_LIFE_DRINK]);
    expect(todo.id).toBe(IN_DAY);
    expect(todo.activityId).toBe(activity.id);
    expect(todo.taskId).toBe(task.id);
    expect(task.sourceId).toBe(activity.id);
    expect(task.lifeRecords).toEqual([]);
    expect(task.drinkGoalMl).toBe(2000);
    expect(activity.taskId).toBe(task.id);
    expect(todo.priority).toBe(0);
  });

  it("创建即 done；title / activityTitle 均为 daily_kind_日零点", () => {
    const { activity, todo, task } = buildLifeRecordEntities("drink", IN_DAY);
    expect(activity.status).toBe("done");
    expect(todo.status).toBe("done");
    expect(activity.title).toBe(`daily_drink_${DAY_START}`);
    expect(todo.activityTitle).toBe(`daily_drink_${DAY_START}`);
    expect(task.activityTitle).toBe(`daily_drink_${DAY_START}`);
  });

  it("非 drink 不写 drinkGoalMl", () => {
    const { task } = buildLifeRecordEntities("eat", IN_DAY, { drinkGoalMl: 2000 });
    expect(task.drinkGoalMl).toBeUndefined();
  });

  it("buildLifeRecordTask 兜底补建", () => {
    const task: Task = buildLifeRecordTask(100, "喝水", { drinkGoalMl: 1500 });
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

  it("sumLifeRecordAmountMl 合计", () => {
    expect(sumLifeRecordAmountMl([{ id: 1, recordedAt: 1, amountMl: 250 }, { id: 2, recordedAt: 2, amountMl: 250 }])).toBe(500);
    expect(sumLifeRecordAmountMl([{ id: 1, recordedAt: 1 }])).toBe(0);
  });

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
    expect(ds.todoList).toHaveLength(1);
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

  it("discard 空桶级联软删", async () => {
    const { useDataStore } = await import("@/stores/useDataStore");
    const { useSettingStore } = await import("@/stores/useSettingStore");
    const ds = useDataStore();
    useSettingStore().settings.viewSet = "day";
    ds.openLifeRecord("drink");
    ds.discardLifeRecordTask(ds.taskList[0].id);
    expect(ds.activityList[0].deleted).toBe(true);
    expect(ds.todoList[0].deleted).toBe(true);
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
    expect(ds.todoList[0].deleted).toBe(true);
    expect(ds.taskList[0].deleted).toBe(true);
  });
});
