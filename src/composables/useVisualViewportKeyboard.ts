import { ref, computed } from "vue";

/** 低于该值视为 UI 抖动（地址栏等），不当作软键盘 */
const OBSCURED_BOTTOM_THRESHOLD_PX = 36;
/** FAB 与键盘顶缘的留白 */
const FAB_CLEARANCE_ABOVE_KEYBOARD_PX = 10;

function readInnerSize() {
  if (typeof window === "undefined") return { h: 600, w: 400 };
  const vv = window.visualViewport;
  return {
    h: vv?.height ?? window.innerHeight,
    w: vv?.width ?? window.innerWidth,
  };
}

function readObscuredBottomPx(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, Math.round(window.innerHeight - vv.offsetTop - vv.height));
}

/**
 * 基于 visualViewport 同步「可用视口」尺寸与底部被遮挡高度（软键盘 / iOS 输入条）。
 * rootCssVars 供页面根节点绑定，子组件通过继承使用 CSS 变量。
 */
export function useVisualViewportKeyboard() {
  const { h: ih, w: iw } = readInnerSize();
  const viewportInnerH = ref(ih);
  const viewportInnerW = ref(iw);
  const obscuredBottomRawPx = ref(typeof window !== "undefined" ? readObscuredBottomPx() : 0);

  function syncFromVisualViewport() {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (vv) {
      viewportInnerH.value = vv.height;
      viewportInnerW.value = vv.width;
      obscuredBottomRawPx.value = readObscuredBottomPx();
    } else {
      viewportInnerH.value = window.innerHeight;
      viewportInnerW.value = window.innerWidth;
      obscuredBottomRawPx.value = 0;
    }
  }

  const obscuredBottomEffectivePx = computed(() => {
    const r = obscuredBottomRawPx.value;
    return r >= OBSCURED_BOTTOM_THRESHOLD_PX ? r : 0;
  });

  /** 绑定到 Home 根节点，MobileHomeFab / ActivitySheet 继承 */
  const rootCssVars = computed(() => {
    const obscured = obscuredBottomEffectivePx.value;
    const fabLift = obscured > 0 ? obscured + FAB_CLEARANCE_ABOVE_KEYBOARD_PX : 0;
    return {
      "--vv-obscured-bottom": `${obscured}px`,
      "--vv-fab-lift": `${fabLift}px`,
    } as Record<string, string>;
  });

  function attachListeners() {
    if (typeof window === "undefined") return;
    syncFromVisualViewport();
    window.addEventListener("resize", syncFromVisualViewport);
    window.visualViewport?.addEventListener("resize", syncFromVisualViewport);
    window.visualViewport?.addEventListener("scroll", syncFromVisualViewport);
  }

  function detachListeners() {
    if (typeof window === "undefined") return;
    window.removeEventListener("resize", syncFromVisualViewport);
    window.visualViewport?.removeEventListener("resize", syncFromVisualViewport);
    window.visualViewport?.removeEventListener("scroll", syncFromVisualViewport);
  }

  return {
    viewportInnerH,
    viewportInnerW,
    rootCssVars,
    syncFromVisualViewport,
    attachListeners,
    detachListeners,
  };
}
