// 工具：时间转分钟数  HH:MM > min
export function timeToMinutes(t: string): number {  
    const [h, m] = t.split(':').map(Number);  
    return h * 60 + m;  
  } 