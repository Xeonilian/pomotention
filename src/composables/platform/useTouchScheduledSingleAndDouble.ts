/**
 * 触摸：在两次轻触间隔内判定为「双触」，否则延迟后触发「单触」（避免与 iOS 不触发 dblclick 冲突）
 * 桌面仍用原生 click / dblclick；仅移动端绑定 touchstart/touchend。
 */
// iPhone 双触识别窗口略放宽，提升双触成功率
const GAP_MS = 360;
const SINGLE_DELAY_MS = 340;

export function createTouchScheduledSingleAndDouble<Key extends string | number = number>(
  onSingle: (key: Key) => void,
  onDouble: (key: Key) => void,
) {
  let lastEnd = 0;
  let lastKey: Key | null = null;
  let timer: number | null = null;

  function flushTimer() {
    if (timer != null) window.clearTimeout(timer);
    timer = null;
  }

  /** 不在此调用 preventDefault，以免妨碍外层（如年视图）垂直滚动；防误触由位移阈值在业务侧处理 */
  function touchStart(_e: TouchEvent) {}

  function touchEnd(key: Key) {
    const now = Date.now();
    if (timer != null) flushTimer();
    if (lastKey === key && now - lastEnd < GAP_MS) {
      lastKey = null;
      lastEnd = 0;
      onDouble(key);
      return;
    }
    lastKey = key;
    lastEnd = now;
    timer = window.setTimeout(() => {
      timer = null;
      lastKey = null;
      lastEnd = 0;
      onSingle(key);
    }, SINGLE_DELAY_MS);
  }

  function touchCancel() {
    flushTimer();
    lastKey = null;
    lastEnd = 0;
  }

  return { touchStart, touchEnd, touchCancel };
}
