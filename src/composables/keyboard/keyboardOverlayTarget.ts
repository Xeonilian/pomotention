/** 浮层内控件会自行消费方向键（滑块、日期面板等），全局 planner 翻页应让路 */
export function isOverlayDirectionKeyTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest(".n-modal")) return true;
  if (target.closest('[role="slider"]') || target.closest(".n-slider")) return true;
  if (target.closest(".n-date-picker-panel") || target.closest(".n-time-picker-panel")) return true;
  return false;
}
