/**
 * 返回 YYYY-MM-DD 形式的日期字符串，无论输入是 Date、字符串还是数字
 * @param dateInput Date对象/时间戳/ISO字符串
 */
export function getDateKey(dateInput: Date | string | number): string {
  let date: Date;
  if (dateInput instanceof Date) {
    date = dateInput;
  } else if (typeof dateInput === "number") {
    date = new Date(dateInput);
  } else {
    // 直接传入字符串（如ISO/本地日期字符串）
    date = new Date(dateInput);
  }
  // 补0，避免4月9号变成4-9而不是04-09
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
