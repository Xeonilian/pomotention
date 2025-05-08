// src/core/types/Schedule.ts
export interface Schedule {
    id: number; // 时间戳
    activityId: number;
    taskId?: number;                 // 只需1个task
    status?: '' | 'delayed' | 'ongoing' | 'cancelled' | 'done';
  }