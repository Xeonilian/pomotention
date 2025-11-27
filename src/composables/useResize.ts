import { Ref, ref } from "vue";

type ResizeDirection = "vertical" | "horizontal";

export function useResize(
  sizeRef: Ref<number>,
  direction: ResizeDirection = "vertical",
  minSize: number = 100,
  maxSize: number = window.innerHeight - 200,
  isLeft: boolean = true
) {
  const size = sizeRef;
  const isResizing = ref(false);
  const startPos = ref(0);
  const startSize = ref(0);

  // 开始拖动
  function startResize(e: MouseEvent | TouchEvent) {
    isResizing.value = true;
    const coords = getEventCoordinates(e);
    startPos.value = direction === "vertical" ? coords.y : coords.x;
    startSize.value = size.value;

    // 禁用文本选择
    document.body.style.userSelect = "none";

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResize);
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", stopResize);
  }

  // 根据事件类型获取坐标
  function getEventCoordinates(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if (checkTouchEvent(e)) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function checkTouchEvent(e: any): e is TouchEvent {
    return typeof TouchEvent !== "undefined" && e instanceof TouchEvent;
  }

  // 处理拖动
  function handleMouseMove(e: MouseEvent) {
    handleMove(e);
  }

  function handleTouchMove(e: TouchEvent) {
    handleMove(e);
  }

  function handleMove(e: MouseEvent | TouchEvent) {
    if (!isResizing.value) return;

    const coords = getEventCoordinates(e);
    const currentPos = direction === "vertical" ? coords.y : coords.x;
    let delta = currentPos - startPos.value;

    // 水平拖拽时根据左右方向调整 delta
    if (direction === "horizontal") {
      delta = isLeft ? -delta : delta;
    }

    const newSize = Math.max(minSize, Math.min(startSize.value + delta, maxSize));
    size.value = newSize;
  }

  // 停止拖动
  function stopResize() {
    isResizing.value = false;
    // 恢复文本选择
    document.body.style.userSelect = "";

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResize);
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", stopResize);
  }

  return {
    size,
    isResizing,
    startResize,
  };
}
