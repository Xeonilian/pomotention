// 工具：时间转分钟数  HH:MM > Date 时间戳数字，使用进行
export function getTimestampForTimeString(timeString: string) {
    // 创建一个新的日期对象
    const now = new Date();
    
    // 解析时间字符串
    const [hours, minutes] = timeString.split(':').map(Number);
    
    // 如果时间是24:00，将其视为次日的00:00
    if (hours === 24) {
      now.setDate(now.getDate() + 1);
      now.setHours(0, 0, 0, 0);
    } else {
      // 设置时间为当天的指定小时和分钟
      now.setHours(hours, minutes, 0, 0);
    }
    
    // 返回时间戳
    return now.getTime();
  }