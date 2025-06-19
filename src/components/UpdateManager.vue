<script setup lang="ts">
import { onMounted, reactive, h } from "vue";
import { check } from "@tauri-apps/plugin-updater";
import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { NModal, NProgress, NText, useNotification, useDialog } from "naive-ui";

// 更新状态管理
const updateState = reactive({
  showProgress: false,
  progressText: "准备下载...",
  isDownloading: false,
});

const notification = useNotification();
const dialog = useDialog();

// 🔥 添加对话框实例管理
let currentDialogInstance: any = null;

// 🔥 关闭当前对话框的辅助函数
function closeCurrentDialog() {
  if (
    currentDialogInstance &&
    typeof currentDialogInstance.destroy === "function"
  ) {
    currentDialogInstance.destroy();
    currentDialogInstance = null;
  }
}

onMounted(() => {
  console.log("Notification and Dialog initialized successfully");

  if (isTauri()) {
    handleUpdateCheck();
  } else {
    console.log("Not in Tauri, skip update");
  }
});

async function handleUpdateCheck() {
  try {
    const localVersion = await getVersion();
    console.log("Local App Version:", localVersion);

    const update = await check();

    if (update) {
      console.log("update内容", update);

      // 🔥 关闭之前的对话框，创建新的
      closeCurrentDialog();

      currentDialogInstance = dialog.warning({
        title: "发现新版本",
        content: `新版本 v${update.version}\n\n${
          update.body || "包含功能更新和错误修复"
        }\n\n是否立即更新？`,
        positiveText: "立即更新",
        negativeText: "稍后提醒",
        onPositiveClick: async () => {
          currentDialogInstance = null; // 🔥 清除引用
          await downloadAndInstall(update);
        },
        onNegativeClick: () => {
          currentDialogInstance = null; // 🔥 清除引用
          notification.info({
            title: "更新提醒",
            content: "您可以稍后手动检查更新",
            duration: 3000,
          });
        },
        onClose: () => {
          currentDialogInstance = null; // 🔥 对话框关闭时清除引用
        },
      });
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

    if (
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

  if (isNetworkError) {
    // 🔥 关闭之前的对话框，创建新的错误对话框
    closeCurrentDialog();

    currentDialogInstance = dialog.error({
      title: "网络连接问题",
      // 🔥 最终推荐的写法
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
        currentDialogInstance = null; // 🔥 清除引用
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
        currentDialogInstance = null; // 🔥 清除引用
        notification.info({
          title: "已取消",
          content: "您可以稍后手动检查更新，或在网络状况较好时重试",
          duration: 4000,
        });
      },
      onClose: () => {
        currentDialogInstance = null; // 🔥 对话框关闭时清除引用
      },
    });
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
    // 🔥 关闭之前的对话框，创建新的错误对话框
    closeCurrentDialog();

    currentDialogInstance = dialog.error({
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
        currentDialogInstance = null; // 🔥 清除引用
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
        currentDialogInstance = null; // 🔥 清除引用
        notification.info({
          title: "已取消",
          content: "建议在网络状况较好时重新尝试更新",
          duration: 4000,
        });
      },
      onClose: () => {
        currentDialogInstance = null; // 🔥 对话框关闭时清除引用
      },
    });
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
