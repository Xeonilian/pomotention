/**  
 * 根据一个时间戳，计算该时间戳对应那一天的“24:00”，即次日00:00的时间戳  
 * @param timestamp - 任意时间戳（ms）  
 * @returns 该时间戳所在日期（0点起）的次日0点时间戳（当天24:00）  
 */  
export function getEndOfDayTimestamp(timestamp: number): number {  
    const day = new Date(timestamp);  
    
    // 设置时间为当天0点  
    day.setHours(0, 0, 0, 0);  
  
    // 获取当天0点时间戳  
    const startOfDayTs = day.getTime();  
  
    // 加上一天的毫秒数，得到次日0点的时间戳  
    return startOfDayTs + 24 * 60 * 60 * 1000;  
  }  