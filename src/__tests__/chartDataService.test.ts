import { describe, it, expect } from "vitest";
import { collectPomodoroData, collectTaskRecordData, aggregateByTime } from "@/services/chartDataService";
import { METRICS } from "@/core/types/Metrics";
import type { Todo } from "@/core/types/Todo";
import type { Task } from "@/core/types/Task";

describe("chartDataService", () => {
  describe("collectPomodoroData", () => {
    it("应该收集已完成Todo的番茄数据", () => {
      const todos: Partial<Todo>[] = [
        {
          id: 1,
          activityId: 100,
          activityTitle: "测试活动",
          priority: 1,
          status: "done",
          doneTime: 1717920000000,
          realPomo: [1, 2, 3], // 总计6个番茄
          pomoType: "🍅",
        },
        {
          id: 2,
          activityId: 100,
          activityTitle: "测试活动",
          priority: 1,
          status: "done",
          doneTime: 1717920000000,
          realPomo: [2, 2], // 总计4个番茄
          pomoType: "🍅",
        },
      ];

      const result = collectPomodoroData(todos as Todo[]);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        metric: METRICS.POMODORO,
        timestamp: 1717920000000,
        value: 6,
        sourceId: 1,
      });
      expect(result[1]).toEqual({
        metric: METRICS.POMODORO,
        timestamp: 1717920000000,
        value: 4,
        sourceId: 2,
      });
    });

    it("应该过滤掉没有realPomo或realPomo为0的Todo", () => {
      const todos: Partial<Todo>[] = [
        {
          id: 1,
          activityId: 100,
          activityTitle: "测试",
          priority: 1,
          status: "", // 未完成  ✅ 有效
          realPomo: [1, 2],
          pomoType: "🍅",
        },
        {
          id: 2,
          activityId: 100,
          activityTitle: "测试",
          priority: 1,
          status: "done",
          doneTime: 1717920000000,
          realPomo: [], // 空数组
          pomoType: "🍅",
        },
        {
          id: 3,
          activityId: 100,
          activityTitle: "测试",
          priority: 1,
          status: "done",
          doneTime: 1717920000000,
          realPomo: [0], // 0个番茄
          pomoType: "🍅",
        },
        {
          id: 4,
          activityId: 100,
          activityTitle: "测试",
          priority: 1,
          status: "done",
          doneTime: 1717920000000,
          realPomo: [1], // ✅ 有效
          pomoType: "🍅",
        },
      ];

      const result = collectPomodoroData(todos as Todo[]);

      expect(result).toHaveLength(2); // 有2一个有效
      expect(result[0].sourceId).toBe(1);
      expect(result[1].sourceId).toBe(4);
    });
  });

  describe("collectTaskRecordData", () => {
    it("应该收集精力值记录", () => {
      const tasks: Partial<Task>[] = [
        {
          id: 100,
          energyRecords: [
            { id: 1717920000000, value: 8 },
            { id: 1717923600000, value: 6 },
          ],
        },
      ];

      const result = collectTaskRecordData(tasks as Task[]);

      expect(result).toContainEqual({
        metric: METRICS.ENERGY,
        timestamp: 1717920000000,
        value: 8,
        sourceId: 100,
      });
      expect(result).toContainEqual({
        metric: METRICS.ENERGY,
        timestamp: 1717923600000,
        value: 6,
        sourceId: 100,
      });
    });

    it("应该收集愉悦值记录", () => {
      const tasks: Partial<Task>[] = [
        {
          id: 101,
          rewardRecords: [{ id: 1717920000000, value: 9 }],
        },
      ];

      const result = collectTaskRecordData(tasks as Task[]);

      expect(result).toContainEqual({
        metric: METRICS.REWARD,
        timestamp: 1717920000000,
        value: 9,
        sourceId: 101,
      });
    });

    it("应该区分外部打扰和内部打扰", () => {
      const tasks: Partial<Task>[] = [
        {
          id: 102,
          interruptionRecords: [
            {
              id: 1717920000000,
              interruptionType: "E",
              description: "客户突然打电话",
              activityType: "T", // 转化为新任务
            },
            {
              id: 1717921000000,
              interruptionType: "I",
              description: "想起要回复邮件",
              activityType: null, // 未转化
            },
            {
              id: 1717922000000,
              interruptionType: "E",
              description: "同事询问问题",
              activityType: "S", // 标记为待定
            },
          ],
        },
      ];

      const result = collectTaskRecordData(tasks as Task[]);

      const externalInterruptions = result.filter((p) => p.metric === METRICS.INTERRUPTION_EXTERNAL);
      const internalInterruptions = result.filter((p) => p.metric === METRICS.INTERRUPTION_INTERNAL);

      // 验证分类
      expect(externalInterruptions).toHaveLength(2);
      expect(internalInterruptions).toHaveLength(1);

      // 验证元数据保留
      const firstExternal = externalInterruptions[0];
      expect(firstExternal.metadata?.description).toBe("客户突然打电话");
      expect(firstExternal.metadata?.activityType).toBe("T");

      const internal = internalInterruptions[0];
      expect(internal.metadata?.description).toBe("想起要回复邮件");
      expect(internal.metadata?.activityType).toBeNull();
    });

    it("应该处理没有记录的Task", () => {
      const tasks: Partial<Task>[] = [{ id: 103 }];

      const result = collectTaskRecordData(tasks as Task[]);

      expect(result).toHaveLength(0);
    });
  });

  describe("aggregateByTime", () => {
    it("应该按天求和", () => {
      const dataPoints = [
        { metric: "pomodoro", timestamp: 1717920000000, value: 3, sourceId: 1 }, // 2024-06-09
        { metric: "pomodoro", timestamp: 1717923600000, value: 5, sourceId: 2 }, // 2024-06-09 (1小时后)
        { metric: "pomodoro", timestamp: 1718006400000, value: 2, sourceId: 3 }, // 2024-06-10
      ];

      const result = aggregateByTime(dataPoints, "day", "sum");

      expect(result.get("2024-06-09")).toBe(8);
      expect(result.get("2024-06-10")).toBe(2);
    });

    it("应该按天求平均", () => {
      const dataPoints = [
        { metric: "energy", timestamp: 1717920000000, value: 8, sourceId: 1 },
        { metric: "energy", timestamp: 1717923600000, value: 6, sourceId: 1 },
        { metric: "energy", timestamp: 1717927200000, value: 4, sourceId: 1 },
      ];

      const result = aggregateByTime(dataPoints, "day", "avg");

      expect(result.get("2024-06-09")).toBe(6); // (8+6+4)/3
    });

    it("应该按天计数", () => {
      const dataPoints = [
        { metric: "interruption_external", timestamp: 1717920000000, value: 1, sourceId: 1 },
        { metric: "interruption_external", timestamp: 1717923600000, value: 1, sourceId: 1 },
        { metric: "interruption_external", timestamp: 1717927200000, value: 1, sourceId: 1 },
      ];

      const result = aggregateByTime(dataPoints, "day", "count");

      expect(result.get("2024-06-09")).toBe(3); // 3条记录
    });

    it("应该处理空数据", () => {
      const result = aggregateByTime([], "day", "sum");

      expect(result.size).toBe(0);
    });

    it("应该按月聚合", () => {
      const dataPoints = [
        { metric: "pomodoro", timestamp: 1717920000000, value: 10, sourceId: 1 }, // 2024-06-09
        { metric: "pomodoro", timestamp: 1718006400000, value: 5, sourceId: 2 }, // 2024-06-10
        { metric: "pomodoro", timestamp: 1720598400000, value: 3, sourceId: 3 }, // 2024-07-10
      ];

      const result = aggregateByTime(dataPoints, "month", "sum");

      expect(result.get("2024-06")).toBe(15);
      expect(result.get("2024-07")).toBe(3);
    });
  });
});
