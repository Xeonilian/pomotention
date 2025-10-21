import type { MetricName, TimeGranularity, AggregationType } from "./Chart";

/**
 * 图表类型
 */
export type ChartType = "line" | "bar" | "heatmap";

/**
 * 指标配置（覆盖默认行为）
 */
export interface MetricConfig {
  /** 指标名称 */
  name: MetricName;

  /** 自定义聚合方式（覆盖 MetricDefinition 中的默认值） */
  aggregationType?: AggregationType;

  /** 自定义颜色（覆盖默认颜色） */
  color?: string;

  /** Y轴索引（用于多Y轴场景） */
  yAxisIndex?: number;
}

/**
 * 图表配置
 */
export interface ChartConfig {
  /** 图表类型 */
  type: ChartType;

  /** 显示的指标列表 */
  metrics: MetricConfig[];

  /** 时间粒度 */
  timeGranularity: TimeGranularity;

  /** 时间范围（天数） */
  dateRange: number;

  /** 图表标题 */
  title?: string;

  /** 是否显示图例 */
  showLegend?: boolean;

  /** 是否堆叠显示（用于多指标） */
  stacked?: boolean;

  /** 自定义 ECharts 配置（深度合并） */
  echartsOptions?: Record<string, any>; // 改为宽松类型
}

/**
 * 创建图表配置的工具函数
 * 支持简写语法和完整配置混用
 */
export function createChartConfig(metrics: (MetricName | MetricConfig)[], overrides?: Partial<Omit<ChartConfig, "metrics">>): ChartConfig {
  const normalizedMetrics = metrics.map((m) => (typeof m === "string" ? { name: m } : m));

  return {
    type: "line",
    metrics: normalizedMetrics,
    timeGranularity: "day",
    dateRange: 30,
    showLegend: true,
    stacked: false,
    ...overrides,
  };
}
