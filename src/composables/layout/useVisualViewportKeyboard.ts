import { ref, computed } from "vue";

const FAB_CLEARANCE_ABOVE_KEYBOARD_PX = 8;
const FAB_ANCHOR_HEIGHT_PX = 50;
/** 与 FAB 侧判定同源：外层可用来关掉「追着变色视口跑」的 layout transition */
export const VISUAL_KEYBOARD_OVERLAP_MIN_PX = 72;
const FAB_KEYBOARD_RAW_OBSCURED_MIN_PX = VISUAL_KEYBOARD_OVERLAP_MIN_PX;
const FAB_KEYBOARD_EXTRA_DOWN_PX = 26;

function readInnerSize() {
  if (typeof window === "undefined") return { h: 600, w: 400 };
  const vv = window.visualViewport;
  return {
    h: vv?.height ?? window.innerHeight,
    w: vv?.width ?? window.innerWidth,
  };
}

export function readObscuredBottomRawPx(): number {
  if (typeof window === "undefined") return 0;
  const vv = window.visualViewport;
  if (!vv) return 0;
  return Math.max(0, Math.round(window.innerHeight - vv.offsetTop - vv.height));
}

/** 注入 --vv-fab-top；不设 --vv-obscured-bottom，避免与 MainLayout --app-vvh 重复补偿键盘 */
export function useVisualViewportKeyboard() {
  const { h: ih, w: iw } = readInnerSize();
  const viewportInnerH = ref(ih);
  const viewportInnerW = ref(iw);
  const vvOffsetTop = ref(0);
  const vvHeight = ref(ih);
  const obscuredBottomRawPx = ref(typeof window !== "undefined" ? readObscuredBottomRawPx() : 0);

  function syncFromVisualViewport() {
    if (typeof window === "undefined") return;
    const vv = window.visualViewport;
    if (vv) {
      viewportInnerH.value = vv.height;
      viewportInnerW.value = vv.width;
      vvOffsetTop.value = vv.offsetTop;
      vvHeight.value = vv.height;
      obscuredBottomRawPx.value = readObscuredBottomRawPx();
    } else {
      viewportInnerH.value = window.innerHeight;
      viewportInnerW.value = window.innerWidth;
      vvOffsetTop.value = 0;
      vvHeight.value = window.innerHeight;
      obscuredBottomRawPx.value = 0;
    }
  }

  /** 视口底部被遮挡超过阈值时近似视为系统键盘展开（Android/iOS 通用启发式） */
  const isKeyboardOverlapApprox = computed(() => obscuredBottomRawPx.value >= FAB_KEYBOARD_RAW_OBSCURED_MIN_PX);

  const rootCssVars = computed(() => {
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
    isKeyboardOverlapApprox,
    rootCssVars,
    syncFromVisualViewport,
    attachListeners,
    detachListeners,
  };
}
