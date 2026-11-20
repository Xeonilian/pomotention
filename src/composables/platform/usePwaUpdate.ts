import { markPwaUpdating } from "@/composables/platform/chunkReloadGuard";

/** 避免重复弹出「下载失败」 */
let installFailPromptShown = false;
/** 首页 shell 就绪后才允许处理 waiting */
let shellReady = false;
/** shell 就绪前发现的 waiting 注册，延后处理 */
let pendingWaitingReg: ServiceWorkerRegistration | null = null;

/** 页面加载时是否已有 controller：无则表示首次接管，不要整页刷新 */
const hadControllerOnLoad =
  typeof navigator !== "undefined" && "serviceWorker" in navigator
    ? !!navigator.serviceWorker.controller
    : false;

/** controllerchange 在后台触发时挂起的 visibility 监听，dispose 时移除 */
let pendingVisibilityReloadHandler: (() => void) | null = null;

function removePendingVisibilityReload() {
  if (pendingVisibilityReloadHandler) {
    document.removeEventListener("visibilitychange", pendingVisibilityReloadHandler);
    pendingVisibilityReloadHandler = null;
  }
}

type NotificationApi = ReturnType<typeof import("naive-ui").useNotification>;

function markUpdatingAndReload() {
  try {
    if (sessionStorage.getItem("sw-act-reload")) return;
    sessionStorage.setItem("sw-act-reload", "1");
  } catch {
    /* 隐私模式等 */
  }
  markPwaUpdating();
  try {
    window.location.replace(window.location.href);
  } catch {
    window.location.reload();
  }
}

function applyWaitingWorker(reg: ServiceWorkerRegistration) {
  markPwaUpdating();
  reg.waiting?.postMessage({ type: "SKIP_WAITING" });
}

/** 新 SW 已在 waiting：直接应用（不再弹「网站已更新」） */
function applyWhenReady(reg: ServiceWorkerRegistration) {
  if (!reg.waiting) return;
  if (!shellReady) {
    pendingWaitingReg = reg;
    return;
  }
  applyWaitingWorker(reg);
}

function promptInstallFailed(notification: NotificationApi) {
  if (installFailPromptShown) return;
  installFailPromptShown = true;
  notification.warning({
    title: "更新下载失败",
    content: "将保持当前版本，下次启动会自动重试。",
    duration: 8000,
    closable: true,
  });
}

function bindWaitingDetection(reg: ServiceWorkerRegistration, notification: NotificationApi) {
  if (reg.waiting) {
    applyWhenReady(reg);
  }

  reg.addEventListener("updatefound", () => {
    const installing = reg.installing;
    if (!installing) return;

    installing.addEventListener("statechange", () => {
      // installed 且已有旧 controller = 真正的版本升级
      if (installing.state === "installed" && navigator.serviceWorker.controller) {
        applyWhenReady(reg);
      }
      if (installing.state === "redundant") {
        promptInstallFailed(notification);
      }
    });
  });
}

/** 冷启动后再查 SW 更新，避免与首屏争抢网络 */
const SW_UPDATE_DEFER_MS = 3000;

function scheduleSwUpdate(reg: ServiceWorkerRegistration) {
  const run = () => void reg.update();
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => run(), { timeout: SW_UPDATE_DEFER_MS });
  } else {
    setTimeout(run, SW_UPDATE_DEFER_MS);
  }
}

/**
 * 生产环境 Web：注册 SW、自动应用 waiting 版本；与 Tauri 桌面版无关
 */
export function usePwaUpdate(notification: NotificationApi) {
  let refreshing = false;

  const onShellReady = () => {
    shellReady = true;
    if (pendingWaitingReg) {
      const reg = pendingWaitingReg;
      pendingWaitingReg = null;
      applyWhenReady(reg);
    }
  };

  const onControllerChange = () => {
    // 首次被 SW 接管（主屏幕第一次开常见）：页面本身已是新文档，勿再刷成「正在更新…」
    if (!hadControllerOnLoad) return;
    if (refreshing) return;

    if (document.visibilityState === "visible") {
      refreshing = true;
      removePendingVisibilityReload();
      markUpdatingAndReload();
      return;
    }

    if (pendingVisibilityReloadHandler) return;

    const handler = () => {
      if (document.visibilityState !== "visible") return;
      if (refreshing) return;
      refreshing = true;
      removePendingVisibilityReload();
      markUpdatingAndReload();
    };
    pendingVisibilityReloadHandler = handler;
    document.addEventListener("visibilitychange", handler);
  };

  const init = () => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    shellReady = false;
    pendingWaitingReg = null;
    window.addEventListener("pwa-shell-ready", onShellReady);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    window.setTimeout(() => {
      void navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          bindWaitingDetection(reg, notification);
          scheduleSwUpdate(reg);
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          if (msg.includes("aborted") || (err as DOMException)?.name === "AbortError") {
            console.log("[SW] registration aborted during page unload/reload");
            return;
          }
          console.error("❌ Service Worker registration failed:", err);
        });
    }, 0);
  };

  const dispose = () => {
    window.removeEventListener("pwa-shell-ready", onShellReady);
    navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    removePendingVisibilityReload();
  };

  return { init, dispose };
}
