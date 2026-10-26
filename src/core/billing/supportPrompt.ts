// src/core/billing/supportPrompt.ts
// 每月一次的订购/打赏提示。锚在首次提示那天，不随打开日滑动。
const STORAGE_KEY = "pomotention.support.nextPromptDate";
const FIRST_USE_KEY = "pomotention.support.firstUseDate";
/** 首次提示：用满 7 天（一周）后弹，之后每月一次 */
const FIRST_PROMPT_DELAY_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** 加 N 个日历月，月末按目标月最后一天（1/31 +1 → 2/28） */
function addMonthsClamped(d: Date, months: number): Date {
  const target = new Date(d.getTime());
  const day = target.getDate();
  target.setMonth(target.getMonth() + months);
  if (target.getDate() < day) {
    // 溢出到下月初，回退到目标月最后一天
    target.setDate(0);
  }
  return target;
}

/** 是否到了提示日。首次调用会写入 firstUseDate 与 nextPromptDate（首用 +7 天） */
export function checkSupportPromptDue(): boolean {
  if (typeof localStorage === "undefined") return false;
  const now = Date.now();

  let nextStr = localStorage.getItem(STORAGE_KEY);
  if (!nextStr) {
    let firstStr = localStorage.getItem(FIRST_USE_KEY);
    if (!firstStr) {
      firstStr = new Date(now).toISOString();
      localStorage.setItem(FIRST_USE_KEY, firstStr);
    }
    const firstTs = Date.parse(firstStr);
    const baseTs = Number.isNaN(firstTs) ? now : firstTs;
    nextStr = new Date(baseTs + FIRST_PROMPT_DELAY_DAYS * DAY_MS).toISOString();
    localStorage.setItem(STORAGE_KEY, nextStr);
  }

  const nextTs = Date.parse(nextStr);
  if (Number.isNaN(nextTs)) return false;
  return now >= nextTs;
}

/** 提示已展示后推进下一次。锚不变：从当前 nextPromptDate +1 日历月，过期多月则逐月推到未来 */
export function advanceSupportPrompt(): void {
  if (typeof localStorage === "undefined") return;
  const nextStr = localStorage.getItem(STORAGE_KEY);
  if (!nextStr) return;
  const next = new Date(nextStr);
  if (Number.isNaN(next.getTime())) return;
  let target = addMonthsClamped(next, 1);
  while (target.getTime() <= Date.now()) {
    target = addMonthsClamped(target, 1);
  }
  localStorage.setItem(STORAGE_KEY, target.toISOString());
}
