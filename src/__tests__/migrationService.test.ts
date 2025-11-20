// src/services/migrationService.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { STORAGE_KEYS } from "@/core/constants";
import { migrateTaskSource } from "@/services/migrationService";
interface MigrationReport {
  cleaned: string[];
  migrated: string[];
  errors: string[];
}

describe("migrateTaskSource", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("应该将 source='todo' 转换为 activity", () => {
    const activities = [{ id: 100 }];
    const todos = [{ id: 1, activityId: 100 }];
    const tasks = [
      {
        id: 1000,
        source: "todo",
        sourceId: 1,
        activityTitle: "测试任务",
      },
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TODO, JSON.stringify(todos));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    const result = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(result[0].source).toBe("activity");
    expect(result[0].sourceId).toBe(100);
    expect(report.migrated).toContain("task source 字段");
    expect(report.errors).toHaveLength(0);
  });

  it("应该将 source='schedule' 转换为 activity", () => {
    const activities = [{ id: 200 }];
    const schedules = [{ id: 2, activityId: 200 }];
    const tasks = [
      {
        id: 2000,
        source: "schedule",
        sourceId: 2,
        activityTitle: "测试日程",
      },
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedules));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    const result = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(result[0].source).toBe("activity");
    expect(result[0].sourceId).toBe(200);
    expect(report.migrated).toContain("task source 字段");
  });

  it("应该保持 source='activity' 不变", () => {
    const activities = [{ id: 300 }];
    const tasks = [
      {
        id: 3000,
        source: "activity",
        sourceId: 300,
        activityTitle: "已正确",
      },
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    const result = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(result[0].source).toBe("activity");
    expect(result[0].sourceId).toBe(300);
    expect(report.migrated).toHaveLength(0);
  });

  it("应该修复错误的 source 但正确的 sourceId", () => {
    const activities = [{ id: 400 }];
    const tasks = [
      {
        id: 4000,
        source: "todo",
        sourceId: 400,
        activityTitle: "错误source",
      },
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    const result = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(result[0].source).toBe("activity");
    expect(result[0].sourceId).toBe(400);
    expect(report.migrated).toContain("task source 字段");
  });

  it("找不到关联 activity 时应记录错误", () => {
    const activities = [{ id: 500 }];
    const todos = [{ id: 10, activityId: 999 }]; // 指向不存在的 activity 999
    const tasks = [
      {
        id: 5000,
        source: "todo",
        sourceId: 10, // 指向 todo 10
      },
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TODO, JSON.stringify(todos));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    const result = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(result[0].source).toBe("todo");
    expect(report.errors).toHaveLength(1);
    expect(report.errors[0]).toContain("Task 5000 无法找到关联的 activity");
  });

  it("批量迁移多条数据", () => {
    const activities = [{ id: 100 }, { id: 200 }, { id: 300 }];
    const todos = [
      { id: 1, activityId: 100 },
      { id: 2, activityId: 200 },
    ];
    const schedules = [{ id: 3, activityId: 300 }];
    const tasks = [
      { id: 1000, source: "todo", sourceId: 1, activityTitle: "任务1" },
      { id: 2000, source: "todo", sourceId: 2, activityTitle: "任务2" },
      { id: 3000, source: "schedule", sourceId: 3, activityTitle: "任务3" },
      { id: 4000, source: "activity", sourceId: 100, activityTitle: "任务4" },
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TODO, JSON.stringify(todos));
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedules));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    const result = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(result[0].sourceId).toBe(100);
    expect(result[1].sourceId).toBe(200);
    expect(result[2].sourceId).toBe(300);
    expect(result[3].sourceId).toBe(100);
    expect(result.every((t: any) => t.source === "activity")).toBe(true);
  });

  it("没有 task 数据时不应报错", () => {
    const activities = [{ id: 100 }];
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    expect(report.errors).toHaveLength(0);
    expect(report.migrated).toHaveLength(0);
  });

  it("没有 activity 数据时不应执行迁移", () => {
    const tasks = [{ id: 1000, source: "todo", sourceId: 1, activityTitle: "任务" }];
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    const result = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(result[0].source).toBe("todo");
    expect(report.migrated).toHaveLength(0);
  });
});
