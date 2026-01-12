/**
 * WeekPlanner 组件专属类型定义
 * 统一管理所有相关类型，避免分散定义导致的类型不一致
 */

// ======================== 基础类型 ========================
/**
 * 统一的待办/日程项类型
 * 整合 Todo 和 Schedule 的公共字段 + 专属字段
 */
export interface UnifiedItem {
  // 核心标识
  key: string; // 唯一标识（如 todo-123 / schedule-456）
  id: number; // 原始数据ID
  ts: number; // 用于分桶/排序的时间戳（毫秒）
  type: "todo" | "schedule"; // 类型区分
  title: string; // 标题

  // 公共扩展字段
  activityId?: number; // 关联的活动ID
  activityTitle?: string; // 活动标题
  projectName?: string; // 项目名称
  taskId?: number; // 关联的任务ID
  tagIds?: number[]; // 标签ID列表
  status?: "" | "delayed" | "ongoing" | "cancelled" | "done" | "suspended"; // 状态
  doneWeek?: number; // 完成时间戳
  interruption?: "I" | "E"; // 中断类型

  // Todo 专属字段
  estPomo?: number[]; // 预计番茄数
  realPomo?: number[]; // 实际番茄数
  pomoType?: "🍅" | "🍇" | "🍒"; // 番茄类型
  dueDate?: number; // 截止时间戳
  startWeek?: number; // 开始时间戳

  // Schedule 专属字段
  activityDueRange?: [number | null, string]; // [开始时间戳, 持续分钟(字符串)]
  location?: any; // 位置信息（按需定义具体类型）
  isUntaetigkeit?: any; // 非活动标识（按需定义具体类型）
}

/**
 * 单日数据模型
 * 包含一天的所有待办/日程、统计信息、日期标识等
 */
export interface DayItem {
  index: number; // 周内索引（0=周一，6=周日）
  startTs: number; // 当天开始时间戳（0点）
  endTs: number; // 当天结束时间戳（24点）
  items: UnifiedItem[]; // 当天的所有待办/日程
  sumRealPomo: number; // 实际番茄总数
  sumRealGrape: number; // 实际葡萄总数
  pomoRatio: number; // 番茄完成率（相对于STANDARD_POMO）
  isToday: boolean; // 是否是今天
}

/**
 * 时间块布局模型
 * 用于时间轴渲染的布局计算结果
 */
export interface WeekBlockItem {
  id: string; // 唯一标识（同UnifiedItem.key）
  type: "todo" | "schedule"; // 类型
  start: number; // 开始时间戳
  end: number; // 结束时间戳
  dayIndex: number; // 所属天的索引（0-6）
  item: UnifiedItem; // 关联的原始UnifiedItem
  column?: number; // 布局列（0-2，最多3列）
  width?: string; // CSS宽度（如 '33.33%'）
  left?: string; // CSS左侧偏移（如 '0%'）
}

// ======================== 组件Props类型 ========================
/**
 * DayCard 组件Props类型
 * 注意：selectedDate, selectedRowId, activeId 从 datastore 全局获取，不通过 props 传递
 */
export interface DayCardProps {
  day: DayItem;
  dayNames: string[];
  timeGridHeight: number;
  hourStamps: number[];
  layoutedWeekBlocks: Map<number, WeekBlockItem[]>;
  MAX_PER_DAY: number;
  getHourTickTop: (hour: number) => number;
  getWeekBlockStyle: (block: WeekBlockItem, dayStartTs: number) => Record<string, string | number>;
}

/**
 * WeekBlockItem 组件Props类型
 * 注意：selectedRowId, activeId 从 datastore 全局获取，不通过 props 传递
 */
export interface WeekBlockItemProps {
  block: WeekBlockItem;
  dayStartTs: number;
  getWeekBlockStyle: (block: WeekBlockItem, dayStartTs: number) => Record<string, string | number>;
}

// ======================== 事件类型 ========================
/**
 * WeekPlanner 组件Emits类型
 */
export interface WeekPlannerEmits {
  "date-change": [timestamp: number];
  "date-jump": [timestamp: number];
  "item-change": [id: number, activityId?: number, taskId?: number];
}

/**
 * DayCard 组件Emits类型
 */
export interface DayCardEmits {
  "date-change": [timestamp: number];
  "date-jump": [timestamp: number];
  "item-change": [id: number, activityId?: number, taskId?: number];
}

/**
 * WeekBlockItem 组件Emits类型
 */
export interface WeekBlockItemEmits {
  "item-change": [id: number, ts: number, activityId?: number, taskId?: number];
}

// ======================== 常量类型 ========================
/**
 * 时间轴配置类型
 */
export interface WeekGridConfig {
  pxPerHour: number; // 每小时对应的像素高度
  STANDARD_POMO: number; // 标准番茄数
  MAX_PER_DAY: number; // 每天最多显示的项数
  DAY_MS: number; // 一天的毫秒数
  HOUR_MS: number; // 一小时的毫秒数
}
