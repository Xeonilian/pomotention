import { ref, computed } from "vue";

/** 低于该值视为 UI 抖动（地址栏等），不当作软键盘（仅用于 --vv-obscured-bottom，勿用于 FAB 锚点） */
const OBSCURED_BOTTOM_THRESHOLD_PX = 36;
/** FAB 与 visualViewport 底缘的留白 */
const FAB_CLEARANCE_ABOVE_KEYBOARD_PX = 8;
/** FAB 块近似高度（大圆钮 + 阴影） */
const FAB_ANCHOR_HEIGHT_PX = 50;
/** 原始底部遮挡 ≥ 此值时认为软键盘已弹出（单独判键盘，不受 36px 阈值影响） */
const FAB_KEYBOARD_RAW_OBSCURED_MIN_PX = 72;
/** 键盘弹出后把 FAB 再下移若干像素，缓解 iOS 上 vv 底缘高于实际可视底导致的「悬空偏高」 */
const FAB_KEYBOARD_EXTRA_DOWN_PX = 26;

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
  /** 与 obscured 公式同源，供 FAB 锚定 visualViewport 底缘（避免阈值把 lift 清零导致 FAB 掉进键盘区） */
  const vvOffsetTop = ref(0);
  const vvHeight = ref(ih);

  function syncFromVisualViewport() {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (vv) {
      viewportInnerH.value = vv.height;
      viewportInnerW.value = vv.width;
      obscuredBottomRawPx.value = readObscuredBottomPx();
      vvOffsetTop.value = vv.offsetTop;
      vvHeight.value = vv.height;
    } else {
      viewportInnerH.value = window.innerHeight;
      viewportInnerW.value = window.innerWidth;
      obscuredBottomRawPx.value = 0;
      vvOffsetTop.value = 0;
      vvHeight.value = window.innerHeight;
    }
  }

  const obscuredBottomEffectivePx = computed(() => {
    const r = obscuredBottomRawPx.value;
    return r >= OBSCURED_BOTTOM_THRESHOLD_PX ? r : 0;
  });

  /** 绑定到 Home 根节点，MobileHomeFab / ActivitySheet 继承 */
  const rootCssVars = computed(() => {
    const obscured = obscuredBottomEffectivePx.value;
    const rawObscured = obscuredBottomRawPx.value;
    const keyboardOpen = rawObscured >= FAB_KEYBOARD_RAW_OBSCURED_MIN_PX;
    const fabTop = Math.max(
      6,
      Math.round(
        vvOffsetTop.value +
          vvHeight.value -
          FAB_ANCHOR_HEIGHT_PX -
          FAB_CLEARANCE_ABOVE_KEYBOARD_PX +
          (keyboardOpen ? FAB_KEYBOARD_EXTRA_DOWN_PX : 0),
      ),
    );
    return {
      "--vv-obscured-bottom": `${obscured}px`,
      "--vv-fab-top": `${fabTop}px`,
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
