// src/composables/useDraggable.ts
import { ref } from "vue";

export function useDraggable(dragThreshold = 5) {
  const draggableContainer = ref<HTMLElement | null>(null);
  const lastPosition = ref({ x: -1, y: -1 });

  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let isDragging = false;
  let hasMoved = false; // 用于区分点击和拖拽

  // 初始化位置逻辑 (保留你原来的逻辑)
  function setInitialPosition() {
    if (!draggableContainer.value) return;
    const parentElement = draggableContainer.value.parentElement;
    if (!parentElement) return;

    const parentWidth = parentElement.clientWidth;
    const parentHeight = parentElement.clientHeight;
    const elementWidth = draggableContainer.value.offsetWidth || 220;
    const elementHeight = draggableContainer.value.offsetHeight || 140;

    let targetLeft, targetTop;

    // 如果有历史位置，优先使用
    if (lastPosition.value.x !== -1) {
      targetLeft = lastPosition.value.x;
      targetTop = lastPosition.value.y;
    } else {
      // 默认右下角
      const margin = 20;
      targetLeft = Math.max(0, parentWidth - elementWidth - margin);
      targetTop = Math.max(0, parentHeight - elementHeight - margin);
    }

    draggableContainer.value.style.left = `${targetLeft}px`;
    draggableContainer.value.style.top = `${targetTop}px`;
  }

  // 1. 开始拖拽 (对应模板 @pointerdown)
  function handleDragStart(e: PointerEvent) {
    if (!draggableContainer.value) return;

    // 只响应左键(0) 或 触摸
    if (e.button !== 0 && e.pointerType === "mouse") return;

    // 忽略交互元素 (输入框、按钮等)
    const target = e.target as HTMLElement;
    if (target.closest("input, textarea, button, .n-input, .n-slider")) return;

    e.preventDefault();

    const el = draggableContainer.value;
    isDragging = true;
    hasMoved = false;
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = el.offsetLeft;
    initialTop = el.offsetTop;

    el.style.cursor = "grabbing";

    // 锁定指针捕获 (关键：防止快速拖动时鼠标移出元素)
    el.setPointerCapture(e.pointerId);

    // 绑定后续事件到元素本身
    el.addEventListener("pointermove", handleDragMove);
    el.addEventListener("pointerup", handleDragEnd);
    el.addEventListener("pointercancel", handleDragEnd);
  }

  // 2. 拖拽中
  function handleDragMove(e: PointerEvent) {
    if (!isDragging || !draggableContainer.value) return;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // 阈值检查
    if (!hasMoved) {
      if (Math.hypot(dx, dy) < dragThreshold) return;
      hasMoved = true;
    }

    // 边界计算
    const el = draggableContainer.value;
    const parent = el.parentElement;
    if (!parent) return;

    let newLeft = initialLeft + dx;
    let newTop = initialTop + dy;

    // 限制在父容器内
    const maxLeft = parent.clientWidth - el.offsetWidth;
    const maxTop = parent.clientHeight - el.offsetHeight;

    newLeft = Math.max(0, Math.min(newLeft, maxLeft));
    newTop = Math.max(0, Math.min(newTop, maxTop));

    el.style.left = `${newLeft}px`;
    el.style.top = `${newTop}px`;
  }

  // 3. 结束拖拽
  function handleDragEnd(e: PointerEvent) {
    isDragging = false;

    if (draggableContainer.value) {
      const el = draggableContainer.value;
      el.style.cursor = "grab";

      // 释放捕获
      el.releasePointerCapture(e.pointerId);

      // 移除临时监听器
      el.removeEventListener("pointermove", handleDragMove);
      el.removeEventListener("pointerup", handleDragEnd);
      el.removeEventListener("pointercancel", handleDragEnd);

      // 记录最后位置
      lastPosition.value = {
        x: el.offsetLeft,
        y: el.offsetTop,
      };
    }
  }

  return {
    draggableContainer, // 绑定 ref="draggableContainer"
    setInitialPosition, // 用于初始化
    lastPosition, // 记录位置状态
    handleDragStart, // 绑定 @pointerdown="handleDragStart"
  };
}
