/**
 * 比较两个 Date 对象是否代表同一天（忽略时间部分）。
 * @param {Date} date1 - 第一个日期。
 * @param {Date} date2 - 第二个日期。
 * @returns {boolean} 如果两个日期同年、同月、同日，则返回 true，否则返回 false。
 */
export const areSameDay = (date1: Date, date2: Date): boolean => {
  // 确保输入都是有效的 Date 对象
  if (!date1 || !date2) {
    return false;
  }

  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};
