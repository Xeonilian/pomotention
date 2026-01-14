import { ref, type Ref } from "vue";

// 通用长按逻辑 composable
export function useLongPress(options?: {
  delay?: number; // 长按判定时长（毫秒）
  onLongPress?: () => void; // 长按触发回调
}) {
  const delay = options?.delay ?? 600;

  // 是否已经触发长按
  const longPressTriggered = ref(false);
  // 长按计时器 id
  const longPressTimer: Ref<number | null> = ref(null);
  // 标记是否是触摸设备（避免鼠标事件干扰）
  const isTouch = ref(false);

  // 开始长按（按下时触发）
  const onLongPressStart = (e: TouchEvent | MouseEvent) => {
    // 标记事件类型（触摸/鼠标）
    isTouch.value = e.type === "touchstart";
    longPressTriggered.value = false;

    // 清理已有计时器
    if (longPressTimer.value !== null) {
      clearTimeout(longPressTimer.value);
    }

    longPressTimer.value = window.setTimeout(() => {
      longPressTriggered.value = true;
      options?.onLongPress?.();
    }, delay);
  };

  // 结束长按（抬起时触发）
  const onLongPressEnd = () => {
    // 清理计时器
    if (longPressTimer.value !== null) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }

    // 触摸设备下，延迟重置状态（避开浏览器模拟click的延迟）
    const resetDelay = isTouch.value ? 300 : 0;
    setTimeout(() => {
      longPressTriggered.value = false;
      isTouch.value = false;
    }, resetDelay);
  };

  // 取消长按（移出按钮或触摸取消时触发）
  const onLongPressCancel = () => {
    if (longPressTimer.value !== null) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
    longPressTriggered.value = false;
    isTouch.value = false;
  };

  return {
    longPressTriggered,
    onLongPressStart,
    onLongPressEnd,
    onLongPressCancel,
  };
}
