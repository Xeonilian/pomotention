/**
 * 为一个时间戳增加或减少指定的天数。
 * @param timestamp 基准时间戳（可以是当天任意时刻）。
 * @param daysToAdd 要增加的天数（负数为减少）。
 * @returns 返回计算后那天零点的新时间戳。
 */
export function addDays(timestamp: number, daysToAdd: number): number {
  // 1. 先将输入的时间戳标准化为当天的零点
  const startDate = new Date(timestamp);
  startDate.setHours(0, 0, 0, 0);

  // 2. 在 Date 对象上进行天数加减
  startDate.setDate(startDate.getDate() + daysToAdd);

  // 3. 返回新的时间戳
  return startDate.getTime();
}
