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
 * 时间单位
 */
export type TimeUnit = "day" | "week" | "month" | "year";

/**
 * 时间范围配置
 */
export type DateRange =
  | { type: "current"; unit: TimeUnit } // 当前周期（今天、本周、本月、今年）
  | { type: "offset"; unit: TimeUnit; value: number } // 偏移周期（上周=-1、下周=1）
  | { type: "last"; unit: TimeUnit; count: number } // 最近N个单位（最近7天、最近3个月）
  | { type: "custom"; startDate: number; endDate: number }; // 自定义范围

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

  /** 时间范围 */
  dateRange: DateRange;

  /** 图表标题 */
  title?: string;

  /** 是否显示图例 */
  showLegend?: boolean;

  /** 是否堆叠显示（用于多指标） */
  stacked?: boolean;

  /** 自定义 ECharts 配置（深度合并） */
  echartsOptions?: Record<string, any>;
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
    dateRange: { type: "last", unit: "day", count: 30 }, // 默认最近30天
    showLegend: true,
    stacked: false,
    ...overrides,
  };
}

/**
 * 根据 DateRange 计算实际的起止时间戳
 */
export function getDateRangeBounds(range: DateRange): { start: number; end: number } {
  const now = new Date();
  let start: Date;
  let end: Date;

  if (range.type === "current") {
    // 当前周期（今天、本周、本月、今年）
    switch (range.unit) {
      case "day":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        break;

      case "week":
        const dayOfWeek = now.getDay() || 7; // 周日=7
        start = new Date(now);
        start.setDate(start.getDate() - dayOfWeek + 1); // 周一
        start.setHours(0, 0, 0, 0);
        end = new Date(start);
        end.setDate(end.getDate() + 6); // 周日
        end.setHours(23, 59, 59, 999);
        break;

      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59); // 本月最后一天
        break;

      case "year":
        start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
    }
  } else if (range.type === "offset") {
    // 偏移周期（上个月、下周、去年等）
    const offset = range.value;

    switch (range.unit) {
      case "day":
        const targetDay = new Date(now);
        targetDay.setDate(targetDay.getDate() + offset);
        start = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), 0, 0, 0);
        end = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), 23, 59, 59);
        break;

      case "week":
        const currentDayOfWeek = now.getDay() || 7; // 周日=7
        const targetWeekStart = new Date(now);
        targetWeekStart.setDate(targetWeekStart.getDate() - currentDayOfWeek + 1 + offset * 7); // 周一
        targetWeekStart.setHours(0, 0, 0, 0);

        start = targetWeekStart;
        end = new Date(targetWeekStart);
        end.setDate(end.getDate() + 6); // 周日
        end.setHours(23, 59, 59, 999);
        break;

      case "month":
        start = new Date(now.getFullYear(), now.getMonth() + offset, 1, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0, 23, 59, 59); // 月末
        break;

      case "year":
        start = new Date(now.getFullYear() + offset, 0, 1, 0, 0, 0);
        end = new Date(now.getFullYear() + offset, 11, 31, 23, 59, 59);
        break;
    }
  } else if (range.type === "last") {
    // 最近N个单位（最近7天、最近3个月等）
    end = new Date(now);
    end.setHours(23, 59, 59, 999);

    start = new Date(end);

    switch (range.unit) {
      case "day":
        start.setDate(start.getDate() - range.count + 1);
        break;
      case "week":
        start.setDate(start.getDate() - range.count * 7 + 1);
        break;
      case "month":
        start.setMonth(start.getMonth() - range.count + 1);
        start.setDate(1); // 月初
        break;
      case "year":
        start.setFullYear(start.getFullYear() - range.count + 1);
        start.setMonth(0, 1); // 年初
        break;
    }

    start.setHours(0, 0, 0, 0);
  } else {
    // 自定义范围
    start = new Date(range.startDate);
    end = new Date(range.endDate);
  }

  return {
    start: start.getTime(),
    end: end.getTime(),
  };
}

/**
 * 时间范围快捷预设
 */
export const DateRangePresets = {
  // 当前周期
  today: (): DateRange => ({ type: "current", unit: "day" }),
  thisWeek: (): DateRange => ({ type: "current", unit: "week" }),
  thisMonth: (): DateRange => ({ type: "current", unit: "month" }),
  thisYear: (): DateRange => ({ type: "current", unit: "year" }),

  // 偏移周期
  yesterday: (): DateRange => ({ type: "offset", unit: "day", value: -1 }),
  tomorrow: (): DateRange => ({ type: "offset", unit: "day", value: 1 }),
  lastWeek: (): DateRange => ({ type: "offset", unit: "week", value: -1 }),
  nextWeek: (): DateRange => ({ type: "offset", unit: "week", value: 1 }),
  lastMonth: (): DateRange => ({ type: "offset", unit: "month", value: -1 }),
  nextMonth: (): DateRange => ({ type: "offset", unit: "month", value: 1 }),
  lastYear: (): DateRange => ({ type: "offset", unit: "year", value: -1 }),
  nextYear: (): DateRange => ({ type: "offset", unit: "year", value: 1 }),

  // 最近N个单位
  last7Days: (): DateRange => ({ type: "last", unit: "day", count: 7 }),
  last30Days: (): DateRange => ({ type: "last", unit: "day", count: 30 }),
  last90Days: (): DateRange => ({ type: "last", unit: "day", count: 90 }),
  last3Months: (): DateRange => ({ type: "last", unit: "month", count: 3 }),
  last6Months: (): DateRange => ({ type: "last", unit: "month", count: 6 }),
  last12Months: (): DateRange => ({ type: "last", unit: "month", count: 12 }),

  // 自定义
  custom: (startDate: number, endDate: number): DateRange => ({
    type: "custom",
    startDate,
    endDate,
  }),
};
