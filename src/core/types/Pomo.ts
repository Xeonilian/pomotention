// src/core/types/Pomo.ts
export interface Pomo {
    start: number;
    end: number;
    status: 'done' | 'drop' | 'small-done' | 'large-done';
    intention: string;
  }