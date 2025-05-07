// src/core/types/Activity.ts
export interface Activity {
    id: number;
    title: string;
    class: 'S' | 'T';
    projectId?: number;
    estPomoI?: string;
    dueDate?: number;
    dueRange?: [number, number];
    interruption?: 'I' | 'E';
    category?: 'red' | 'yellow' | 'blue' | 'green' | 'white';
    fourZone?: '1' | '2' | '3' | '4';
    repeatParams?: [number, number, string, string];  //开始日期，结束日期，重复方式：dayly, monthly, weakly, every x day|week|month, every mon tue thr sat, 是否包括周末 不是MVP，只把每天加入
    status?: '' | 'delayed' | 'ongoing' | 'cancelled' | 'done';
  }
