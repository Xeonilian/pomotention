import { ref } from "vue";

type ResizeDirection = "vertical" | "horizontal";

export function useResize(
  initialSize: number = 400,
  direction: ResizeDirection = "vertical",
  minSize: number = 100,
  maxSize: number = window.innerHeight - 200,
  isLeft: boolean = true
) {
  const size = ref(initialSize);
  const isResizing = ref(false);
  const startPos = ref(0);
  const startSize = ref(0);

  // 开始拖动
  function startResize(e: MouseEvent) {
    isResizing.value = true;
    startPos.value = direction === "vertical" ? e.clientY : e.clientX;
    startSize.value = size.value;

    // 禁用文本选择
    document.body.style.userSelect = "none";
    document.body.style.webkitUserSelect = "none";

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", stopResize);
  }

  // 处理拖动
  function handleMouseMove(e: MouseEvent) {
    if (!isResizing.value) return;

    const currentPos = direction === "vertical" ? e.clientY : e.clientX;
    let delta = currentPos - startPos.value;

    // 水平拖拽时根据左右方向调整 delta
    if (direction === "horizontal") {
      delta = isLeft ? -delta : delta;
    }

    const newSize = Math.max(
      minSize,
      Math.min(startSize.value + delta, maxSize)
    );
    size.value = newSize;
  }

  // 停止拖动
  function stopResize() {
    isResizing.value = false;
    // 恢复文本选择
    document.body.style.userSelect = "";
    document.body.style.webkitUserSelect = "";

    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", stopResize);
  }

  return {
    size,
    isResizing,
    startResize,
  };
}
