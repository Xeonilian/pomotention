  /**
   * 获取本地时区的日期字符串 (YYYY-MM-DD)
   * 避免使用 toISOString() 导致的时区问题
   * 注意: toISOString() 会返回 UTC 时区的日期，在 UTC+8 等时区的凌晨可能导致日期检测错误
   * @param date 可选的日期对象，若不提供则使用当前日期
   */
  export function getLocalDateString(date?: Date) {
    const now = date || new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }