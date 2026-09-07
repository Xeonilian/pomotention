// 周视图统一时间轴：默认最少 6～22；上午醒来可调上沿；午睡不得压轴
const DEFAULT_START = 6;
/** 醒来时刻的小时 ≥ 此时则视为午睡/下午，不参与上沿 */
const AFTERNOON_WAKE_HOUR = 12;

export function resolveWeekAxisStartHour(minHour: number, earliestWakeTs: number | null): number {
  let startHour = minHour < DEFAULT_START ? minHour : DEFAULT_START;
  if (earliestWakeTs == null) return startHour;

  const d = new Date(earliestWakeTs);
  if (d.getHours() >= AFTERNOON_WAKE_HOUR) return startHour;

  const wakeFrac = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
  const wakeStart = Math.max(0, Math.ceil(wakeFrac) - 1);
  startHour = wakeStart;
  if (minHour < startHour) startHour = minHour;
  return startHour;
}

/** 下沿默认至少到 22 */
export function resolveWeekAxisEndHour(maxHour: number): number {
  return maxHour > 22 ? maxHour : 22;
}
