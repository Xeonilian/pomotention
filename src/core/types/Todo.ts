// src/core/types/Todo.ts
// 直接将Activity数据合并
export interface Todo {
  id: number; // 时间戳生成时刻
  activityId: number; // 生成任务时刻
  activityTitle: string;
  projectName?: string;
  taskId?: number; // 只需1个task
  estPomo?: number[]; // 最多3次估计
  realPomo?: number[]; // 最多3次实际
  status?: "" | "delayed" | "ongoing" | "cancelled" | "done" | "suspended";
  priority: number;
}
