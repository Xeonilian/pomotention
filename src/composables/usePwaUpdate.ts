import { h } from "vue";
import { NButton } from "naive-ui";

/** 避免同一标签页重复弹出多条「有更新」通知 */
let updatePromptShown = false;

type NotificationApi = ReturnType<typeof import("naive-ui").useNotification>;

function promptRefresh(reg: ServiceWorkerRegistration, notification: NotificationApi) {
  if (updatePromptShown || !reg.waiting) return;
  updatePromptShown = true;

  const version = import.meta.env.VITE_APP_VERSION ?? "";

  notification.info({
    title: "网站已更新",
    content: () =>
      h("div", { class: "pwa-update-prompt" }, [
        h(
          "p",
          { style: "margin: 0 0 10px 0; line-height: 1.5;" },
          version
            ? `你正在使用 v${version}。新版本已下载，点下方按钮刷新即可生效。`
            : "新版本已下载，点下方按钮刷新即可生效。"
        ),
        h(
          NButton,
          {
            type: "primary",
            size: "small",
            onClick: () => {
              reg.waiting?.postMessage({ type: "SKIP_WAITING" });
            },
          },
          { default: () => "立即刷新" }
        ),
      ]),
    duration: 0,
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
    });
  });
}

/**
 * 生产环境 Web：注册 SW、检测 waiting 版本、提示用户刷新；与 Tauri 桌面版无关
 */
export function usePwaUpdate(notification: NotificationApi) {
  let refreshing = false;

  const onControllerChange = () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  };

  const onFocus = () => {
    void navigator.serviceWorker.getRegistration().then((r) => r?.update());
  };

  const init = () => {
    if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    window.addEventListener("focus", onFocus);

    void navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        bindWaitingDetection(reg, notification);
        return reg.update();
      })
      .catch((err) => {
        console.error("❌ Service Worker registration failed:", err);
      });
  };

  const dispose = () => {
    navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    window.removeEventListener("focus", onFocus);
  };

  return { init, dispose };
}
