/**
 * 将一个时间字符串 (如 'HH:MM') 与一个基准日期的时间戳结合，生成一个新的完整时间戳。
 * @param timeString 'HH:MM' 格式的时间字符串。
 * @param baseTimestamp 代表基准日期的【当天任意时刻】的毫秒时间戳。函数内部会将其标准化为零点。
 * @returns 返回一个数字，表示基准日期当天指定时间的毫秒时间戳。
 */
export function getTimestampForTimeString(
  timeString: string,
  baseTimestamp: number
): number {
  // 1. 从时间字符串中解析小时和分钟
  const [hours, minutes] = timeString.split(":").map(Number);

  // 2. 基于基准时间戳创建一个 Date 对象
  const date = new Date(baseTimestamp);

  // 3. 设置为当天的指定小时和分钟，同时清零秒和毫秒，确保精确
  date.setHours(hours, minutes, 0, 0);

  return date.getTime();
}

export function getTimestampForTimeStringOld(
  timeString: string,
  baseTimestamp?: number
): number {
  // 以基准时间戳为当天，否则为当前时间
  const baseDate = baseTimestamp ? new Date(baseTimestamp) : new Date();

  // 解析时间字符串
  let [hours, minutes] = timeString.split(":").map(Number);

  // 先保存基准日信息
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const date = baseDate.getDate();

  let resultDate = new Date(year, month, date, 0, 0, 0, 0);

  // 如果时间为24:00，视为次日00:00
  if (hours === 24) {
    resultDate.setDate(resultDate.getDate() + 1);
    hours = 0;
    minutes = 0;
  }

  resultDate.setHours(hours, minutes, 0, 0);

  let finalTimestamp = resultDate.getTime();

  // 如果和基准毫秒数完全一样，增加随机毫秒（1-99ms）
  if (baseTimestamp && finalTimestamp === baseTimestamp) {
    finalTimestamp += Math.floor(Math.random() * 99) + 1;
  }

  return finalTimestamp;
}
