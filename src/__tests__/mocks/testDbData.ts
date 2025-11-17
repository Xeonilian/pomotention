// __tests__/mocks/testData.ts

import type { Activity } from '@/core/types/Activity';
import type { Todo } from '@/core/types/Todo';

/**
 * 创建测试用 Activity
 */
export function createMockActivity(overrides?: Partial<Activity>): Activity {
  return {
    id: Date.now(),
    title: 'Test Activity',
    class: 'S',
    parentId: 0,
    lastModified: Date.now(),
    synced: true,
    deleted: false,
    ...overrides,
  };
}

/**
 * 创建测试用 Todo
 */
export function createMockTodo(overrides?: Partial<Todo>): Todo {
  return {
    id: Date.now(),
    activityId: 1000,
    activityTitle: 'Test Activity',
    priority: 1,
    lastModified: Date.now(),
    synced: true,
    deleted: false,
    ...overrides,
  };
}