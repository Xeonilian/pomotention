// core/types/Metrics.ts
import type { MetricName, MetricDefinition } from "@/core/types/Chart";

/**
 * 指标常量（防止拼写错误）
 */
export const METRICS = {
  POMODORO: "pomodoro",
  ENERGY: "energy",
  REWARD: "reward",
  INTERRUPTION_EXTERNAL: "interruption_external",
  INTERRUPTION_INTERNAL: "interruption_internal",
  // 未来Tag追踪
  WEIGHT: "weight",
  SLEEP: "sleep",
} as const;

/**
 * 指标定义表
 */
export const METRIC_DEFINITIONS: Record<MetricName, MetricDefinition> = {
  [METRICS.POMODORO]: {
    label: "番茄数",
    unit: "个",
    aggregationType: "sum",
    defaultColor: "#f56c6c",
    dataSource: "todo",
    description: "完成的番茄钟数量",
  },

  [METRICS.ENERGY]: {
    label: "精力值",
    unit: "分",
    aggregationType: "avg",
    defaultColor: "#409eff",
    dataSource: "task",
    description: "1-10的精力评分",
  },

  [METRICS.REWARD]: {
    label: "愉悦值",
    unit: "分",
    aggregationType: "avg",
    defaultColor: "#67c23a",
    dataSource: "task",
    description: "1-10的愉悦评分",
  },

  [METRICS.INTERRUPTION_EXTERNAL]: {
    label: "外部打扰",
    unit: "次",
    aggregationType: "count",
    defaultColor: "#e6a23c",
    dataSource: "task",
    description: "外部打扰次数（E类型）",
  },

  [METRICS.INTERRUPTION_INTERNAL]: {
    label: "内部打扰",
    unit: "次",
    aggregationType: "count",
    defaultColor: "#f56c6c",
    dataSource: "task",
    description: "内部打扰次数（I类型）",
  },

  // 未来Tag追踪
  [METRICS.WEIGHT]: {
    label: "体重",
    unit: "kg",
    aggregationType: "last",
    defaultColor: "#909399",
    dataSource: "tag",
    description: "体重记录",
  },

  [METRICS.SLEEP]: {
    label: "睡眠时长",
    unit: "小时",
    aggregationType: "avg",
    defaultColor: "#8e44ad",
    dataSource: "tag",
    description: "每日睡眠时长",
  },
};
