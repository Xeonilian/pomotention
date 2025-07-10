<script setup lang="ts">
import { onMounted, reactive, h, watch } from "vue";
import { check } from "@tauri-apps/plugin-updater";
import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { NModal, NProgress, NText, useNotification, useDialog } from "naive-ui";
import { useSettingStore } from "@/stores/useSettingStore"; // 引入设置存储

type DialogType = "warning" | "error" | "success" | "info";

// 更新状态管理
const updateState = reactive({
  showProgress: false,
  progressText: "准备下载...",
  isDownloading: false,
});

const notification = useNotification();
const dialog = useDialog();
const settingStore = useSettingStore();

// 对话框实例管理
let currentDialogInstance: any = null;

// 对话框超时计时器引用
let dialogTimeoutRef: ReturnType<typeof setTimeout> | null = null;

// 关闭当前对话框的辅助函数
function closeCurrentDialog() {
  if (
    currentDialogInstance &&
    typeof currentDialogInstance.destroy === "function"
  ) {
    currentDialogInstance.destroy();
    currentDialogInstance = null;
  }
}

// 清除对话框计时器
function clearDialogTimeout() {
  if (dialogTimeoutRef) {
    clearTimeout(dialogTimeoutRef);
    dialogTimeoutRef = null;
    console.log("对话框计时器已清除");
  }
}

// 启动对话框计时器 - 30秒后自动执行指定操作
function startDialogTimeout(onTimeout: () => void) {
  clearDialogTimeout();
  dialogTimeoutRef = setTimeout(() => {
    console.log("对话框超时(30s)，自动执行取消操作");
    onTimeout();
  }, 20000); // 20秒超时
}

// 统一的对话框显示函数，支持超时自动关闭
function showDialogWithTimeout(
  options: any & { type?: DialogType },
  onTimeout?: () => void
) {
  closeCurrentDialog();

  const wrap = (fn?: Function) => {
    return (...args: any[]) => {
      clearDialogTimeout();
      // 核心修复：先销毁实例再清空引用
      if (currentDialogInstance?.destroy) {
        currentDialogInstance.destroy();
      }
      if (fn) fn(...args);
      currentDialogInstance = null;
    };
  };

  options.onPositiveClick = wrap(options.onPositiveClick);
  options.onNegativeClick = wrap(options.onNegativeClick);

  const originalOnClose = options.onClose;
  options.onClose = () => {
    clearDialogTimeout();
    // 确保关闭时也销毁实例
    if (currentDialogInstance?.destroy) {
      currentDialogInstance.destroy();
    }
    if (originalOnClose) originalOnClose();
    currentDialogInstance = null;
  };

  const type =
    options.type &&
    ["warning", "error", "info", "success"].includes(options.type)
      ? (options.type as DialogType)
      : ("warning" as DialogType);

  switch (type) {
    case "warning":
      currentDialogInstance = dialog.warning(options);
      break;
    case "error":
      currentDialogInstance = dialog.error(options);
      break;
    case "info":
      currentDialogInstance = dialog.info(options);
      break;
    case "success":
      currentDialogInstance = dialog.success(options);
      break;
    default:
      currentDialogInstance = dialog.warning(options);
  }
  // 如果提供了超时处理函数，启动计时器
  if (onTimeout) {
    startDialogTimeout(() => {
      if (options.onNegativeClick) options.onNegativeClick();
      else if (onTimeout) onTimeout();
    });
  }
}

onMounted(() => {
  // console.log("Notification and Dialog initialized successfully");
  if (isTauri()) {
    // console.log(settingStore.settings.checkForUpdate);
    if (settingStore.settings.checkForUpdate) {
      console.log("Initializing update checking");
      handleUpdateCheck();
    }
  } else {
    console.log("Not in Tauri, skip update");
  }
});

// 监听 settings.checkForUpdate 的变化
watch(
  () => settingStore.settings.checkForUpdate,
  (newValue) => {
    if (isTauri() && newValue) {
      console.log("用户启用自动更新，进行更新检查", newValue);
      handleUpdateCheck(); // 切换打开开关时检查更新
    }
  }
);

// 辅助函数：获取远端（GitHub）最新 release 版本
async function getRemoteVersion(): Promise<string | null> {
  try {
    const resp = await fetch(
      "https://api.github.com/repos/Xeonilian/pomotention/releases/latest",
      { headers: { Accept: "application/vnd.github.v3+json" } }
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    const data = await resp.json();
    // tag_name 格式 v1.2.3
    return (data.tag_name ?? data.name ?? null) as string | null;
  } catch (e: any) {
    console.warn("拉取远端版本信息失败:", e.message || e);
    return null;
  }
}

/**
 * 比较两个语义化版本号。
 * @returns 'major', 'minor', 'patch', 'equal', or 'lower'
 */
function compareVersions(
  v1_str: string,
  v2_str: string
): "major" | "minor" | "patch" | "equal" | "lower" {
  const v1 = v1_str.replace(/^v/, "").split(".").map(Number);
  const v2 = v2_str.replace(/^v/, "").split(".").map(Number);

  // 补全版本号，例如 1.2 -> 1.2.0
  while (v1.length < 3) v1.push(0);
  while (v2.length < 3) v2.push(0);

  if (v1[0] < v2[0]) return "major";
  if (v1[0] > v2[0]) return "lower";

  if (v1[1] < v2[1]) return "minor";
  if (v1[1] > v2[1]) return "lower";

  if (v1[2] < v2[2]) return "patch";
  if (v1[2] > v2[2]) return "lower";

  return "equal";
}

async function handleUpdateCheck() {
  try {
    const localVersion = await getVersion();
    console.log("Local App Version:", localVersion);
    const remoteVersion = await getRemoteVersion();
    console.log("远端最新版本:", remoteVersion);

    // 步骤2：本地与远端一致则直接短路
    if (
      remoteVersion &&
      compareVersions(localVersion, remoteVersion) === "equal"
    ) {
      notification.success({
        title: "版本检查",
        content: "当前已是最新版本",
        duration: 2000,
      });
      return; // 不再走后面 Tauri 插件逻辑
    }

    if (
      remoteVersion &&
      compareVersions(localVersion, remoteVersion) === "patch"
    ) {
      notification.success({
        title: "版本检查",
        content: "微小调整，按需更新",
        duration: 2000,
      });
      return; // 不再走后面 Tauri 插件逻辑
    }

    const update = await check();

    if (update) {
      console.log("update内容", update);

      // 使用超时对话框替代直接调用
      showDialogWithTimeout(
        {
          type: "warning",
          title: "发现新版本",
          content: `新版本 v${update.version}\n\n${
            update.body || "包含功能更新和错误修复"
          }\n\n是否立即更新？`,
          positiveText: "立即更新",
          negativeText: "稍后提醒",
          onPositiveClick: async () => {
            await downloadAndInstall(update);
          },
          onNegativeClick: () => {
            notification.info({
              title: "更新提醒",
              content: "您可以稍后手动检查更新",
              duration: 3000,
            });
          },
        },
        () => {
          // 超时默认行为
          notification.info({
            title: "更新提醒",
            content: "操作超时，已自动取消。您可以稍后手动检查更新",
            duration: 3000,
          });
        }
      );
    } else {
      console.log("当前已是最新版本");
      notification.success({
        title: "版本检查",
        content: "当前已是最新版本",
        duration: 2000,
      });
    }
  } catch (error) {
    console.error("Update check failed:", error);
    handleUpdateCheckError(error);
  }
}

async function downloadAndInstall(update: any) {
  try {
    updateState.showProgress = true;
    updateState.isDownloading = true;
    updateState.progressText = "正在下载更新包...";

    notification.info({
      title: "开始更新",
      content: "正在下载更新包，请不要关闭应用",
      duration: 3000,
    });

    console.log("Starting download and install...");

    await update.downloadAndInstall();

    updateState.progressText = "下载完成，正在安装...";

    setTimeout(() => {
      updateState.showProgress = false;
      notification.success({
        title: "更新完成",
        content: "更新已安装，应用将自动重启",
        duration: 3000,
      });
    }, 1000);

    console.log("Update completed successfully");
  } catch (error) {
    console.error("Download and install failed:", error);
    updateState.showProgress = false;
    handleDownloadError(error);
  }
}

function handleUpdateCheckError(error: any) {
  console.log(
    "Update check failed (raw):",
    error,
    typeof error,
    Object.prototype.toString.call(error)
  );

  let errorMessage = "更新服务暂时不可用";
  let isNetworkError = false;
  let isPlatformMismatchError = false; // 新增平台不匹配错误标志

  try {
    let originalMessage = "";

    if (error && typeof error === "object") {
      originalMessage =
        error.message || error.toString() || JSON.stringify(error);
    } else if (typeof error === "string") {
      originalMessage = error;
    } else {
      originalMessage = String(error);
    }

    console.log("Original error message:", originalMessage);

    // 检测平台不匹配错误
    if (
      originalMessage.includes("platform") &&
      originalMessage.includes("was not found on the response") &&
      originalMessage.includes("platforms")
    ) {
      isPlatformMismatchError = true;

      // 从错误信息中提取平台名称
      const platformMatch = originalMessage.match(/platform `([^`]+)`/);
      const platform = platformMatch ? platformMatch[1] : "当前平台";

      errorMessage = `没有找到适用于 ${platform} 的更新包`;
    } else if (
      originalMessage.includes("error sending request") ||
      originalMessage.includes("network") ||
      originalMessage.includes("timeout") ||
      originalMessage.includes("connect") ||
      originalMessage.includes("github.com") ||
      originalMessage.includes("releases/latest")
    ) {
      isNetworkError = true;
      errorMessage = "无法连接到更新服务器";
    }
  } catch (parseError) {
    console.error("Error parsing error message:", parseError);
    errorMessage = "检查更新时发生错误";
  }

  // 处理平台不匹配错误
  if (isPlatformMismatchError) {
    showDialogWithTimeout(
      {
        type: "warning",
        title: "平台更新不可用",
        content: () =>
          h("div", [
            h("div", errorMessage),
            h("div", { style: "margin: 8px 0 0 0;" }, [
              h("b", "说明: "),
              "当前版本更新中没有包含您的操作系统平台。",
            ]),
            h("div", { style: "margin: 8px 0 0 0;" }, [h("b", "可能原因: ")]),
            h("ul", { style: "margin: 4px 0 0 16px; padding: 0;" }, [
              h("li", "当前更新仅针对其他平台发布"),
              h("li", "您的平台版本将在稍后更新"),
              h("li", "更新配置问题导致无法识别当前平台"),
            ]),
            h("div", { style: "margin: 8px 0 0 0;" }, [
              "您可以稍后再试，或前往官方网站查看是否有适用于您平台的手动更新方式。",
            ]),
          ]),
        positiveText: "确定",
        negativeText: "不再提醒",
        onPositiveClick: () => {
          notification.info({
            title: "更新检查",
            content: "您可以稍后再次检查更新",
            duration: 3000,
          });
        },
        onNegativeClick: () => {
          notification.info({
            title: "已设置",
            content: "自动检查更新终止",
            duration: 4000,
          });
          // 这里你可能需要设置 settingStore.settings.checkForUpdate = false
          // 但需要确保这个 store 可访问
        },
      },
      () => {
        // 超时默认行为
        notification.info({
          title: "操作超时",
          content: "对话框已自动关闭",
          duration: 4000,
        });
      }
    );
  } else if (isNetworkError) {
    // 原有的网络错误处理代码保持不变
    showDialogWithTimeout(
      {
        type: "error",
        title: "网络连接问题",
        content: () =>
          h("div", [
            h("div", "无法连接到更新服务器"),
            h("div", { style: "margin: 8px 0 0 0;" }, [
              h("b", "提示: "),
              "GitHub 服务器在某些地区访问不稳定，这是正常现象。",
            ]),
            h("div", { style: "margin: 8px 0 0 0;" }, [h("b", "建议: ")]),
            h("ul", { style: "margin: 4px 0 0 16px; padding: 0;" }, [
              h("li", "稍后重试"),
              h("li", "检查网络连接"),
              h("li", "使用代理/VPN"),
            ]),
          ]),
        positiveText: "重试",
        negativeText: "稍后再试",
        onPositiveClick: () => {
          console.log("User chose to retry update check");
          notification.info({
            title: "重新检查更新",
            content: "正在重新连接 GitHub 服务器...",
            duration: 2000,
          });
          setTimeout(() => {
            handleUpdateCheck();
          }, 2000);
        },
        onNegativeClick: () => {
          notification.info({
            title: "已取消",
            content: "您可以稍后手动检查更新，或在网络状况较好时重试",
            duration: 4000,
          });
        },
      },
      () => {
        notification.info({
          title: "操作超时",
          content:
            "对话框已自动关闭，您可以稍后手动检查更新，或在网络状况较好时重试",
          duration: 4000,
        });
      }
    );
  } else {
    notification.error({
      title: "检查更新失败",
      content: errorMessage,
      duration: 5000,
      keepAliveOnHover: true,
    });
  }
}

function handleDownloadError(error: any) {
  console.log(
    "Download failed (raw):",
    error,
    typeof error,
    Object.prototype.toString.call(error)
  );

  let errorMessage = "下载更新失败";
  let isNetworkError = false;

  try {
    let originalMessage = "";

    if (error && typeof error === "object") {
      originalMessage =
        error.message || error.toString() || JSON.stringify(error);
    } else if (typeof error === "string") {
      originalMessage = error;
    } else {
      originalMessage = String(error);
    }

    console.log("Download error message:", originalMessage);

    if (
      originalMessage.includes("error sending request") ||
      originalMessage.includes("network") ||
      originalMessage.includes("timeout") ||
      originalMessage.includes("connect") ||
      originalMessage.includes("onDownloadProgress is not a function")
    ) {
      isNetworkError = true;
      if (originalMessage.includes("onDownloadProgress is not a function")) {
        errorMessage = "更新组件版本不兼容，请手动更新应用";
      } else {
        errorMessage = "网络连接中断，下载失败";
      }
    }
  } catch (parseError) {
    console.error("Error parsing download error:", parseError);
    errorMessage = "下载过程中发生错误";
  }

  if (isNetworkError) {
    // 使用超时对话框替代直接调用
    showDialogWithTimeout(
      {
        type: "error",
        title: "下载中断",
        content: () =>
          h("div", [
            h("div", errorMessage),
            h("br"),
            h("div", "下载大文件时网络中断是常见问题。建议："),
            h("ul", { style: "margin: 8px 0 0 16px; padding: 0;" }, [
              h("li", "检查网络连接稳定性"),
              h("li", "重新尝试下载"),
              h("li", "或稍后在网络较好时重试"),
            ]),
          ]),
        positiveText: "重新下载",
        negativeText: "稍后重试",
        onPositiveClick: () => {
          console.log("User chose to retry download");
          notification.info({
            title: "重新开始",
            content: "正在重新检查更新并下载...",
            duration: 2000,
          });
          setTimeout(() => {
            handleUpdateCheck();
          }, 2000);
        },
        onNegativeClick: () => {
          notification.info({
            title: "已取消",
            content: "建议在网络状况较好时重新尝试更新",
            duration: 4000,
          });
        },
      },
      () => {
        // 超时默认行为
        notification.info({
          title: "操作超时",
          content: "对话框已自动关闭，建议在网络状况较好时重新尝试更新",
          duration: 4000,
        });
      }
    );
  } else {
    notification.error({
      title: "下载失败",
      content: errorMessage,
      duration: 5000,
      keepAliveOnHover: true,
    });
  }
}
</script>

<!-- template 部分保持不变 -->
<template>
  <n-modal
    v-model:show="updateState.showProgress"
    :mask-closable="false"
    :closable="false"
    preset="card"
    title="正在更新应用"
    style="width: 450px"
  >
    <div class="update-content">
      <n-progress type="line" :percentage="100" processing color="#1890ff" />

      <div class="progress-text">
        {{ updateState.progressText }}
      </div>

      <n-text
        depth="3"
        style="font-size: 12px; margin-top: 16px; display: block"
      >
        请耐心等待，更新完成后应用将自动重启
      </n-text>
    </div>
  </n-modal>
</template>

<style scoped>
.update-content {
  text-align: center;
  padding: 16px 0;
}

.progress-text {
  margin: 16px 0 8px 0;
  font-size: 14px;
  font-weight: 500;
}
</style>
