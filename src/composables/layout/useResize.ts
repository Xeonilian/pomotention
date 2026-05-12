// src/composables/useResize.ts
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

  // 开始拖动 (Pointer Down)
  function startResize(e: PointerEvent) {
    // 阻止默认行为（防止选中文字等）
    e.preventDefault();

    // 只响应左键或触摸
    if (e.button !== 0) return;

    isResizing.value = true;
    startPos.value = direction === "vertical" ? e.clientY : e.clientX;
    startSize.value = size.value;

    const target = e.target as HTMLElement;
    // 【关键】锁定指针，处理快速滑动出界问题
    target.setPointerCapture(e.pointerId);

    // 禁用文本选择
    document.body.style.userSelect = "none";
    document.body.style.cursor = direction === "vertical" ? "row-resize" : "col-resize";

    // 直接在元素上监听即可，因为有 setPointerCapture
    target.addEventListener("pointermove", handleResizeMove);
    target.addEventListener("pointerup", stopResize);
    target.addEventListener("pointercancel", stopResize);
  }

  // 处理拖动 (Pointer Move)
  function handleResizeMove(e: PointerEvent) {
    if (!isResizing.value) return;

    // PointerEvent 直接有 clientX/Y，不需要区分 touch/mouse
    const currentPos = direction === "vertical" ? e.clientY : e.clientX;
    let delta = currentPos - startPos.value;

    // 垂直方向通常是向下拉增大(delta正)，向上拉减小
    // 如果是“向上拉伸”的底部抽屉，逻辑可能相反，这里维持你原本的逻辑：
    // 假设是顶部往下拉，或者底部往下拉增大高度。
    // 如果是 Bottom Sheet (往上拉增大)，delta 应该取反。
    // 你原来的代码逻辑是：newSize = startSize + delta

    // 水平拖拽时根据左右方向调整 delta
    if (direction === "horizontal") {
      delta = isLeft ? -delta : delta;
    }
    // 注意：如果垂直方向是“往上拉变大”（比如底部面板），你需要手动把 delta 取反，
    // 或者在外部调用时传入正确的 min/max 和方向逻辑。
    // 这里保持和你原代码一致：鼠标坐标变大 -> size 变大。

    const newSize = Math.max(minSize, Math.min(startSize.value + delta, maxSize));
    size.value = newSize;
  }

  // 停止拖动 (Pointer Up)
  function stopResize(e: PointerEvent) {
    isResizing.value = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";

    const target = e.target as HTMLElement;
    if (target.hasPointerCapture(e.pointerId)) {
      target.releasePointerCapture(e.pointerId);
    }

    target.removeEventListener("pointermove", handleResizeMove);
    target.removeEventListener("pointerup", stopResize);
    target.removeEventListener("pointercancel", stopResize);
  }

  return {
    size,
    isResizing,
    startResize,
  };
}
