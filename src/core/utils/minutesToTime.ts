// 工具：分钟数转时间字符串  
export function minutesToTime(m: number): string {  
    const h = Math.floor(m / 60);  
    const min = m % 60;  
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;  
  }  