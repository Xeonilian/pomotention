// src/utils/touchHandler.ts

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let touchTarget: EventTarget | null = null;
const SWIPE_THRESHOLD = 50; // 滑动阈值（像素）
const TIME_THRESHOLD = 300; // 时间阈值（毫秒）

// 检查是否是交互元素（不应该阻止）
const isInteractiveElement = (target: EventTarget | null): boolean => {
  if (!target) return false;
  const element = target as HTMLElement;

  const interactiveSelectors = [
    "input",
    "textarea",
    "a",
    "button",
    ".n-input",
    ".n-input-wrapper",
    ".n-input__input",
    ".n-button",
    ".n-menu-item",
    ".n-menu-item-content",
    "[role='menuitem']",
    "[role='button']",
    "[role='link']",
    "router-link",
    "[contenteditable]",
  ];

  const isScrollable = element.closest(".n-scrollbar, .n-scrollbar-container, [data-scrollable]");
  if (isScrollable) return true;

  return interactiveSelectors.some((selector) => element.closest(selector) !== null);
};

const handleTouchStart = (e: TouchEvent) => {
  const touch = e.touches[0];
  if (!touch) return;

  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartTime = Date.now();
  touchTarget = e.target;
};

const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length === 0) return;

  if (isInteractiveElement(touchTarget)) {
    return;
  }

  const touch = e.touches[0];
  const deltaX = Math.abs(touch.clientX - touchStartX);
  const deltaY = Math.abs(touch.clientY - touchStartY);
  const deltaTime = Date.now() - touchStartTime;

  if (deltaX > SWIPE_THRESHOLD && deltaX > deltaY && deltaTime < TIME_THRESHOLD) {
    e.preventDefault();
  }
};

const handleTouchEnd = () => {
  touchStartX = 0;
  touchStartY = 0;
  touchStartTime = 0;
  touchTarget = null;
};

// 导出函数以添加事件监听
export const initializeTouchHandling = () => {
  document.addEventListener("touchstart", handleTouchStart, { passive: true });
  document.addEventListener("touchmove", handleTouchMove, { passive: false });
  document.addEventListener("touchend", handleTouchEnd, { passive: true });
};

// 导出函数以移除事件监听
export const cleanupTouchHandling = () => {
  document.removeEventListener("touchstart", handleTouchStart);
  document.removeEventListener("touchmove", handleTouchMove);
  document.removeEventListener("touchend", handleTouchEnd);
};
