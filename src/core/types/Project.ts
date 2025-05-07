// Project.ts
export interface Project {
    id: number;
    title: string;
    description?: string;
    status?: '' | 'ongoing' | 'done' | 'cancelled';
    dueDate?: number;
    // 可以加priority、dueDate等
  }