// src/composables/useDraggable.ts
import { ref, nextTick, watch } from "vue";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDevice } from "./useDevice";

export function useDraggable(dragThreshold = 5) {
  const draggableContainer = ref<HTMLElement | null>(null);
  const lastPosition = ref({ x: -1, y: -1 });
  const settingStore = useSettingStore();
  const { isMobile } = useDevice();

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
    const defaultOffsetY = isMobile ? 20 : 0;

    // 如果有历史位置，优先使用
    if (lastPosition.value.x !== -1) {
      targetLeft = lastPosition.value.x;
      targetTop = lastPosition.value.y;
    } else {
      // 默认右下角
      const margin = 20;
      targetLeft = Math.max(0, parentWidth - elementWidth - margin);
      targetTop = Math.max(0, parentHeight - elementHeight - margin - defaultOffsetY);
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
    if (target.closest("input, textarea, button, .n-input, .n-slider, .state-text, .state-text-clickable")) return;

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

  // 以下边为基准重新定位，避免 showPomoSeq 展开时超出视口
  // 不传 customHeight 时用容器实际 offsetHeight（含 border/padding），更准
  function repositionToBottom(customHeight?: number) {
    if (!draggableContainer.value) return;
    const parent = draggableContainer.value.parentElement;
    if (!parent) return;
    const margin = 20;
    const parentHeight = parent.clientHeight;
    const el = draggableContainer.value;
    const height = customHeight ?? el.offsetHeight ?? 140;
    // 若传了 customHeight 则加一点余量，避免上报值比实际渲染略小
    const heightUsed = customHeight != null ? customHeight + 12 : height;
    const top = Math.max(0, parentHeight - heightUsed - margin);
    const left = el.offsetLeft;
    el.style.top = `${top}px`;
    el.style.left = `${left}px`;
    lastPosition.value = { x: left, y: top };
  }

  // 检查并调整位置，只在超出边界时才重定位，否则保持当前位置
  function ensureWithinBounds(customWidth?: number, customHeight?: number) {
    if (!draggableContainer.value) return;
    const parent = draggableContainer.value.parentElement;
    if (!parent) return;

    const el = draggableContainer.value;
    const margin = 20;
    const parentWidth = parent.clientWidth;
    const parentHeight = parent.clientHeight;

    // 获取当前实际尺寸或使用传入的尺寸
    const elementWidth = customWidth ?? el.offsetWidth ?? 220;
    const elementHeight = customHeight ?? el.offsetHeight ?? 140;
    const heightUsed = customHeight != null ? customHeight + 12 : elementHeight;

    // 获取当前位置
    const currentLeft = el.offsetLeft;
    const currentTop = el.offsetTop;

    // 计算边界
    const maxLeft = parentWidth - elementWidth - margin;
    const maxTop = parentHeight - heightUsed - margin;
    const minLeft = margin;
    const minTop = margin;

    // 检查是否需要调整位置
    let needsAdjustment = false;
    let newLeft = currentLeft;
    let newTop = currentTop;

    // 检查右边界和左边界
    if (currentLeft + elementWidth + margin > parentWidth) {
      newLeft = Math.max(minLeft, maxLeft);
      needsAdjustment = true;
    } else if (currentLeft < minLeft) {
      newLeft = minLeft;
      needsAdjustment = true;
    }

    // 检查下边界和上边界
    if (currentTop + heightUsed + margin > parentHeight) {
      newTop = Math.max(minTop, maxTop);
      needsAdjustment = true;
    } else if (currentTop < minTop) {
      newTop = minTop;
      needsAdjustment = true;
    }

    // 只在需要时才更新位置
    if (needsAdjustment) {
      el.style.left = `${newLeft}px`;
      el.style.top = `${newTop}px`;
      lastPosition.value = { x: newLeft, y: newTop };
    }
  }

  // 控制 Draggable 容器的位置和显示
  async function updateDraggableContainerVisibility(show: boolean) {
    await nextTick();
    if (draggableContainer.value) {
      if (show) {
        setInitialPosition();
        draggableContainer.value.style.visibility = "visible";
      } else {
        // 记录位置以便恢复
        lastPosition.value = {
          x: draggableContainer.value.offsetLeft,
          y: draggableContainer.value.offsetTop,
        };
        draggableContainer.value.style.visibility = "hidden";
      }
    }
  }

  // 当退出 Mini 模式时的回调
  async function onExitMiniMode() {
    lastPosition.value = { x: -1, y: -1 };
    await updateDraggableContainerVisibility(true);
  }

  // 监听番茄钟显示开关
  watch(
    () => settingStore.settings.showPomodoro,
    async (newVal) => {
      await updateDraggableContainerVisibility(newVal);
    }
  );

  return {
    draggableContainer, // 绑定 ref="draggableContainer"
    setInitialPosition, // 用于初始化
    repositionToBottom, // 以下边为基准重新定位（showPomoSeq 展开/收缩时用）
    ensureWithinBounds, // 检查并调整位置，只在超出边界时才重定位
    lastPosition, // 记录位置状态
    handleDragStart, // 绑定 @pointerdown="handleDragStart"
    updateDraggableContainerVisibility, // 控制可见性
    onExitMiniMode, // 退出 Mini 模式回调
  };
}
