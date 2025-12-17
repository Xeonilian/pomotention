// src/composables/useDevice.ts
import { ref, computed } from "vue";
import { isTauri } from "@tauri-apps/api/core";

// 提取为全局单例，避免多组件重复监听 resize
const width = ref(typeof window !== "undefined" ? window.innerWidth : 1024);
const userAgent = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";

const updateDimensions = () => {
  width.value = window.innerWidth;
};

// 确保只在客户端环境执行监听
if (typeof window !== "undefined") {
  window.addEventListener("resize", updateDimensions);
}

export function useDevice() {
  const isTauriApp = isTauri();

  // 基础特性检测
  // 注意：maxTouchPoints 在某些桌面浏览器也可能 > 0，但这通常意味着它确实支持触摸
  const isTouchSupported = typeof window !== "undefined" && ("ontouchstart" in window || navigator.maxTouchPoints > 0);

  const isMobile = computed(() => {
    const isSmallScreen = width.value < 768;
    // 增加 iPad|Android 平板的排除逻辑，避免平板被误判为 mobile 手机
    const isMobileUA = /iphone|ipod|android.*mobile|windows phone/.test(userAgent);
    return (isSmallScreen && isTouchSupported) || isMobileUA;
  });

  const isTablet = computed(() => {
    // 你的逻辑基本是对的，但要小心 Android 手机被误判
    const isIpad = /ipad/.test(userAgent) || (/macintosh/.test(userAgent) && isTouchSupported);
    const isAndroidTablet = /android/.test(userAgent) && !/mobile/.test(userAgent);

    // 如果已经是手机，就不算平板
    if (isMobile.value) return false;

    return isIpad || isAndroidTablet || (width.value >= 768 && width.value <= 1024 && isTouchSupported);
  });

  const isDesktop = computed(() => {
    return !isMobile.value && !isTablet.value;
  });

  return {
    isTauri: isTauriApp,
    isWeb: !isTauriApp,
    isMobile,
    isTablet,
    isDesktop,
    isTouchSupported, // 组件应该用这个来决定是否开启触摸增强，而不是关闭鼠标
    width,
  };
}
