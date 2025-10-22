// ChartConfigService.vue
import { METRICS } from "@/core/types/Metrics";
import { createChartConfig, DateRangePresets } from "@/core/types/ChartConfig";
import type { ChartConfig } from "@/core/types/ChartConfig";

/**
 * 预设图表配置
 * 定义常用的图表模板
 */
export const PRESET_CONFIGS = {
  /**
   * 番茄累积
   */
  pomodoro_trend: createChartConfig([METRICS.POMODORO], {
    type: "line",
    title: "番茄累积",
    dateRange: DateRangePresets.thisMonth(),
  }),

  /**
   * 精力值 & 愉悦值对比（7天）
   */
  energy_reward_compare: createChartConfig(
    [
      { name: METRICS.ENERGY, color: "#409eff" },
      { name: METRICS.REWARD, color: "#67c23a" },
    ],
    {
      type: "line",
      title: "精力值 & 愉悦值",
      dateRange: DateRangePresets.thisMonth(),
    }
  ),

  /**
   * 干扰和分心统计（30天，堆叠显示）
   */
  interruption_stats: createChartConfig([METRICS.INTERRUPTION_EXTERNAL, METRICS.INTERRUPTION_INTERNAL], {
    type: "bar",
    title: "内部与外部打扰",
    dateRange: DateRangePresets.thisMonth(),
    stacked: true,
  }),
} as const;

/**
 * 获取预设配置
 */
export function getPresetConfig(name: keyof typeof PRESET_CONFIGS): ChartConfig {
  return PRESET_CONFIGS[name];
}

/**
 * 获取所有预设配置的名称列表
 */
export function getPresetNames(): string[] {
  return Object.keys(PRESET_CONFIGS);
}
