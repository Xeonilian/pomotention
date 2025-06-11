/**
 * 将 'HH:MM' 转为当天对应的时间戳
 *
 * @param timeString - 时间字符串 "HH:MM"
 * @param baseTimestamp - 可选，基准时间戳（用于决定哪一天），默认为当前时间
 * @returns number - 新生成的时间戳
 */
export function getTimestampForTimeString(
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
