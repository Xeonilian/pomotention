// core/types/Chart.ts
/**
 * 时间序列数据点
 */
export interface DataPoint {
  metric: MetricName;
  timestamp: number; // 毫秒时间戳
  value: number;
  sourceId?: number; // 追溯到原始记录（Task.id / Todo.id）

  // 附加元数据（可选）
  metadata?: {
    description?: string;
    activityType?: "T" | "S" | null;
    interruptionType?: "E" | "I";
    // 未来可扩展其他字段
    [key: string]: any;
  };
}

/**
 * 指标定义
 */
export interface MetricDefinition {
  label: string; // 显示名称
  unit: string; // 单位
  aggregationType: AggregationType; // 默认聚合方式
  defaultColor: string; // 默认颜色
  dataSource: DataSource; // 数据来源
  description?: string; // 说明文本
}

/**
 * 聚合方法
 */
export type AggregationType =
  | "sum" // 求和（番茄数）
  | "avg" // 平均值（精力值、愉悦值）
  | "count" // 计数（打扰次数、记录条数）
  | "last" // 最后一个值（体重）
  | "first" // 第一个值
  | "min" // 最小值
  | "max"; // 最大值

/**
 * 时间粒度
 */
export type TimeGranularity =
  | "hour" // 小时
  | "day" // 天
  | "week" // 周
  | "month" // 月
  | "year"; // 年

/**
 * 数据来源
 */
export type DataSource = "todo" | "task" | "tag";

/**
 * 指标名称（可扩展）
 */
export type MetricName =
  // Todo来源
  | "pomodoro" // 番茄数

  // Task来源
  | "energy" // 精力值
  | "reward" // 愉悦值
  | "interruption_external" // 外部打扰（E）
  | "interruption_internal" // 内部打扰（I）

  // Tag来源（未来）
  | "weight"
  | "sleep"
  | string; // 允许动态Tag

/**
 * 日期字符串（ISO格式）
 */
export type DateString = string; // 'YYYY-MM-DD' 或 'YYYY-MM' 或 'YYYY-WW' 等
