// src/core/types/Task.ts
import type { Pomo } from "./Pomo";
export interface Task {
    id: number; // 唯一
    content: string;
    pomos: Pomo[];    // 一组实际发生的pomodoro
    status?: '' | 'delayed' | 'ongoing' | 'cancelled' | 'done';
  }