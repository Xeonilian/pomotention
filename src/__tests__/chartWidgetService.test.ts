import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { convertToChartData, filterByDateRange, generateHeatmapData } from "@/services/chartWidgetService";
import { METRICS } from "@/core/types/Metrics";
import { createChartConfig, DateRangePresets } from "@/core/types/ChartConfig";

describe("chartViewService", () => {
  // 固定时间用于测试
  const FIXED_DATE = new Date("2024-06-15T12:00:00Z");

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_DATE);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("应该正确转换为 ECharts 折线图数据", () => {
    const dataByMetric = new Map([
      [
        METRICS.POMODORO,
        new Map([
          ["2024-06-09", 5],
          ["2024-06-10", 3],
        ]),
      ],
      [
        METRICS.ENERGY,
        new Map([
          ["2024-06-09", 8],
          ["2024-06-10", 7],
        ]),
      ],
    ]);

    // 使用自定义范围确保测试稳定
    const config = createChartConfig([METRICS.POMODORO, METRICS.ENERGY], {
      type: "line",
      timeGranularity: "day",
      dateRange: {
        type: "custom",
        startDate: new Date("2024-06-09T00:00:00Z").getTime(),
        endDate: new Date("2024-06-10T23:59:59Z").getTime(),
      },
      stacked: false,
    });

    const result = convertToChartData(dataByMetric, config);

    expect(result.xAxis).toEqual(["2024-06-09", "2024-06-10"]);
    expect(result.series).toHaveLength(2);
    expect(result.series[0].name).toBe("番茄数");
    expect(result.series[0].data).toEqual([5, 3]);
    expect(result.series[1].name).toBe("精力值");
    expect(result.series[1].data).toEqual([8, 7]);
  });

  it("应该正确处理缺失日期（补0）", () => {
    const dataByMetric = new Map([
      [
        METRICS.POMODORO,
        new Map([
          ["2024-06-09", 5],
          ["2024-06-11", 3], // 缺少 6-10
        ]),
      ],
    ]);

    const config = createChartConfig([METRICS.POMODORO], {
      type: "line",
      timeGranularity: "day",
      dateRange: {
        type: "custom",
        startDate: new Date("2024-06-09T00:00:00Z").getTime(),
        endDate: new Date("2024-06-11T23:59:59Z").getTime(),
      },
      stacked: false,
    });

    const result = convertToChartData(dataByMetric, config);

    // 应该包含完整的日期范围（包括缺失的 6-10）
    expect(result.xAxis).toEqual(["2024-06-09", "2024-06-10", "2024-06-11"]);
    expect(result.series[0].data).toEqual([5, 0, 3]); // 6-10 补 0
  });

  it("应该支持堆叠模式", () => {
    const dataByMetric = new Map([
      [METRICS.POMODORO, new Map([["2024-06-09", 5]])],
      [METRICS.ENERGY, new Map([["2024-06-09", 8]])],
    ]);

    const config = createChartConfig([METRICS.POMODORO, METRICS.ENERGY], {
      type: "bar",
      timeGranularity: "day",
      dateRange: {
        type: "custom",
        startDate: new Date("2024-06-09T00:00:00Z").getTime(),
        endDate: new Date("2024-06-09T23:59:59Z").getTime(),
      },
      stacked: true,
    });

    const result = convertToChartData(dataByMetric, config);

    expect(result.series[0].stack).toBe("total");
    expect(result.series[1].stack).toBe("total");
  });

  it("应该正确过滤日期范围 - 最近30天", () => {
    // 当前固定时间是 2024-06-15
    const today = "2024-06-15";
    const yesterday = "2024-06-14";
    const oldDate = "2024-03-01"; // 超过30天

    const data = new Map([
      [today, 5],
      [yesterday, 3],
      [oldDate, 10],
    ]);

    const filtered = filterByDateRange(data, DateRangePresets.last30Days());

    expect(filtered.has(today)).toBe(true);
    expect(filtered.has(yesterday)).toBe(true);
    expect(filtered.has(oldDate)).toBe(false);
  });

  it("应该正确过滤日期范围 - 本月", () => {
    // 当前固定时间是 2024-06-15
    const thisMonth1 = "2024-06-01";
    const thisMonth2 = "2024-06-10";
    const lastMonth = "2024-05-20";

    const data = new Map([
      [thisMonth1, 5],
      [thisMonth2, 3],
      [lastMonth, 10],
    ]);

    const filtered = filterByDateRange(data, DateRangePresets.thisMonth());

    expect(filtered.has(thisMonth1)).toBe(true);
    expect(filtered.has(thisMonth2)).toBe(true);
    expect(filtered.has(lastMonth)).toBe(false);
  });

  it("应该正确过滤日期范围 - 自定义范围", () => {
    const inRange1 = "2024-06-09";
    const inRange2 = "2024-06-10";
    const outOfRange = "2024-06-11";

    const data = new Map([
      [inRange1, 5],
      [inRange2, 3],
      [outOfRange, 10],
    ]);

    const filtered = filterByDateRange(data, {
      type: "custom",
      startDate: new Date("2024-06-09T00:00:00Z").getTime(),
      endDate: new Date("2024-06-10T23:59:59Z").getTime(),
    });

    expect(filtered.has(inRange1)).toBe(true);
    expect(filtered.has(inRange2)).toBe(true);
    expect(filtered.has(outOfRange)).toBe(false);
  });

  it("应该生成热力图数据", () => {
    const data = new Map([
      ["2024-06-09", 5],
      ["2024-06-10", 3],
      ["2024-06-11", 8],
    ]);

    const result = generateHeatmapData(data, DateRangePresets.last7Days());

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ date: "2024-06-09", value: 5 });
    expect(result[1]).toEqual({ date: "2024-06-10", value: 3 });
    expect(result[2]).toEqual({ date: "2024-06-11", value: 8 });
  });

  it("应该支持不同的时间粒度 - 周", () => {
    const dataByMetric = new Map([
      [
        METRICS.POMODORO,
        new Map([
          ["2024-W23", 15], // 第23周
          ["2024-W24", 20], // 第24周
        ]),
      ],
    ]);

    const config = createChartConfig([METRICS.POMODORO], {
      type: "line",
      timeGranularity: "week",
      dateRange: {
        type: "custom",
        startDate: new Date("2024-06-03T00:00:00Z").getTime(), // 第23周开始
        endDate: new Date("2024-06-16T23:59:59Z").getTime(), // 第24周结束
      },
    });

    const result = convertToChartData(dataByMetric, config);

    expect(result.xAxis).toContain("2024-W23");
    expect(result.xAxis).toContain("2024-W24");
    expect(result.series[0].data[0]).toBe(15);
    expect(result.series[0].data[1]).toBe(20);
  });

  it("应该支持不同的时间粒度 - 月", () => {
    const dataByMetric = new Map([
      [
        METRICS.POMODORO,
        new Map([
          ["2024-05", 100],
          ["2024-06", 120],
        ]),
      ],
    ]);

    const config = createChartConfig([METRICS.POMODORO], {
      type: "bar",
      timeGranularity: "month",
      dateRange: {
        type: "custom",
        startDate: new Date("2024-05-01T00:00:00Z").getTime(),
        endDate: new Date("2024-06-30T23:59:59Z").getTime(),
      },
    });

    const result = convertToChartData(dataByMetric, config);

    expect(result.xAxis).toEqual(["2024-05", "2024-06"]);
    expect(result.series[0].data).toEqual([100, 120]);
  });

  it("应该使用 DateRangePresets 快捷方式", () => {
    const data = new Map([
      ["2024-06-14", 5], // 昨天
      ["2024-06-15", 3], // 今天
    ]);

    // 测试不同的预设
    const todayFiltered = filterByDateRange(data, DateRangePresets.today());
    expect(todayFiltered.has("2024-06-15")).toBe(true);
    expect(todayFiltered.has("2024-06-14")).toBe(false);

    const last7DaysFiltered = filterByDateRange(data, DateRangePresets.last7Days());
    expect(last7DaysFiltered.has("2024-06-15")).toBe(true);
    expect(last7DaysFiltered.has("2024-06-14")).toBe(true);
  });
});
