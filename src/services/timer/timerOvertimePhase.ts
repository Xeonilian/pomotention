/** 正计时阶段：自计划结束时刻起的已过秒数 */
export function syncOvertimeElapsedSec(overtimeStartedAt: number | null): number {
  if (overtimeStartedAt == null) return 0;
  return Math.max(0, Math.floor((Date.now() - overtimeStartedAt) / 1000));
}

export function shouldOfferOvertimeAfterPlan(continueTimingAfterComplete: boolean, isFromSequence: boolean): boolean {
  return continueTimingAfterComplete && !isFromSequence;
}
