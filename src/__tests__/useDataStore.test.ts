import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useDataStore } from "@/stores/useDataStore";
import { METRICS } from "@/core/types/Metrics";
import type { Todo } from "@/core/types/Todo";
import type { Task } from "@/core/types/Task";

// 👇 Mock localStorageService
vi.mock("@/services/localStorageService", () => ({
  loadActivities: vi.fn(() => []),
  loadTodos: vi.fn(() => []),
  loadSchedules: vi.fn(() => []),
  loadTasks: vi.fn(() => []),
  loadTags: vi.fn(() => []), // 👈 新增
  saveActivities: vi.fn(),
  saveTodos: vi.fn(),
  saveSchedules: vi.fn(),
  saveTasks: vi.fn(),
  saveTags: vi.fn(), // 👈 新增
}));

describe("useDataStore - 图表数据功能", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("应该正确收集番茄数据", () => {
    const dataStore = useDataStore();

    const todos: Partial<Todo>[] = [
      {
        id: 1,
        activityId: 100,
        activityTitle: "测试",
        priority: 1,
        status: "done",
        doneTime: 1749447475938,
        realPomo: [1, 4], // 5个番茄
        pomoType: "🍅",
      },
      {
        id: 2,
        activityId: 100,
        activityTitle: "测试",
        priority: 1,
        status: "done",
        doneTime: 1749526421608,
        realPomo: [1], // 1个番茄
        pomoType: "🍅",
      },
    ];

    // 直接修改 todoList
    dataStore.todoList = todos as Todo[];

    // 验证数据点收集
    const pomodoroPoints = dataStore.dataByMetric.get(METRICS.POMODORO);
    expect(pomodoroPoints).toHaveLength(2);
    expect(pomodoroPoints?.[0].value).toBe(5);
    expect(pomodoroPoints?.[1].value).toBe(1);
  });

  it("应该正确收集 Task 记录数据", () => {
    const dataStore = useDataStore();

    const tasks: Partial<Task>[] = [
      {
        id: 100,
        energyRecords: [
          { id: 1717920000000, value: 8 },
          { id: 1717923600000, value: 6 },
        ],
        rewardRecords: [{ id: 1717920000000, value: 9 }],
        interruptionRecords: [
          {
            id: 1717920000000,
            interruptionType: "E",
            description: "测试打扰",
            activityType: null,
          },
        ],
      },
    ];

    dataStore.taskList = tasks as Task[];

    // 验证精力值
    expect(dataStore.dataByMetric.get(METRICS.ENERGY)).toHaveLength(2);

    // 验证愉悦值
    expect(dataStore.dataByMetric.get(METRICS.REWARD)).toHaveLength(1);

    // 验证外部打扰
    expect(dataStore.dataByMetric.get(METRICS.INTERRUPTION_EXTERNAL)).toHaveLength(1);
  });

  it("应该按天聚合数据", () => {
    const dataStore = useDataStore();

    const todos: Partial<Todo>[] = [
      {
        id: 1,
        activityId: 100,
        activityTitle: "测试",
        priority: 1,
        status: "done",
        doneTime: 1717920000000, // 2024-06-09
        realPomo: [3],
        pomoType: "🍅",
      },
      {
        id: 2,
        activityId: 100,
        activityTitle: "测试",
        priority: 1,
        status: "done",
        doneTime: 1717923600000, // 2024-06-09（1小时后）
        realPomo: [5],
        pomoType: "🍅",
      },
      {
        id: 3,
        activityId: 100,
        activityTitle: "测试",
        priority: 1,
        status: "done",
        doneTime: 1718006400000, // 2024-06-10
        realPomo: [2],
        pomoType: "🍅",
      },
    ];

    dataStore.todoList = todos as Todo[];

    const aggregated = dataStore.getAggregatedData(METRICS.POMODORO, "day", "sum");

    expect(aggregated.get("2024-06-09")).toBe(8); // 3+5
    expect(aggregated.get("2024-06-10")).toBe(2);
  });

  it("应该按日期范围过滤数据", () => {
    const dataStore = useDataStore();

    const todos: Partial<Todo>[] = [
      {
        id: 1,
        activityId: 100,
        activityTitle: "测试",
        priority: 1,
        status: "done",
        doneTime: 1717920000000,
        realPomo: [3],
        pomoType: "🍅",
      },
      {
        id: 2,
        activityId: 100,
        activityTitle: "测试",
        priority: 1,
        status: "done",
        doneTime: 1718006400000,
        realPomo: [2],
        pomoType: "🍅",
      },
    ];

    dataStore.todoList = todos as Todo[];

    const filtered = dataStore.getDataInRange(METRICS.POMODORO, 1717920000000, 1717920000000);

    expect(filtered).toHaveLength(1);
    expect(filtered[0].value).toBe(3);
  });
});
