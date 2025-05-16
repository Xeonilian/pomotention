// src/core/types/Schedule.ts
export interface Schedule {
  id: number; // 时间戳
  activityId: number;
  activityTitle: string;
  activityDueRange: [number, string]; // 第一个是开始时间戳，第二个是持续min
  taskId?: number; // 只需1个task
  status?: "" | "delayed" | "ongoing" | "cancelled" | "done" | "suspended";
  projectName?: string;
  location?: string;
}
