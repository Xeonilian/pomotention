// src/services/chatDataService.ts
import type { Todo } from "@/core/types/Todo";
import type { Task } from "@/core/types/Task";
import type { DataPoint, TimeGranularity, AggregationType, DateString } from "@/core/types/Chart";
import { METRICS } from "@/core/types/Metrics";

// ============ 数据收集 ============

/**
 * 从Todo收集番茄数据
 * realPomo: [1,3,4] → 总和8个番茄
 */
export function collectPomodoroData(todos: Todo[]): DataPoint[] {
  return todos
    .filter((t) => t.realPomo && t.realPomo.length > 0 && t.pomoType === "🍅")
    .map((t) => ({
      metric: METRICS.POMODORO,
      timestamp: t.doneTime || t.id,
      value: t.realPomo!.reduce((sum, pomo) => sum + pomo, 0),
      sourceId: t.id,
    }))
    .filter((point) => point.value > 0);
}

/**
 * 从Task收集所有记录数据
 * 包括：精力值、愉悦值、外部打扰、内部打扰
 */
export function collectTaskRecordData(tasks: Task[]): DataPoint[] {
  const dataPoints: DataPoint[] = [];

  tasks.forEach((task) => {
    // 1. 精力值记录（可能多条）
    task.energyRecords?.forEach((record) => {
      dataPoints.push({
        metric: METRICS.ENERGY,
        timestamp: record.id,
        value: record.value,
        sourceId: task.id,
      });
    });

    // 2. 愉悦值记录（可能多条）
    task.rewardRecords?.forEach((record) => {
      dataPoints.push({
        metric: METRICS.REWARD,
        timestamp: record.id,
        value: record.value,
        sourceId: task.id,
      });
    });

    // 3. 打扰记录（按类型分别统计）
    task.interruptionRecords?.forEach((record) => {
      const metric = record.interruptionType === "E" ? METRICS.INTERRUPTION_EXTERNAL : METRICS.INTERRUPTION_INTERNAL;

      dataPoints.push({
        metric,
        timestamp: record.id,
        value: 1, // 每条记录计为1次
        sourceId: task.id,
        metadata: {
          // 👈 保存完整信息
          description: record.description,
          activityType: record.activityType,
          interruptionType: record.interruptionType,
        },
      });
    });
  });

  return dataPoints;
}

// ============ 数据聚合 ============

/**
 * 按时间粒度聚合数据点
 *
 * @example
 * aggregateByTime(points, 'day', 'sum')
 * → Map { '2025-06-09' => 5, '2025-06-10' => 3 }
 */
export function aggregateByTime(
  dataPoints: DataPoint[],
  timeGranularity: TimeGranularity,
  aggregationMethod: AggregationType
): Map<DateString, number> {
  // 1. 按时间分组
  const groups = new Map<DateString, DataPoint[]>();

  dataPoints.forEach((point) => {
    const key = getTimeBucket(point.timestamp, timeGranularity);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(point);
  });

  // 2. 对每组应用聚合函数
  const result = new Map<DateString, number>();

  groups.forEach((points, key) => {
    result.set(key, applyAggregation(points, aggregationMethod));
  });

  return result;
}

/**
 * 根据时间粒度获取时间桶的键
 */
function getTimeBucket(timestamp: number, granularity: TimeGranularity): DateString {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  switch (granularity) {
    case "hour":
      const hour = String(date.getHours()).padStart(2, "0");
      return `${year}-${month}-${day}T${hour}:00`;

    case "day":
      return `${year}-${month}-${day}`;

    case "week":
      const weekNumber = getWeekNumber(date);
      return `${year}-W${String(weekNumber).padStart(2, "0")}`;

    case "month":
      return `${year}-${month}`;

    case "year":
      return `${year}`;

    default:
      return `${year}-${month}-${day}`;
  }
}

/**
 * 应用聚合方法
 */
function applyAggregation(points: DataPoint[], method: AggregationType): number {
  if (points.length === 0) return 0;

  const values = points.map((p) => p.value);

  switch (method) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);

    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;

    case "count":
      return points.length; // 计数数据点的个数

    case "last":
      return points[points.length - 1].value;

    case "first":
      return points[0].value;

    case "min":
      return Math.min(...values);

    case "max":
      return Math.max(...values);

    default:
      return 0;
  }
}

/**
 * 获取ISO周数
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}
