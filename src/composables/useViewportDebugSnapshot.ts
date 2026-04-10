import { ref, onMounted, onUnmounted } from "vue";

/** 单次采样的结构化数据，供设置页展示与导出 */
export type ViewportDebugSnapshot = {
  capturedAt: string;
  inner: { w: number; h: number };
  outer: { w: number; h: number } | null;
  screen: { w: number; h: number; availW: number; availH: number };
  dpr: number;
  docEl: { clientW: number; clientH: number; scrollW: number; scrollH: number };
  visualViewport: null | {
    width: number;
    height: number;
    scale: number;
    offsetTop: number;
    offsetLeft: number;
    pageLeft: number;
    pageTop: number;
  };
  scroll: { x: number; y: number };
  orientation: { landscapeMm: boolean; type: string | null; angle: number | null };
  /** 通过离屏 probe 读 env(safe-area-inset-*) 解析结果（与 CSS 一致） */
  safeArea: { top: string; right: string; bottom: string; left: string };
  cssVars: { appVvh: string };
  dom: {
    app: null | { w: number; h: number; top: number; left: number };
    appLayout: null | { w: number; h: number; top: number; left: number };
    header: null | { w: number; h: number; top: number; left: number };
  };
};

/** 用离屏节点让 getComputedStyle 解析 env(safe-area-inset-*) */
function readSafeAreaInsetsResolved(): { top: string; right: string; bottom: string; left: string } {
  if (typeof document === "undefined") {
    return { top: "n/a", right: "n/a", bottom: "n/a", left: "n/a" };
  }
  const el = document.createElement("div");
  el.setAttribute("data-viewport-debug-probe", "1");
  el.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1px;height:1px;visibility:hidden;pointer-events:none;box-sizing:border-box;";
  el.style.paddingTop = "env(safe-area-inset-top, 0px)";
  el.style.paddingRight = "env(safe-area-inset-right, 0px)";
  el.style.paddingBottom = "env(safe-area-inset-bottom, 0px)";
  el.style.paddingLeft = "env(safe-area-inset-left, 0px)";
  document.body.appendChild(el);
  const cs = getComputedStyle(el);
  const out = {
    top: cs.paddingTop,
    right: cs.paddingRight,
    bottom: cs.paddingBottom,
    left: cs.paddingLeft,
  };
  el.remove();
  return out;
}

function readRect(selector: string): ViewportDebugSnapshot["dom"]["app"] {
  if (typeof document === "undefined") return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { w: Math.round(r.width * 100) / 100, h: Math.round(r.height * 100) / 100, top: Math.round(r.top * 100) / 100, left: Math.round(r.left * 100) / 100 };
}

export function captureViewportDebugSnapshot(): ViewportDebugSnapshot {
  if (typeof window === "undefined") {
    return {
      capturedAt: new Date().toISOString(),
      inner: { w: 0, h: 0 },
      outer: null,
      screen: { w: 0, h: 0, availW: 0, availH: 0 },
      dpr: 1,
      docEl: { clientW: 0, clientH: 0, scrollW: 0, scrollH: 0 },
      visualViewport: null,
      scroll: { x: 0, y: 0 },
      orientation: { landscapeMm: false, type: null, angle: null },
      safeArea: { top: "n/a", right: "n/a", bottom: "n/a", left: "n/a" },
      cssVars: { appVvh: "" },
      dom: { app: null, appLayout: null, header: null },
    };
  }

  const vv = window.visualViewport;
  const de = document.documentElement;
  const o = window.screen?.orientation;

  return {
    capturedAt: new Date().toISOString(),
    inner: { w: window.innerWidth, h: window.innerHeight },
    outer:
      window.outerWidth && window.outerHeight
        ? { w: window.outerWidth, h: window.outerHeight }
        : null,
    screen: {
      w: window.screen?.width ?? 0,
      h: window.screen?.height ?? 0,
      availW: window.screen?.availWidth ?? 0,
      availH: window.screen?.availHeight ?? 0,
    },
    dpr: window.devicePixelRatio ?? 1,
    docEl: {
      clientW: de.clientWidth,
      clientH: de.clientHeight,
      scrollW: de.scrollWidth,
      scrollH: de.scrollHeight,
    },
    visualViewport: vv
      ? {
          width: vv.width,
          height: vv.height,
          scale: vv.scale,
          offsetTop: vv.offsetTop,
          offsetLeft: vv.offsetLeft,
          pageLeft: vv.pageLeft,
          pageTop: vv.pageTop,
        }
      : null,
    scroll: { x: window.scrollX, y: window.scrollY },
    orientation: {
      landscapeMm: typeof window.matchMedia === "function" ? window.matchMedia("(orientation: landscape)").matches : false,
      type: o?.type ?? null,
      angle: typeof o?.angle === "number" ? o.angle : null,
    },
    safeArea: readSafeAreaInsetsResolved(),
    cssVars: {
      appVvh: de.style.getPropertyValue("--app-vvh").trim() || getComputedStyle(de).getPropertyValue("--app-vvh").trim(),
    },
    dom: {
      app: readRect("#app"),
      appLayout: readRect(".app-layout"),
      header: readRect(".app-layout__header"),
    },
  };
}

export function formatViewportDebugReport(s: ViewportDebugSnapshot): string {
  const vv = s.visualViewport;
  return [
    "=== Pomotention 视口 / safe-area / 布局调试快照 ===",
    `采集时间(ISO): ${s.capturedAt}`,
    "",
    "[window]",
    `  inner: ${s.inner.w} × ${s.inner.h}`,
    `  outer: ${s.outer ? `${s.outer.w} × ${s.outer.h}` : "(n/a)"}`,
    `  scroll: ${s.scroll.x}, ${s.scroll.y}`,
    `  devicePixelRatio: ${s.dpr}`,
    "",
    "[screen]",
    `  size: ${s.screen.w} × ${s.screen.h}`,
    `  avail: ${s.screen.availW} × ${s.screen.availH}`,
    "",
    "[documentElement]",
    `  client: ${s.docEl.clientW} × ${s.docEl.clientH}`,
    `  scroll: ${s.docEl.scrollW} × ${s.docEl.scrollH}`,
    "",
    "[visualViewport]",
    vv
      ? [
          `  width × height: ${vv.width} × ${vv.height}`,
          `  scale: ${vv.scale}`,
          `  offsetTop / offsetLeft: ${vv.offsetTop} / ${vv.offsetLeft}`,
          `  pageTop / pageLeft: ${vv.pageTop} / ${vv.pageLeft}`,
        ].join("\n")
      : "  (无 VisualViewport API)",
    "",
    "[orientation]",
    `  matchMedia(landscape): ${s.orientation.landscapeMm}`,
    `  screen.orientation.type: ${s.orientation.type ?? "(n/a)"}`,
    `  screen.orientation.angle: ${s.orientation.angle ?? "(n/a)"}`,
    "",
    "[env safe-area 解析值（离屏 probe，与 CSS env() 一致）]",
    `  top / right / bottom / left: ${s.safeArea.top} / ${s.safeArea.right} / ${s.safeArea.bottom} / ${s.safeArea.left}`,
    "",
    "[CSS 变量]",
    `  --app-vvh: ${s.cssVars.appVvh || "(未设置)"}`,
    "",
    "[getBoundingClientRect]",
    `  #app: ${s.dom.app ? `${s.dom.app.w}×${s.dom.app.h} @ (${s.dom.app.left},${s.dom.app.top})` : "(未找到)"}`,
    `  .app-layout: ${s.dom.appLayout ? `${s.dom.appLayout.w}×${s.dom.appLayout.h} @ (${s.dom.appLayout.left},${s.dom.appLayout.top})` : "(未找到；可能不在 MainLayout)"}`,
    `  .app-layout__header: ${s.dom.header ? `${s.dom.header.w}×${s.dom.header.h} @ (${s.dom.header.left},${s.dom.header.top})` : "(未找到)"}`,
    "",
    "[说明]",
    "  横屏点击偏移 / 底缝：对照 inner vs visualViewport、offsetTop/Left、#app 与 .app-layout 高度；",
    "  若 vv.height 与 #app 高度长期不一致，易出现空白带或命中叠加。",
  ].join("\n");
}

/**
 * 在设置页持续订阅 resize / visualViewport；卸载时移除监听
 */
export function useViewportDebugSnapshot() {
  const snapshot = ref<ViewportDebugSnapshot | null>(null);

  let debounceTimer: ReturnType<typeof window.setTimeout> | undefined;

  function refresh() {
    snapshot.value = captureViewportDebugSnapshot();
  }

  function scheduleRefresh() {
    if (typeof window === "undefined") return;
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(() => refresh(), 60);
  }

  onMounted(() => {
    refresh();
    window.addEventListener("resize", scheduleRefresh);
    window.addEventListener("orientationchange", scheduleRefresh);
    window.visualViewport?.addEventListener("resize", scheduleRefresh);
    window.visualViewport?.addEventListener("scroll", scheduleRefresh);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", scheduleRefresh);
    window.removeEventListener("orientationchange", scheduleRefresh);
    window.visualViewport?.removeEventListener("resize", scheduleRefresh);
    window.visualViewport?.removeEventListener("scroll", scheduleRefresh);
    window.clearTimeout(debounceTimer);
  });

  return {
    snapshot,
    refresh,
    buildReport: () => (snapshot.value ? formatViewportDebugReport(snapshot.value) : "暂无快照，请刷新页面后重试。"),
  };
}
