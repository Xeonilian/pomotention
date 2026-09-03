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
    // activity 已软删也不命中
    const deletedMap = new Map<number, Activity>([[100, { ...drinkActivity, deleted: true }]]);
    expect(findLifeRecordTodoForDay([makeTodo({ id: IN_DAY, activityId: 100 })], deletedMap, "drink", DAY_START)).toBeUndefined();
  });
});

describe("buildLifeRecordEntities", () => {
  it("三件套互相关联且落在记录时刻", () => {
    const { activity, todo, task } = buildLifeRecordEntities("drink", IN_DAY);
    expect(activity.id).toBe(IN_DAY);
    expect(activity.tagIds).toEqual([TAG_ID_LIFE_DRINK]);
    expect(todo.id).toBe(IN_DAY);
    expect(todo.activityId).toBe(activity.id);
    expect(todo.taskId).toBe(task.id);
    expect(task.sourceId).toBe(activity.id);
    expect(task.lifeRecords).toEqual([]);
    expect(activity.taskId).toBe(task.id);
    expect(todo.priority).toBe(0);
  });

  it("创建即 done 且 title 留空（不占活动列表，识别靠排序列 emoji）", () => {
    const { activity, todo } = buildLifeRecordEntities("drink", IN_DAY);
    expect(activity.status).toBe("done");
    expect(todo.status).toBe("done");
    expect(activity.title).toBe("");
    expect(todo.activityTitle).toBe("");
  });

  it("buildLifeRecordTask 兜底补建", () => {
    const task: Task = buildLifeRecordTask(100, "喝水");
    expect(task.sourceId).toBe(100);
    expect(task.source).toBe("activity");
    expect(task.lifeRecords).toEqual([]);
  });
});

describe("appendLifeRecord", () => {
  it("点事件直接追加，时刻为显示日时刻", () => {
    const { next, record } = appendLifeRecord(undefined, "drink", IN_DAY);
    expect(next).toHaveLength(1);
    expect(record.recordedAt).toBe(IN_DAY);
    expect(record.endAt).toBeUndefined();
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

// ========== store 级：懒创建与删空级联 ==========
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

describe("recordLifeRecord / removeLifeRecordAt（store 级联）", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
  });

  it("首次 +1 懒建三件套并补建系统 tag，再次 +1 复用同一行", async () => {
    const { useDataStore } = await import("@/stores/useDataStore");
    const { useTagStore } = await import("@/stores/useTagStore");
    const ds = useDataStore();

    ds.recordLifeRecord("drink");
    expect(ds.activityList).toHaveLength(1);
    expect(ds.todoList).toHaveLength(1);
    expect(ds.taskList).toHaveLength(1);
    expect(ds.activityList[0].tagIds).toEqual([TAG_ID_LIFE_DRINK]);
    expect(ds.taskList[0].lifeRecords).toHaveLength(1);
    expect(useTagStore().rawTags.some((t) => t.id === TAG_ID_LIFE_DRINK)).toBe(true);

    // 每次点击都激活表单；选中态由 display→selection 同步 watcher 落到隐藏行上（表格不渲染，无视觉影响）
    const { useDisplayedTaskStore } = await import("@/stores/useDisplayedTaskStore");
    expect(useDisplayedTaskStore().displayedTaskId).toBe(ds.taskList[0].id);
    expect(ds.selectedRowId).toBe(ds.todoList[0].id);

    ds.recordLifeRecord("drink");
    expect(ds.activityList).toHaveLength(1);
    expect(ds.taskList[0].lifeRecords).toHaveLength(2);
    expect(useDisplayedTaskStore().displayedTaskId).toBe(ds.taskList[0].id);
  });

  it("记录未删空时只更新数组，行保留", async () => {
    const { useDataStore } = await import("@/stores/useDataStore");
    const ds = useDataStore();
    ds.recordLifeRecord("drink");
    ds.recordLifeRecord("drink");
    const task = ds.taskList[0];

    ds.removeLifeRecordAt(task.id, task.lifeRecords![0].id);
    expect(ds.taskList[0].lifeRecords).toHaveLength(1);
    expect(ds.taskList[0].deleted).toBeFalsy();
    expect(ds.todoList[0].deleted).toBeFalsy();
  });

  it("删空最后一条记录时级联软删 activity/todo/task", async () => {
    const { useDataStore } = await import("@/stores/useDataStore");
    const ds = useDataStore();
    ds.recordLifeRecord("eat");
    const task = ds.taskList[0];

    ds.removeLifeRecordAt(task.id, task.lifeRecords![0].id);
    expect(ds.activityList[0].deleted).toBe(true);
    expect(ds.todoList[0].deleted).toBe(true);
    expect(ds.taskList[0].deleted).toBe(true);
  });
});
