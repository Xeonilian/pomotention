import { ref, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useUIStore } from "@/stores/useUIStore";

export function useDraggable(dragThreshold: number = 5) {
  const draggableContainer = ref<HTMLElement | null>(null);
  const isDragging = ref(false);
  const startX = ref(0);
  const startY = ref(0);
  const initialX = ref(0);
  const initialY = ref(0);
  const hasPassedThreshold = ref(false);
  const lastPosition = ref({ x: -1, y: -1 });

  const uiStore = useUIStore();

  const getEventCoordinates = (e: MouseEvent | TouchEvent): { x: number; y: number } => {
    if (e instanceof TouchEvent) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch.clientX, y: touch.clientY };
    }
    return { x: e.clientX, y: e.clientY };
  };

  const handleStart = (e: MouseEvent | TouchEvent) => {
    if (draggableContainer.value) {
      if (!draggableContainer.value.contains(e.target as Node)) {
        return;
      }

      // 检查点击的目标是否是输入框相关元素
      const target = e.target as HTMLElement;
      const isInputElement = target.closest(
        "input, textarea, .n-input, .n-input-wrapper, .n-input__input"
      );

      if (isInputElement) {
        // 如果是输入框相关元素，跳过拖拽处理
        return;
      }

      // 对于鼠标事件，只处理左键
      if (e instanceof MouseEvent && e.button !== 0) {
        return;
      }

      const coords = getEventCoordinates(e);
      isDragging.value = true;
      hasPassedThreshold.value = false;
      startX.value = coords.x;
      startY.value = coords.y;

      const rect = draggableContainer.value.getBoundingClientRect();
      initialX.value = rect.left;
      initialY.value = rect.top;

      draggableContainer.value.style.cursor = "grabbing";
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
      e.preventDefault();
    }
  };

  const handleMouseDown = (e: MouseEvent) => {
    handleStart(e);
  };

  const handleTouchStart = (e: TouchEvent) => {
    handleStart(e);
  };

  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value || !draggableContainer.value) return;

    const coords = getEventCoordinates(e);
    const deltaX = coords.x - startX.value;
    const deltaY = coords.y - startY.value;

    if (!hasPassedThreshold.value) {
      const distance = Math.hypot(deltaX, deltaY);
      if (distance < dragThreshold) {
        return;
      }
      hasPassedThreshold.value = true;
    }

    const parentElement = draggableContainer.value.parentElement;
    if (!parentElement) {
      console.warn("Draggable container has no parent element.");
      return;
    }

    const parentWidth = parentElement.clientWidth;
    const parentHeight = parentElement.clientHeight;

    const elementWidth = draggableContainer.value.offsetWidth;
    const elementHeight = draggableContainer.value.offsetHeight;

    const parentRect = parentElement.getBoundingClientRect();

    let newX = initialX.value + deltaX - parentRect.left;
    let newY = initialY.value + deltaY - parentRect.top;

    newX = Math.max(0, Math.min(newX, parentWidth - elementWidth));
    newY = Math.max(0, Math.min(newY, parentHeight - elementHeight));

    draggableContainer.value.style.left = `${newX}px`;
    draggableContainer.value.style.top = `${newY}px`;

    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e);
  };

  const handleTouchMove = (e: TouchEvent) => {
    handleMove(e);
  };

  const handleEnd = () => {
    isDragging.value = false;
    hasPassedThreshold.value = false;
    if (draggableContainer.value) {
      draggableContainer.value.style.cursor = "grab";
      lastPosition.value = {
        x: draggableContainer.value.offsetLeft,
        y: draggableContainer.value.offsetTop,
      };
    }
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
    document.removeEventListener("touchmove", handleTouchMove);
    document.removeEventListener("touchend", handleTouchEnd);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  const setInitialPosition = () => {
    if (draggableContainer.value) {
      const parentElement = draggableContainer.value.parentElement;
      if (!parentElement) {
        console.error("Draggable container has no parent element on mount!");
        return;
      }

      // Use lastPosition to set the draggable container's position, if available
      const parentWidth = parentElement.clientWidth;
      const parentHeight = parentElement.clientHeight;

      // Use actual element dimensions
      const elementWidth = draggableContainer.value.offsetWidth || 220;
      const elementHeight = draggableContainer.value.offsetHeight || 350;

      let initialPosLeft, initialPosTop;

      // Use lastPosition if available, fallback to default position
      if (lastPosition.value.x !== -1 || lastPosition.value.y !== -1) {
        initialPosLeft = lastPosition.value.x;
        initialPosTop = lastPosition.value.y;
      } else {
        // Calculate initial position to keep the element within the visible area.
        const horizontalMargin = 20; // Adjust as needed
        const verticalMargin = 20; // Adjust as needed

        initialPosLeft = Math.max(
          0,
          parentWidth - elementWidth - horizontalMargin
        );
        initialPosTop = Math.max(
          0,
          parentHeight - elementHeight - verticalMargin
        );
      }

      draggableContainer.value.style.left = `${initialPosLeft}px`;
      draggableContainer.value.style.top = `${initialPosTop}px`;
    }
  };

  onMounted(() => {
    if (draggableContainer.value) {
      setInitialPosition();
      draggableContainer.value.addEventListener("mousedown", handleMouseDown);
      draggableContainer.value.addEventListener("touchstart", handleTouchStart, { passive: false });
    }
  });

  onUnmounted(() => {
    if (draggableContainer.value) {
      draggableContainer.value.removeEventListener(
        "mousedown",
        handleMouseDown
      );
      draggableContainer.value.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    }
  });

  watch(
    () => uiStore.showPomodoroPanel,
    (newValue) => {
      if (newValue && draggableContainer.value) {
        draggableContainer.value.addEventListener("mousedown", handleMouseDown);
        draggableContainer.value.addEventListener("touchstart", handleTouchStart, { passive: false });
        draggableContainer.value.style.visibility = "visible";
        nextTick(() => {
          setInitialPosition();
        });
      }
    }
  );

  return {
    draggableContainer,
    isDragging,
    lastPosition,
    handleMouseDown,
    setInitialPosition,
  };
}
