/**
 * 获取给定日期当天零点（本地时区）的时间戳。
 * 这是所有日期操作的标准化入口。
 * @param dateInput 可选，可以是 Date 对象、时间戳或日期字符串。默认为当前时间。
 */
export function getDayStartTimestamp(
  dateInput?: Date | string | number
): number {
  const date = dateInput ? new Date(dateInput) : new Date();
  // 将时间部分重置为 00:00:00.000
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
