// src/core/types/Todo.ts
export interface Todo {
    id: number;
    activityId: number;
    taskId: number;                 // 只需1个task
    estPomo: number[];          // 最多3次估计
    realPomo: number[];         // 最多3次实际
    status?: '' | 'delayed' | 'ongoing' | 'cancelled' | 'done';
    day: string;                // 对应哪一天
  }