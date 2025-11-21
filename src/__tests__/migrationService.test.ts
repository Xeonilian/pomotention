// src/services/migrationService.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { STORAGE_KEYS } from "@/core/constants";
import { migrateTaskSource } from "@/services/migrationService";
import type { Task } from "@/core/types/Task";
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";

interface MigrationReport {
  cleaned: string[];
  migrated: string[];
  errors: string[];
}

// 创建完整的 Task 对象辅助函数
function createTask(overrides: Partial<Task>): Task {
  const now = Date.now();
  return {
    id: now,
    activityTitle: "测试任务",
    source: "todo",
    sourceId: 1,
    energyRecords: [],
    rewardRecords: [],
    interruptionRecords: [],
    starred: false,
    deleted: false,
    synced: false,
    lastModified: now,
    ...overrides,
  };
}

// 创建完整的 Activity 对象辅助函数
function createActivity(overrides: Partial<Activity>): Activity {
  const now = Date.now();
  return {
    id: now,
    title: "测试活动",
    class: "T",
    parentId: null,
    lastModified: now,
    synced: false,
    deleted: false,
    ...overrides,
  };
}

// 创建完整的 Todo 对象辅助函数
function createTodo(overrides: Partial<Todo>): Todo {
  const now = Date.now();
  return {
    id: now,
    activityId: 100,
    activityTitle: "测试待办",
    priority: 1,
    deleted: false,
    lastModified: now,
    synced: false,
    ...overrides,
  };
}

// 创建完整的 Schedule 对象辅助函数
function createSchedule(overrides: Partial<Schedule>): Schedule {
  const now = Date.now();
  return {
    id: now,
    activityId: 200,
    activityTitle: "测试日程",
    activityDueRange: [now, "60"],
    deleted: false,
    lastModified: now,
    synced: false,
    ...overrides,
  };
}

describe("migrateTaskSource", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("应该将 source='todo' 转换为 activity 并同步更新 activity.taskId", () => {
    const taskId = 1000;
    const activityId = 100;
    const todoId = 1;
    const now = Date.now();

    const activities: Activity[] = [
      createActivity({
        id: activityId,
        // 初始时 taskId 可能不存在或不匹配
      }),
    ];

    const todos: Todo[] = [
      createTodo({
        id: todoId,
        activityId: activityId,
      }),
    ];

    const tasks: Task[] = [
      createTask({
        id: taskId,
        source: "todo",
        sourceId: todoId,
        activityTitle: "测试任务",
        energyRecords: [{ id: now - 1000, value: 8, description: "精力充沛" }],
        rewardRecords: [{ id: now - 2000, value: 7, description: "心情愉悦" }],
      }),
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TODO, JSON.stringify(todos));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    // 验证 task 被正确迁移
    const resultTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(resultTasks).toHaveLength(1);
    expect(resultTasks[0].source).toBe("activity");
    expect(resultTasks[0].sourceId).toBe(activityId);
    expect(resultTasks[0].id).toBe(taskId);
    // 验证所有字段都被保留
    expect(resultTasks[0].energyRecords).toHaveLength(1);
    expect(resultTasks[0].rewardRecords).toHaveLength(1);
    expect(resultTasks[0].activityTitle).toBe("测试任务");
    expect(resultTasks[0].lastModified).toBeGreaterThan(now);

    // 验证 activity.taskId 被同步更新
    const resultActivities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY)!);
    expect(resultActivities).toHaveLength(1);
    expect(resultActivities[0].id).toBe(activityId);
    expect(resultActivities[0].taskId).toBe(taskId);
    expect(resultActivities[0].synced).toBe(false); // 标记为未同步

    expect(report.migrated.length).toBeGreaterThan(0);
    expect(report.errors).toHaveLength(0);
  });

  it("应该修复 source='activity' 但 sourceId 指向 schedule 的情况", () => {
    const taskId = 1760765674093;
    const activityId = 1758963246298;
    const scheduleId = 1758963246299;

    const activities: Activity[] = [
      createActivity({
        id: activityId,
        title: "咨询21",
        class: "S",
      }),
    ];

    const schedules: Schedule[] = [
      createSchedule({
        id: scheduleId,
        activityId: activityId,
        activityTitle: "咨询21",
      }),
    ];

    // source 是 "activity" 但 sourceId 指向 schedule
    const tasks: Task[] = [
      createTask({
        id: taskId,
        source: "activity",
        sourceId: scheduleId, // 错误的：指向 schedule，应该指向 activity
        activityTitle: "咨询21",
      }),
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedules));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    // 验证 task 被正确修复：sourceId 应该指向 activity，而不是 schedule
    const resultTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(resultTasks).toHaveLength(1);
    expect(resultTasks[0].source).toBe("activity");
    expect(resultTasks[0].sourceId).toBe(activityId); // 应该修复为 activity 的 ID
    expect(resultTasks[0].id).toBe(taskId);
    expect(resultTasks[0].sourceId).not.toBe(scheduleId); // 不应该再指向 schedule

    // 验证 activity.taskId 被同步更新
    const resultActivities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY)!);
    expect(resultActivities[0].id).toBe(activityId);
    expect(resultActivities[0].taskId).toBe(taskId);

    expect(report.errors).toHaveLength(0); // 应该成功修复，没有错误
    expect(report.migrated.length).toBeGreaterThan(0);
  });

  it("应该修复 source='activity' 但 sourceId 指向 todo 的情况", () => {
    const taskId = 5000;
    const activityId = 500;
    const todoId = 5;

    const activities: Activity[] = [
      createActivity({
        id: activityId,
        title: "测试",
      }),
    ];

    const todos: Todo[] = [
      createTodo({
        id: todoId,
        activityId: activityId,
        activityTitle: "测试",
      }),
    ];

    // source 是 "activity" 但 sourceId 指向 todo
    const tasks: Task[] = [
      createTask({
        id: taskId,
        source: "activity",
        sourceId: todoId, // 错误的：指向 todo，应该指向 activity
        activityTitle: "测试",
      }),
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TODO, JSON.stringify(todos));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    // 验证 task 被正确修复：sourceId 应该指向 activity，而不是 todo
    const resultTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(resultTasks).toHaveLength(1);
    expect(resultTasks[0].source).toBe("activity");
    expect(resultTasks[0].sourceId).toBe(activityId); // 应该修复为 activity 的 ID
    expect(resultTasks[0].id).toBe(taskId);
    expect(resultTasks[0].sourceId).not.toBe(todoId); // 不应该再指向 todo

    // 验证 activity.taskId 被同步更新
    const resultActivities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY)!);
    expect(resultActivities[0].id).toBe(activityId);
    expect(resultActivities[0].taskId).toBe(taskId);

    expect(report.errors).toHaveLength(0); // 应该成功修复，没有错误
    expect(report.migrated.length).toBeGreaterThan(0);
  });

  it("应该处理 sourceId 为字符串的情况（类型转换）", () => {
    // 模拟真实场景：sourceId 可能是字符串
    const taskId = 1749447972943;
    const activityId = 1749447468554;
    const todoId = 1749447475938;

    const activities: Activity[] = [
      createActivity({
        id: activityId,
        title: "测试",
        class: "T",
      }),
    ];

    const todos: Todo[] = [
      createTodo({
        id: todoId,
        activityId: activityId,
        activityTitle: "测试",
      }),
    ];

    // sourceId 作为字符串存储
    const tasks: any[] = [
      {
        id: taskId,
        activityTitle: "测试",
        source: "todo",
        sourceId: String(todoId), // 字符串类型
        energyRecords: [],
        rewardRecords: [],
        interruptionRecords: [],
        description: "",
        starred: false,
        deleted: false,
        synced: false,
        lastModified: Date.now(),
      },
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TODO, JSON.stringify(todos));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    // 验证 task 被正确迁移（sourceId 应该转换为数字）
    const resultTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(resultTasks).toHaveLength(1);
    expect(resultTasks[0].source).toBe("activity");
    expect(resultTasks[0].sourceId).toBe(activityId); // 应该是数字类型
    expect(resultTasks[0].id).toBe(taskId);
    expect(resultTasks[0].activityTitle).toBe("测试");

    // 验证 activity.taskId 被同步更新
    const resultActivities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY)!);
    expect(resultActivities).toHaveLength(1);
    expect(resultActivities[0].id).toBe(activityId);
    expect(resultActivities[0].taskId).toBe(taskId); // 应该是数字类型

    expect(report.migrated.length).toBeGreaterThan(0);
    expect(report.errors).toHaveLength(0);
  });

  it("应该将 source='schedule' 转换为 activity（包含完整字段）", () => {
    const taskId = 2000;
    const activityId = 200;
    const scheduleId = 2;
    const now = Date.now();

    const activities: Activity[] = [
      createActivity({
        id: activityId,
      }),
    ];

    const schedules: Schedule[] = [
      createSchedule({
        id: scheduleId,
        activityId: activityId,
      }),
    ];

    const tasks: Task[] = [
      createTask({
        id: taskId,
        source: "schedule",
        sourceId: scheduleId,
        activityTitle: "测试日程",
        interruptionRecords: [
          {
            id: now - 3000,
            interruptionType: "E",
            description: "外部打扰",
            activityType: "T",
          },
        ],
        starred: true,
      }),
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedules));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    const result: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("activity");
    expect(result[0].sourceId).toBe(activityId);
    expect(result[0].starred).toBe(true);
    expect(result[0].interruptionRecords).toHaveLength(1);
    expect(result[0].activityTitle).toBe("测试日程");
    expect(report.migrated.length).toBeGreaterThan(0);
    expect(report.errors).toHaveLength(0);
  });

  it("应该保持 source='activity' 且同步更新 activity.taskId（当 taskId 不存在时）", () => {
    const taskId = 3000;
    const activityId = 300;

    const activities: Activity[] = [
      createActivity({
        id: activityId,
        taskId: undefined, // 初始时 taskId 可能不存在
      }),
    ];

    const tasks: Task[] = [
      createTask({
        id: taskId,
        source: "activity",
        sourceId: activityId,
        activityTitle: "已正确",
        projectName: "测试项目",
      }),
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };

    migrateTaskSource(report);

    // 验证 task 保持不变
    const resultTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(resultTasks).toHaveLength(1);
    expect(resultTasks[0].source).toBe("activity");
    expect(resultTasks[0].sourceId).toBe(activityId);
    expect(resultTasks[0].projectName).toBe("测试项目");

    // 验证 activity.taskId 被同步更新
    const resultActivities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY)!);
    expect(resultActivities).toHaveLength(1);
    expect(resultActivities[0].id).toBe(activityId);
    expect(resultActivities[0].taskId).toBe(taskId);
    expect(report.migrated.length).toBeGreaterThan(0); // 会更新 activity.taskId
  });

  it("应该保持 source='activity' 且同步更新 activity.taskId（当 taskId 不匹配时）", () => {
    const taskId = 4000;
    const activityId = 400;
    const wrongTaskId = 9999;

    const activities: Activity[] = [
      createActivity({
        id: activityId,
        taskId: wrongTaskId, // taskId 不匹配
      }),
    ];

    const tasks: Task[] = [
      createTask({
        id: taskId,
        source: "activity",
        sourceId: activityId,
        activityTitle: "已正确",
      }),
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };

    migrateTaskSource(report);

    // 验证 task 保持不变
    const resultTasks: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(resultTasks).toHaveLength(1);
    expect(resultTasks[0].source).toBe("activity");
    expect(resultTasks[0].sourceId).toBe(activityId);

    // 验证 activity.taskId 被同步更新为正确的值
    const resultActivities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY)!);
    expect(resultActivities).toHaveLength(1);
    expect(resultActivities[0].id).toBe(activityId);
    expect(resultActivities[0].taskId).toBe(taskId); // 应该更新为正确的 taskId
    expect(resultActivities[0].taskId).not.toBe(wrongTaskId); // 不应该保留错误的值
    expect(report.migrated.length).toBeGreaterThan(0);
  });

  it("应该修复错误的 source，当 sourceId 直接指向 activity 时", () => {
    const taskId = 4000;
    const activityId = 400;

    const activities: Activity[] = [
      createActivity({
        id: activityId,
      }),
    ];

    const tasks: Task[] = [
      createTask({
        id: taskId,
        source: "todo", // 错误的 source
        sourceId: activityId, // 但 sourceId 直接指向 activity
        activityTitle: "错误source但正确sourceId",
      }),
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    // 应该智能修复：sourceId 直接指向 activity，修复 source 为 "activity"
    const result: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("activity"); // 应该被修复为 "activity"
    expect(result[0].sourceId).toBe(activityId);
    expect(result[0].id).toBe(taskId);

    // 验证 activity.taskId 被同步更新
    const resultActivities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY)!);
    expect(resultActivities[0].taskId).toBe(taskId);

    expect(report.errors).toHaveLength(0); // 不应该有错误，因为成功修复了
    expect(report.migrated.length).toBeGreaterThan(0);
  });

  it("找不到对应的 todo/schedule 时应删除任务并记录错误（云端外键约束）", () => {
    const taskId = 5000;
    const activityId = 500;
    const todoId = 999; // 不存在的 todo id

    const activities: Activity[] = [
      createActivity({
        id: activityId,
      }),
    ];

    const tasks: Task[] = [
      createTask({
        id: taskId,
        source: "todo",
        sourceId: todoId, // 指向不存在的 todo
        activityTitle: "应该被删除",
      }),
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    // 任务应该被删除，因为找不到关联的 activity
    const result: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK) || "[]");
    expect(result).toHaveLength(0);
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.errors[0]).toContain(`Task ${taskId}`);
    expect(report.errors[0]).toContain("将删除该任务");
  });

  it("todo 指向不存在的 activity 时应删除任务并记录错误", () => {
    const taskId = 6000;
    const activityId = 600;
    const todoId = 6;
    const nonExistentActivityId = 9999;

    const activities: Activity[] = [
      createActivity({
        id: activityId, // 存在的 activity
      }),
    ];

    const todos: Todo[] = [
      createTodo({
        id: todoId,
        activityId: nonExistentActivityId, // 指向不存在的 activity
      }),
    ];

    const tasks: Task[] = [
      createTask({
        id: taskId,
        source: "todo",
        sourceId: todoId,
        activityTitle: "应该被删除",
      }),
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TODO, JSON.stringify(todos));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    // 任务应该被删除，因为找不到关联的 activity
    const result: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK) || "[]");
    expect(result).toHaveLength(0);
    expect(report.errors.length).toBeGreaterThan(0);
    expect(report.errors[0]).toContain(`Task ${taskId}`);
    expect(report.errors[0]).toContain("将删除该任务");
  });

  it("批量迁移多条数据，包含完整字段", () => {
    const now = Date.now();

    const activities: Activity[] = [
      createActivity({ id: 100 }),
      createActivity({ id: 200 }),
      createActivity({ id: 300 }),
      createActivity({ id: 400 }),
    ];

    const todos: Todo[] = [createTodo({ id: 1, activityId: 100 }), createTodo({ id: 2, activityId: 200 })];

    const schedules: Schedule[] = [createSchedule({ id: 3, activityId: 300 })];

    const tasks: Task[] = [
      createTask({
        id: 1000,
        source: "todo",
        sourceId: 1,
        activityTitle: "任务1",
        energyRecords: [{ id: now, value: 5, description: "中等精力" }],
      }),
      createTask({
        id: 2000,
        source: "todo",
        sourceId: 2,
        activityTitle: "任务2",
        starred: true,
      }),
      createTask({
        id: 3000,
        source: "schedule",
        sourceId: 3,
        activityTitle: "任务3",
        rewardRecords: [{ id: now, value: 9, description: "非常愉悦" }],
      }),
      createTask({
        id: 4000,
        source: "activity",
        sourceId: 400,
        activityTitle: "任务4",
        projectName: "项目A",
      }),
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TODO, JSON.stringify(todos));
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedules));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    const result: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    expect(result).toHaveLength(4);
    expect(result[0].source).toBe("activity");
    expect(result[1].source).toBe("activity");
    expect(result[2].source).toBe("activity");
    expect(result[3].source).toBe("activity");
    expect(result[0].sourceId).toBe(100);
    expect(result[1].sourceId).toBe(200);
    expect(result[2].sourceId).toBe(300);
    expect(result[3].sourceId).toBe(400);

    // 验证所有字段都被保留
    expect(result[0].energyRecords).toHaveLength(1);
    expect(result[1].starred).toBe(true);
    expect(result[2].rewardRecords).toHaveLength(1);
    expect(result[3].projectName).toBe("项目A");
    expect(report.errors).toHaveLength(0);
  });

  it("没有 task 数据时不应报错", () => {
    const activities: Activity[] = [createActivity({ id: 100 })];
    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    expect(report.errors).toHaveLength(0);
    expect(report.migrated).toHaveLength(0);
  });

  it("没有 activity 数据时不应执行迁移，但任务应保留", () => {
    const tasks: Task[] = [
      createTask({
        id: 1000,
        source: "todo",
        sourceId: 1,
        activityTitle: "任务",
      }),
    ];
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    // 由于没有 activity 数据，函数会提前返回，任务应该保持原样
    expect(report.migrated).toHaveLength(0);
  });

  it("混合场景：部分成功迁移，部分删除并记录错误", () => {
    const activities: Activity[] = [createActivity({ id: 100 }), createActivity({ id: 200 })];

    const todos: Todo[] = [
      createTodo({ id: 1, activityId: 100 }), // 有效的
    ];

    const schedules: Schedule[] = [
      createSchedule({ id: 3, activityId: 200 }), // 有效的
    ];

    const tasks: Task[] = [
      createTask({
        id: 1000,
        source: "todo",
        sourceId: 1, // 有效的
        activityTitle: "应该迁移",
      }),
      createTask({
        id: 2000,
        source: "todo",
        sourceId: 999, // 不存在的 todo，应该删除
        activityTitle: "应该删除",
      }),
      createTask({
        id: 3000,
        source: "schedule",
        sourceId: 3, // 有效的
        activityTitle: "应该迁移",
      }),
      createTask({
        id: 4000,
        source: "schedule",
        sourceId: 888, // 不存在的 schedule，应该删除
        activityTitle: "应该删除",
      }),
    ];

    localStorage.setItem(STORAGE_KEYS.ACTIVITY, JSON.stringify(activities));
    localStorage.setItem(STORAGE_KEYS.TODO, JSON.stringify(todos));
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedules));
    localStorage.setItem(STORAGE_KEYS.TASK, JSON.stringify(tasks));

    const report: MigrationReport = { cleaned: [], migrated: [], errors: [] };
    migrateTaskSource(report);

    const result: Task[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.TASK)!);
    // 只有成功关联的任务被保留
    expect(result).toHaveLength(2);
    expect(result[0].source).toBe("activity"); // 成功迁移
    expect(result[0].sourceId).toBe(100);
    expect(result[1].source).toBe("activity"); // 成功迁移
    expect(result[1].sourceId).toBe(200);
    expect(report.migrated.length).toBeGreaterThan(0);
    expect(report.errors.length).toBeGreaterThanOrEqual(2); // 至少2个错误（被删除的任务）

    // 验证 activity.taskId 被同步更新
    const resultActivities: Activity[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.ACTIVITY)!);
    const activity100 = resultActivities.find((a) => a.id === 100);
    const activity200 = resultActivities.find((a) => a.id === 200);
    expect(activity100?.taskId).toBe(1000);
    expect(activity200?.taskId).toBe(3000);
  });
});
