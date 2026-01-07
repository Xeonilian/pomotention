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

  // 开始长按（按下时触发）
  const onLongPressStart = () => {
    longPressTriggered.value = false;
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
    if (longPressTimer.value !== null) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
  };

  // 取消长按（移出按钮或触摸取消时触发）
  const onLongPressCancel = () => {
    if (longPressTimer.value !== null) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
  };

  return {
    longPressTriggered,
    onLongPressStart,
    onLongPressEnd,
    onLongPressCancel,
  };
}


