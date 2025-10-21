// services/chartWidgetService.ts
import type { MetricName, DateString } from "@/core/types/Chart";
import type { ChartConfig } from "@/core/types/ChartConfig";
import type { EChartsOption } from "echarts";
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
  yAxisIndex?: number;
}

/**
 * ECharts 图表数据
 */
export interface ChartData {
  xAxis: string[];
  series: ChartSeries[];
}

/**
 * 转换聚合数据为 ECharts 系列格式
 */
export function convertToChartData(dataByMetric: Map<MetricName, Map<DateString, number>>, config: ChartConfig): ChartData {
  // 生成连续日期范围
  const xAxis = generateContinuousDateRange(config.dateRange);

  // 为每个指标生成系列
  const series: ChartSeries[] = config.metrics.map((metricConfig) => {
    const metricDef = METRIC_DEFINITIONS[metricConfig.name];
    const data = dataByMetric.get(metricConfig.name) || new Map();

    return {
      name: metricDef.label,
      type: config.type === "line" ? "line" : "bar",
      data: xAxis.map((date) => data.get(date) || 0),
      color: metricConfig.color || metricDef.defaultColor,
      smooth: config.type === "line",
      stack: config.stacked ? "total" : undefined,
      yAxisIndex: metricConfig.yAxisIndex,
    };
  });

  return { xAxis, series };
}

/**
 * 生成连续日期范围
 * @param dateRange 天数范围
 * @returns 连续日期数组 ['YYYY-MM-DD', ...]
 */
function generateContinuousDateRange(dateRange: number): string[] {
  const dates: string[] = [];
  const today = new Date();

  for (let i = dateRange - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(formatDateString(date));
  }

  return dates;
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * 生成完整的 ECharts 配置
 */
export function generateEChartsOption(config: ChartConfig, dataByMetric: Map<MetricName, Map<DateString, number>>): EChartsOption {
  const chartData = convertToChartData(dataByMetric, config);

  const baseOption: EChartsOption = {
    title: {
      text: config.title,
      left: "center",
      textStyle: {
        fontSize: 16,
        fontWeight: "bold",
      },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: {
        type: config.type === "bar" ? "shadow" : "line",
      },
    },
    legend: {
      show: config.showLegend,
      bottom: 10,
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: config.showLegend ? "15%" : "10%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: chartData.xAxis,
      axisLabel: {
        rotate: 45,
        fontSize: 11,
        interval: "auto", // ← 新增
        formatter: (value: string) => {
          // ← 新增：格式化为 MM-DD
          const parts = value.split("-");
          return parts.length === 3 ? `${parts[1]}-${parts[2]}` : value;
        },
      },
    },
    yAxis: {
      type: "value",
    },
    series: chartData.series.map((s) => ({
      ...s,
      emphasis: {
        focus: "series",
      },
      label: {
        show: false,
      },
    })),
  };

  // 深度合并用户自定义配置
  return deepMerge(baseOption, config.echartsOptions || {});
}

/**
 * 过滤日期范围内的数据
 */
export function filterByDateRange(data: Map<DateString, number>, dateRange: number): Map<DateString, number> {
  const now = Date.now();
  const startTime = now - dateRange * 24 * 60 * 60 * 1000;

  const filtered = new Map<DateString, number>();

  data.forEach((value, date) => {
    const timestamp = new Date(date).getTime();
    if (timestamp >= startTime) {
      filtered.set(date, value);
    }
  });

  return filtered;
}

/**
 * 热力图数据格式
 */
export interface HeatmapData {
  date: string;
  value: number;
}

/**
 * 生成热力图数据
 */
export function generateHeatmapData(data: Map<DateString, number>, dateRange: number = 365): HeatmapData[] {
  const filtered = filterByDateRange(data, dateRange);

  return Array.from(filtered.entries()).map(([date, value]) => ({
    date,
    value,
  }));
}

/**
 * 深度合并对象
 */
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  Object.keys(source).forEach((key) => {
    const sourceValue = source[key as keyof T];
    const targetValue = result[key as keyof T];

    if (isObject(sourceValue) && isObject(targetValue)) {
      result[key as keyof T] = deepMerge(targetValue as Record<string, any>, sourceValue as Record<string, any>) as T[keyof T];
    } else {
      result[key as keyof T] = sourceValue as T[keyof T];
    }
  });

  return result;
}

/**
 * 判断是否为普通对象
 */
function isObject(value: any): value is Record<string, any> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
