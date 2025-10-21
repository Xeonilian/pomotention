// core/types/Chart.ts
/**
 * 时间序列数据点
 */
export interface DataPoint {
  metric: MetricName;
  timestamp: number; // 毫秒时间戳
  value: number;
  sourceId?: number; // 追溯到原始记录（Task.id / Todo.id）

  metadata?: {
    description?: string;
    activityType?: "T" | "S" | null;
    interruptionType?: "E" | "I";
    [key: string]: any;
  };
}

/**
 * 指标定义
 */
export interface MetricDefinition {
  label: string;
  unit: string;
  aggregationType: AggregationType;
  defaultColor: string;
  dataSource: DataSource;
  description?: string;
}

/**
 * 聚合方法
 */
export type AggregationType = "sum" | "avg" | "count" | "last" | "first" | "min" | "max";

/**
 * 时间粒度
 */
export type TimeGranularity = "hour" | "day" | "week" | "month" | "year";

/**
 * 数据来源
 */
export type DataSource = "todo" | "task" | "tag";

/**
 * 日期字符串（ISO格式）
 */
export type DateString = string;

/**
 * 指标名称
 */
export type MetricName = "pomodoro" | "energy" | "reward" | "interruption_external" | "interruption_internal" | "weight" | "sleep" | string;
