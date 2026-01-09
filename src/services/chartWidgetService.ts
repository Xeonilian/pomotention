// services/chartWidgetService.ts
import type { MetricName, DateString, TimeGranularity } from "@/core/types/Chart";
import type { ChartConfig, DateRange } from "@/core/types/ChartConfig";
import type { EChartsOption } from "echarts";
import { METRIC_DEFINITIONS } from "@/core/types/Metrics";
import { getDateRangeBounds } from "@/core/types/ChartConfig";

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
  const xAxis = generateContinuousDateRange(config.dateRange, config.timeGranularity);

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
 * @param dateRange 日期范围配置
 * @param timeGranularity 时间粒度
 * @returns 连续日期数组（格式根据粒度而定）
 */
function generateContinuousDateRange(dateRange: DateRange, timeGranularity: TimeGranularity): string[] {
  const { start, end } = getDateRangeBounds(dateRange);
  const dates: string[] = [];
  const current = new Date(start);
  const endDate = new Date(end);

  while (current <= endDate) {
    dates.push(formatDateByGranularity(current, timeGranularity));

    // 根据粒度递增
    switch (timeGranularity) {
      case "hour":
        current.setHours(current.getHours() + 1);
        break;
      case "day":
        current.setDate(current.getDate() + 1);
        break;
      case "week":
        current.setDate(current.getDate() + 7);
        break;
      case "month":
        current.setMonth(current.getMonth() + 1);
        break;
      case "year":
        current.setFullYear(current.getFullYear() + 1);
        break;
    }
  }

  return dates;
}

/**
 * 根据时间粒度格式化日期
 */
function formatDateByGranularity(date: Date, granularity: TimeGranularity): DateString {
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
 * 获取ISO周数
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * 格式化日期字符串用于显示（X轴标签）
 */
function formatDateLabelForDisplay(value: string, granularity: TimeGranularity): string {
  switch (granularity) {
    case "hour":
      // "2024-06-09T14:00" -> "14:00"
      const parts = value.split("T");
      return parts.length === 2 ? parts[1] : value;

    case "day":
      // "2024-06-09" -> "06-09"
      const dateParts = value.split("-");
      return dateParts.length === 3 ? `${dateParts[1]}-${dateParts[2]}` : value;

    case "week":
      // "2024-W23" -> "W23"
      return value.split("-")[1] || value;

    case "month":
      // "2024-06" -> "06月"
      const monthParts = value.split("-");
      return monthParts.length === 2 ? `${monthParts[1]}月` : value;

    case "year":
      // "2024" -> "2024"
      return value;

    default:
      return value;
  }
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
      bottom: 0, // 底边位置
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: config.showLegend ? "15%" : "10%",
      // 使用 outerBounds 替代 containLabel（新 API）
      // 或者通过调整 left/right 百分比来预留标签空间
    },
    xAxis: {
      type: "category",
      data: chartData.xAxis,
      axisLabel: {
        rotate: 45,
        fontSize: 11,
        interval: "auto",
        formatter: (value: string) => formatDateLabelForDisplay(value, config.timeGranularity),
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
export function filterByDateRange(data: Map<DateString, number>, dateRange: DateRange): Map<DateString, number> {
  const { start, end } = getDateRangeBounds(dateRange);
  const filtered = new Map<DateString, number>();

  data.forEach((value, date) => {
    const timestamp = new Date(date).getTime();
    if (timestamp >= start && timestamp <= end) {
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
export function generateHeatmapData(data: Map<DateString, number>, dateRange: DateRange): HeatmapData[] {
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
