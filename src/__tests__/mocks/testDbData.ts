// __tests__/mocks/testDbData.ts

import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Database } from "@/core/types/Database";
import type { Schedule } from "@/core/types/Schedule";

type CloudTodoInsert = Database["public"]["Tables"]["todos"]["Insert"];
type CloudScheduleInsert = Database["public"]["Tables"]["schedules"]["Insert"];

/** Supabase 2.110+ rpc/select 成功响应 mock */
export function mockPostgrestOk<T>(data: T) {
  return {
    data,
    error: null,
    count: null,
    status: 200,
    statusText: "OK",
    success: true as const,
  };
}

/**
 * 创建测试用 Activity
 */
export function createMockActivity(overrides?: Partial<Activity>): Activity {
  return {
    id: Date.now(),
    title: "Test Activity",
    class: "S",
    parentId: 0,
    lastModified: Date.now(),
    synced: true,
    deleted: false,
    ...overrides,
  };
}

/**
 * 创建测试用 Todo（本地格式，完整版）
 */
export function createMockTodo(overrides?: Partial<Todo>): Todo {
  const now = Date.now();
  return {
    id: now,
    activityId: 9999,
    activityTitle: "Test Activity",
    projectName: "Test Project",
    taskId: 8888,
    estPomo: [25, 5],
    realPomo: [0, 0],
    status: "ongoing",
    priority: 1,
    pomoType: "🍅",
    dueDate: 0,
    doneTime: 0,
    startTime: 0,
    interruption: "I",
    globalIndex: 0,
    lastModified: now,
    synced: false,
    deleted: false,
    ...overrides,
  };
}

/**
 * 创建测试用 RPC 返回数据（get_full_todos）
 * 包含冗余字段：activityTitle, projectName, taskId, pomoType, interruption, dueDate
 */
export function createMockFullTodoFromCloud(overrides?: Partial<any>): any {
  const now = Date.now();
  return {
    // todos 表字段
    id: now,
    activityId: 9999,
    estPomo: [25, 5],
    realPomo: [0, 0],
    status: "ongoing",
    priority: 1,
    doneTime: 0,
    startTime: 0,
    globalIndex: 0,

    // 冗余字段（来自 activities JOIN）
    activityTitle: "Test Activity",
    projectName: "Test Project",
    taskId: 8888,
    pomoType: "🍅",
    dueDate: 0,
    interruption: "I",
    deleted: false,
    last_modified: new Date(now).toISOString(),

    ...overrides,
  };
}

/**
 * 创建测试用云端 Todo Insert（用于验证 mapLocalToCloud）
 */
export function createMockCloudTodoInsert(overrides?: Partial<CloudTodoInsert>): CloudTodoInsert {
  const now = Date.now();
  return {
    user_id: "user-123",
    timestamp_id: now,
    activity_id: 9999,
    est_pomo: [25, 5],
    real_pomo: [0, 0],
    status: "ongoing",
    priority: 1,
    done_time: 0,
    start_time: 0,
    global_index: 0,
    deleted: false,
    ...overrides,
  };
}

/**
 * 批量创建测试用 Todo
 */
export function createMockTodos(count: number, baseOverrides?: Partial<Todo>): Todo[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) =>
    createMockTodo({
      id: now + i * 1000,
      activityTitle: `Activity ${i + 1}`,
      priority: i + 1,
      synced: i % 2 === 0,
      ...baseOverrides,
    })
  );
}

/**
 * 创建未同步的 Todo（synced=false）
 */
export function createUnsyncedTodo(overrides?: Partial<Todo>): Todo {
  return createMockTodo({
    synced: false,
    ...overrides,
  });
}

/**
 * 创建已删除的 Todo（deleted=true）
 */
export function createDeletedTodo(overrides?: Partial<Todo>): Todo {
  return createMockTodo({
    deleted: true,
    synced: false,
    ...overrides,
  });
}

/**
 * 创建测试用 Schedule（本地格式，完整版）
 */
export function createMockSchedule(overrides?: Partial<Schedule>): Schedule {
  const now = Date.now();
  return {
    id: now,
    activityId: 9999,
    activityTitle: "Test Activity",
    activityDueRange: [now, "30"],
    taskId: 8888,
    status: "ongoing",
    projectName: "Test Project",
    location: "Test Location",
    doneTime: 0,
    isUntaetigkeit: false,
    interruption: "I",
    lastModified: now,
    synced: false,
    deleted: false,
    ...overrides,
  };
}

/**
 * 创建测试用 RPC 返回数据（get_full_schedules）
 * 包含冗余字段：activityTitle, activityDueRange, taskId, location, isUntaetigkeit, interruption, projectName
 */
export function createMockFullScheduleFromCloud(overrides?: Partial<any>): any {
  const now = Date.now();
  return {
    // schedules 表字段
    id: now,
    activityId: 9999,
    status: "ongoing",
    doneTime: 0,

    // 冗余字段（来自 activities JOIN）
    activityTitle: "Test Activity",
    activityDueRange: [now, "30"],
    taskId: 8888,
    location: "Test Location",
    isUntaetigkeit: false,
    interruption: "I",
    projectName: "Test Project",
    deleted: false,
    last_modified: new Date(now).toISOString(),

    ...overrides,
  };
}

/**
 * 批量创建测试用 Schedule
 */
export function createMockSchedules(count: number, baseOverrides?: Partial<Schedule>): Schedule[] {
  const now = Date.now();
  return Array.from({ length: count }, (_, i) =>
    createMockSchedule({
      id: now + i * 1000,
      activityTitle: `Activity ${i + 1}`,
      synced: i % 2 === 0,
      ...baseOverrides,
    })
  );
}

/**
 * 创建未同步的 Schedule（synced=false）
 */
export function createUnsyncedSchedule(overrides?: Partial<Schedule>): Schedule {
  return createMockSchedule({
    synced: false,
    ...overrides,
  });
}

/**
 * 创建已删除的 Schedule（deleted=true）
 */
export function createDeletedSchedule(overrides?: Partial<Schedule>): Schedule {
  return createMockSchedule({
    deleted: true,
    synced: false,
    ...overrides,
  });
}

/**
 * 创建测试用云端 Schedule Insert（用于验证 mapLocalToCloud）
 */
export function createMockCloudScheduleInsert(overrides?: Partial<CloudScheduleInsert>): CloudScheduleInsert {
  const now = Date.now();
  return {
    user_id: "user-123",
    timestamp_id: now,
    activity_id: 9999,
    status: "ongoing",
    done_time: 0,
    deleted: false,
    ...overrides,
  };
}
