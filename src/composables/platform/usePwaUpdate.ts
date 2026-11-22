import { markPwaUpdating } from "@/composables/platform/chunkReloadGuard";

/**
 * A/B 对照：关 SW（不 register，并卸掉已有 registration）。
 * true = 关；确认对照结束后改回 false。
 */
const DISABLE_SERVICE_WORKER = true;

/** 避免重复弹出「下载失败」 */
let installFailPromptShown = false;
/** 首页 shell 就绪后才注册 SW / 处理 waiting */
let shellReady = false;
let pendingWaitingReg: ServiceWorkerRegistration | null = null;
let swRegisterStarted = false;

/** 页面加载时是否已有 controller：无则表示首次接管，不要整页刷新 */
const hadControllerOnLoad =
  typeof navigator !== "undefined" && "serviceWorker" in navigator
    ? !!navigator.serviceWorker.controller
    : false;

let pendingVisibilityReloadHandler: (() => void) | null = null;

function removePendingVisibilityReload() {
  if (pendingVisibilityReloadHandler) {
    document.removeEventListener("visibilitychange", pendingVisibilityReloadHandler);
    pendingVisibilityReloadHandler = null;
  }
}

type NotificationApi = ReturnType<typeof import("naive-ui").useNotification>;

declare global {
  interface Window {
    /** App 进首页后置位，避免 SW 注册晚于 shell-ready 事件 */
    __POMO_SHELL_READY__?: boolean;
  }
}

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
      if (installing.state === "installed" && navigator.serviceWorker.controller) {
        applyWhenReady(reg);
      }
      if (installing.state === "redundant") {
        promptInstallFailed(notification);
      }
    });
  });
}

const SW_UPDATE_DEFER_MS = 3000;

function scheduleSwUpdate(reg: ServiceWorkerRegistration) {
  const run = () => void reg.update();
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => run(), { timeout: SW_UPDATE_DEFER_MS });
  } else {
    setTimeout(run, SW_UPDATE_DEFER_MS);
  }
}

function registerServiceWorker(notification: NotificationApi) {
  if (DISABLE_SERVICE_WORKER) {
    console.info("[SW] DISABLED: skip register(/sw.js)");
    return;
  }
  if (swRegisterStarted) return;
  swRegisterStarted = true;

  void navigator.serviceWorker
    .register("/sw.js")
    .then((reg) => {
      bindWaitingDetection(reg, notification);
      scheduleSwUpdate(reg);
    })
    .catch((err) => {
      swRegisterStarted = false;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("aborted") || (err as DOMException)?.name === "AbortError") {
        console.log("[SW] registration aborted during page unload/reload");
        return;
      }
      console.error("❌ Service Worker registration failed:", err);
    });
}

/** 卸掉已有 SW；本页若仍被接管则刷一次，下次才真正无 controller */
function tearDownServiceWorkers() {
  void navigator.serviceWorker.getRegistrations().then(async (regs) => {
    const hadController = !!navigator.serviceWorker.controller;
    await Promise.all(regs.map((r) => r.unregister()));
    console.info(
      "[SW] DISABLED: unregistered",
      regs.length,
      "registration(s); hadController=",
      hadController
    );
    if (!hadController) {
      try {
        sessionStorage.removeItem("sw-disable-reload");
      } catch {
        /* ignore */
      }
      return;
    }
    try {
      if (sessionStorage.getItem("sw-disable-reload")) return;
      sessionStorage.setItem("sw-disable-reload", "1");
    } catch {
      /* ignore */
    }
    window.location.reload();
  });
}

/**
 * 生产环境 Web：等首页就绪后再注册 SW，避免与首次加载抢带宽
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
    registerServiceWorker(notification);
  };

  const onControllerChange = () => {
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

    // A/B：关 SW — 不挂监听、不注册，并卸掉已有
    if (DISABLE_SERVICE_WORKER) {
      tearDownServiceWorkers();
      return;
    }

    shellReady = false;
    pendingWaitingReg = null;
    window.addEventListener("pwa-shell-ready", onShellReady);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // 若 shell-ready 已发生（监听挂晚了），立刻补注册
    if (window.__POMO_SHELL_READY__) {
      onShellReady();
    }
  };

  const dispose = () => {
    window.removeEventListener("pwa-shell-ready", onShellReady);
    navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    removePendingVisibilityReload();
  };

  return { init, dispose };
}
