/**
 * 获取表示“今天”的 Date 对象，时间部分被重置为午夜 00:00:00。
 * 这对于需要与一整天进行比较的场景非常重要，可以避免时间部分带来的误差。
 * @returns {Date} 一个代表今天零点零分零秒的 Date 对象。
 */
export const getTodayDate = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // 将时、分、秒、毫秒都设置为0
  return today;
};
