import { describe, it, expect } from "vitest";
import { convertToChartData, filterByDateRange, generateHeatmapData } from "@/services/chartWidgetService";
import { METRICS } from "@/core/types/Metrics";
import type { ChartConfig } from "@/core/types/ChartConfig";

describe("chartViewService", () => {
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

    const config: ChartConfig = {
      type: "line",
      metrics: [METRICS.POMODORO, METRICS.ENERGY],
      timeGranularity: "day",
      aggregationType: "sum",
      dateRange: 30,
      stacked: false,
    };

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

    const config: ChartConfig = {
      type: "line",
      metrics: [METRICS.POMODORO],
      timeGranularity: "day",
      aggregationType: "sum",
      dateRange: 30,
      stacked: false,
    };

    const result = convertToChartData(dataByMetric, config);

    expect(result.xAxis).toEqual(["2024-06-09", "2024-06-11"]);
    expect(result.series[0].data).toEqual([5, 3]);
  });

  it("应该支持堆叠模式", () => {
    const dataByMetric = new Map([
      [METRICS.POMODORO, new Map([["2024-06-09", 5]])],
      [METRICS.ENERGY, new Map([["2024-06-09", 8]])],
    ]);

    const config: ChartConfig = {
      type: "bar",
      metrics: [METRICS.POMODORO, METRICS.ENERGY],
      timeGranularity: "day",
      aggregationType: "sum",
      dateRange: 30,
      stacked: true,
    };

    const result = convertToChartData(dataByMetric, config);

    expect(result.series[0].stack).toBe("total");
    expect(result.series[1].stack).toBe("total");
  });

  it("应该正确过滤日期范围", () => {
    const now = Date.now();
    const today = new Date(now).toISOString().split("T")[0];
    const yesterday = new Date(now - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const oldDate = new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const data = new Map([
      [today, 5],
      [yesterday, 3],
      [oldDate, 10],
    ]);

    const filtered = filterByDateRange(data, 30); // 最近30天

    expect(filtered.has(today)).toBe(true);
    expect(filtered.has(yesterday)).toBe(true);
    expect(filtered.has(oldDate)).toBe(false);
  });

  it("应该生成热力图数据", () => {
    const data = new Map([
      ["2025-06-09", 5],
      ["2025-06-10", 3],
    ]);

    const result = generateHeatmapData(data, 365);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: "2025-06-09", value: 5 });
    expect(result[1]).toEqual({ date: "2025-06-10", value: 3 });
  });
});
