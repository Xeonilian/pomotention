import { nextTick } from "vue";

/** 失焦 + 等一帧，让 naive-ui 日期时间选择器把面板里的改动同步到 v-model */
export async function flushPickerValueToVue(): Promise<void> {
  (document.activeElement as HTMLElement | null)?.blur?.();
  await nextTick();
  await new Promise<void>((r) => requestAnimationFrame(() => r()));
}

/** 转成可写入 store 的毫秒时间戳，非法则用当前时刻 */
export function pickRecordedAtMs(raw: number | null | undefined): number {
  if (raw != null && typeof raw === "number" && Number.isFinite(raw)) {
    return raw;
  }
  return Date.now();
}

/** 键盘事件是否发生在 naive-ui 日期/时间选择器内（避免内部回车冒泡到外层 n-modal 误提交） */
export function isEventFromDateTimePickerDeep(target: EventTarget | null): boolean {
  if (!target || !(target instanceof Element)) return false;
  return Boolean(target.closest(".n-date-picker") || target.closest(".n-time-picker"));
}
