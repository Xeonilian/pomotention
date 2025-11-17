// __tests__/mocks/testDbData.ts

import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Database } from "@/core/types/Database";

type CloudTodoInsert = Database["public"]["Tables"]["todos"]["Insert"];

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
