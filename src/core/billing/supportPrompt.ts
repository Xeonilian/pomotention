// src/core/billing/supportPrompt.ts
// 每月一次的订购/打赏提示。锚在首次提示那天，不随打开日滑动。日期记在 globalSettings。
import { useSettingStore } from "@/stores/useSettingStore";

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
  const settings = useSettingStore().settings;
  const now = Date.now();

  let nextStr = settings.supportNextPromptDate;
  if (!nextStr) {
    let firstStr = settings.supportFirstUseDate;
    if (!firstStr) {
      firstStr = new Date(now).toISOString();
      settings.supportFirstUseDate = firstStr;
    }
    const firstTs = Date.parse(firstStr);
    const baseTs = Number.isNaN(firstTs) ? now : firstTs;
    nextStr = new Date(baseTs + FIRST_PROMPT_DELAY_DAYS * DAY_MS).toISOString();
    settings.supportNextPromptDate = nextStr;
  }

  const nextTs = Date.parse(nextStr);
  if (Number.isNaN(nextTs)) return false;
  return now >= nextTs;
}

/** 提示已展示后推进下一次。锚不变：从当前 nextPromptDate +1 日历月，过期多月则逐月推到未来 */
export function advanceSupportPrompt(): void {
  const settings = useSettingStore().settings;
  const nextStr = settings.supportNextPromptDate;
  if (!nextStr) return;
  const next = new Date(nextStr);
  if (Number.isNaN(next.getTime())) return;
  let target = addMonthsClamped(next, 1);
  while (target.getTime() <= Date.now()) {
    target = addMonthsClamped(target, 1);
  }
  settings.supportNextPromptDate = target.toISOString();
}
