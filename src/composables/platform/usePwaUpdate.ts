import { h } from "vue";
import { NButton } from "naive-ui";
import { markPwaUpdating } from "@/composables/platform/chunkReloadGuard";

/** 避免同一标签页重复弹出多条「有更新」通知 */
let updatePromptShown = false;
/** 避免重复弹出「下载失败」 */
let installFailPromptShown = false;
/** 首页 shell 就绪后才允许前台弹更新提示 */
let shellReady = false;
/** shell 就绪前发现的 waiting 注册，延后提示 */
let pendingPromptReg: ServiceWorkerRegistration | null = null;

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
  // 与 index.html 内联脚本共用，避免 activate + controllerchange 连刷两次
  try {
    if (sessionStorage.getItem("sw-act-reload")) return;
    sessionStorage.setItem("sw-act-reload", "1");
  } catch {
    /* 隐私模式等 */
  }
  markPwaUpdating();
  // iOS PWA 上 replace 比 reload 更稳
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

function promptRefresh(reg: ServiceWorkerRegistration, notification: NotificationApi) {
  if (updatePromptShown || !reg.waiting) return;

  // 前台：等 shell 就绪后再弹，避免开机即打断
  if (!shellReady) {
    pendingPromptReg = reg;
    return;
  }

  // 后台：直接应用，回前台由 controllerchange 触发 reload
  if (document.visibilityState !== "visible") {
    updatePromptShown = true;
    applyWaitingWorker(reg);
    return;
  }

  updatePromptShown = true;
  const version = import.meta.env.VITE_APP_VERSION ?? "";

  notification.info({
    title: "网站已更新",
    content: () =>
      h("div", { class: "pwa-update-prompt" }, [
        h(
          "p",
          { style: "margin: 0 0 10px 0; line-height: 1.5;" },
          version ? `你正在使用 v${version}。新版本已就绪，点下方按钮刷新即可生效。` : "新版本已就绪，点下方按钮刷新即可生效。",
        ),
        h(
          NButton,
          {
            type: "primary",
            size: "small",
            onClick: () => {
              applyWaitingWorker(reg);
            },
          },
          { default: () => "立即刷新" },
        ),
      ]),
    duration: 0,
    closable: true,
  });
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
    promptRefresh(reg, notification);
  }

  reg.addEventListener("updatefound", () => {
    const installing = reg.installing;
    if (!installing) return;

    installing.addEventListener("statechange", () => {
      if (installing.state === "installed" && navigator.serviceWorker.controller) {
        promptRefresh(reg, notification);
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
 * 生产环境 Web：注册 SW、检测 waiting 版本、提示用户刷新；与 Tauri 桌面版无关
 */
export function usePwaUpdate(notification: NotificationApi) {
  let refreshing = false;

  const onShellReady = () => {
    shellReady = true;
    if (pendingPromptReg) {
      const reg = pendingPromptReg;
      pendingPromptReg = null;
      promptRefresh(reg, notification);
    }
  };

  const onControllerChange = () => {
    if (refreshing) return;

    // 后台/隐藏时立刻 reload 常被节流；回到前台再刷新
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
    pendingPromptReg = null;
    window.addEventListener("pwa-shell-ready", onShellReady);
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // 延迟到下一个 macrotask，避开页面 mount/reload 竞争期导致的 abort
    window.setTimeout(() => {
      void navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          bindWaitingDetection(reg, notification);
          scheduleSwUpdate(reg);
        })
        .catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          // 刷新时旧页面 unload 会 abort 正在进行的 register，属于正常情况，不打 error
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
