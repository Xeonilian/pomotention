import type { MetricName } from "@/core/types/Chart";
import type { ChartConfig } from "@/core/types/ChartConfig";
import { METRIC_DEFINITIONS } from "@/core/types/Metrics";

/**
 * ECharts 数据系列
 */
export interface ChartSeries {
  name: string;
  type: "line" | "bar";
  data: number[];
  color?: string;
  smooth?: boolean;
  stack?: string;
}

/**
 * ECharts 配置数据
 */
export interface ChartData {
  xAxis: string[];
  series: ChartSeries[];
}

/**
 * 转换聚合数据为 ECharts 格式
 */
export function convertToChartData(dataByMetric: Map<MetricName, Map<string, number>>, config: ChartConfig): ChartData {
  // 收集所有日期并排序
  const allDates = new Set<string>();
  dataByMetric.forEach((data) => {
    data.forEach((_, date) => allDates.add(date));
  });

  const xAxis = Array.from(allDates).sort();

  // 为每个指标生成系列
  const series: ChartSeries[] = config.metrics.map((metric) => {
    const metricConfig = METRIC_DEFINITIONS[metric];
    const data = dataByMetric.get(metric) || new Map();

    return {
      name: metricConfig.label,
      type: config.type === "line" ? "line" : "bar",
      data: xAxis.map((date) => data.get(date) || 0),
      color: metricConfig.defaultColor,
      smooth: config.type === "line",
      stack: config.stacked ? "total" : undefined,
    };
  });

  return { xAxis, series };
}

/**
 * 过滤日期范围内的数据
 */
export function filterByDateRange(data: Map<string, number>, dateRange: number): Map<string, number> {
  const now = Date.now();
  const startTime = now - dateRange * 24 * 60 * 60 * 1000;

  const filtered = new Map<string, number>();

  data.forEach((value, date) => {
    const timestamp = new Date(date).getTime();
    if (timestamp >= startTime) {
      filtered.set(date, value);
    }
  });

  return filtered;
}

/**
 * 生成热力图数据
 */
export interface HeatmapData {
  date: string;
  value: number;
}

export function generateHeatmapData(data: Map<string, number>, dateRange: number = 365): HeatmapData[] {
  const filtered = filterByDateRange(data, dateRange);

  return Array.from(filtered.entries()).map(([date, value]) => ({
    date,
    value,
  }));
}
