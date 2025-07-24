/**
 * 将时间戳（毫秒）转换为 HH:MM 格式的时间字符串
 * @param timestamp 时间戳（毫秒），例如 861333934000
 * @returns 格式化的时间字符串（如 "01:30"）
 */
export function timestampToTimeString(timestamp: number | null): string {
  if (timestamp === null) return "-";
  const date = new Date(timestamp);

  // 提取小时和分钟，并格式化为两位数
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${hours}:${minutes}`;
}
