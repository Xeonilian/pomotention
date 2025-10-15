// core/types/ChartConfig.ts

import type { MetricName } from "@/core/types/Chart";
import type { TimeGranularity, AggregationType } from "./Chart";

/**
 * 图表类型
 */
export type ChartType = "line" | "bar" | "heatmap";

/**
 * 图表配置
 */
export interface ChartConfig {
  /** 图表类型 */
  type: ChartType;

  /** 显示的指标 */
  metrics: MetricName[];

  /** 时间粒度 */
  timeGranularity: TimeGranularity;

  /** 聚合方式 */
  aggregationType: AggregationType;

  /** 时间范围（天数） */
  dateRange: number;

  /** 图表标题 */
  title?: string;

  /** 是否显示图例 */
  showLegend?: boolean;

  /** 是否堆叠显示（用于多指标） */
  stacked?: boolean;
}

/**
 * 默认图表配置
 */
export const DEFAULT_CHART_CONFIG: ChartConfig = {
  type: "line",
  metrics: [],
  timeGranularity: "day",
  aggregationType: "sum",
  dateRange: 30,
  showLegend: true,
  stacked: false,
};
