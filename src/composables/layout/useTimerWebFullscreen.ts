import { ref } from "vue";

/** Web / PWA 计时器全屏：优先原生 Fullscreen API，失败则降级为 fixed 伪全屏 */
export function useTimerWebFullscreen() {
  const isPseudoFullscreen = ref(false);
  let suppressExitHandler = false;
  let prevBodyOverflow: string | null = null;
  let onDismiss: (() => void) | null = null;
  let listenerBound = false;

  function setOnDismiss(callback: (() => void) | null) {
    onDismiss = callback;
  }

  function handleFullscreenChange() {
    if (suppressExitHandler || isPseudoFullscreen.value) return;
    if (!document.fullscreenElement) {
      onDismiss?.();
    }
  }

  function bindListener() {
    if (listenerBound || typeof document === "undefined") return;
    listenerBound = true;
    document.addEventListener("fullscreenchange", handleFullscreenChange);
  }

  function unbindListener() {
    if (!listenerBound || typeof document === "undefined") return;
    listenerBound = false;
    document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }

  function enablePseudo(rootEl: HTMLElement | null) {
    if (isPseudoFullscreen.value) return;
    isPseudoFullscreen.value = true;
    rootEl?.classList.add("is-web-pseudo-fullscreen");
    prevBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  function disablePseudo(rootEl: HTMLElement | null) {
    if (!isPseudoFullscreen.value) return;
    isPseudoFullscreen.value = false;
    rootEl?.classList.remove("is-web-pseudo-fullscreen");
    if (prevBodyOverflow != null) {
      document.body.style.overflow = prevBodyOverflow;
    } else {
      document.body.style.overflow = "";
    }
    prevBodyOverflow = null;
  }

  function canNativeFullscreen(el: Element | null): el is HTMLElement & { requestFullscreen: () => Promise<void> } {
    return (
      !!el &&
      "requestFullscreen" in document &&
      (document as Document).fullscreenEnabled !== false &&
      typeof (el as HTMLElement).requestFullscreen === "function"
    );
  }

  async function tryNativeFullscreen(el: HTMLElement): Promise<boolean> {
    if (!canNativeFullscreen(el)) return false;
    try {
      if (document.fullscreenElement && document.fullscreenElement !== el) {
        await document.exitFullscreen();
      }
      const opts: FullscreenOptions = { navigationUI: "hide" };
      await el.requestFullscreen(opts);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const fs = document.fullscreenElement;
      return fs === el || fs === document.documentElement;
    } catch {
      return false;
    }
  }

  async function enter(rootEl: HTMLElement | null): Promise<void> {
    if (typeof document === "undefined") return;
    bindListener();
    disablePseudo(rootEl);

    // documentElement 优先：避免对内容宽度的 wrapper 全屏时左右留边/裁切背景
    if (await tryNativeFullscreen(document.documentElement)) return;
    if (rootEl && (await tryNativeFullscreen(rootEl))) return;

    enablePseudo(rootEl);
  }

  async function exit(rootEl: HTMLElement | null): Promise<void> {
    if (typeof document === "undefined") return;
    suppressExitHandler = true;
    try {
      disablePseudo(rootEl);
      if (document.fullscreenElement && document.exitFullscreen) {
        try {
          await document.exitFullscreen();
        } catch {
          /* 忽略 */
        }
      }
    } finally {
      suppressExitHandler = false;
    }
  }

  function cleanup(rootEl: HTMLElement | null) {
    void exit(rootEl);
    unbindListener();
    onDismiss = null;
  }

  return {
    isPseudoFullscreen,
    setOnDismiss,
    bindListener,
    enter,
    exit,
    cleanup,
  };
}
