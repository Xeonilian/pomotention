// src/composables/useSyncWidget.ts
import { computed, onMounted, onUnmounted } from "vue";
import { useSyncStore } from "@/stores/useSyncStore";
import { uploadAll, downloadAll } from "@/services/sync";
import { useRelativeTime } from "@/composables/useRelativeTime";

export function useSyncWidget() {
  const syncStore = useSyncStore();

  const syncIcon = computed(() => {
    // 未登录状态优先显示
    if (!syncStore.isLoggedIn) {
      return "🔒";
    }

    switch (syncStore.syncStatus) {
      case "syncing":
      case "uploading":
      case "downloading":
        return "🔄";
      case "error":
        return "❌";
      default:
        return "✅";
    }
  });

  const relativeTime = useRelativeTime(computed(() => syncStore.lastSyncTimestamp));

  async function handleUpload() {
    try {
      await uploadAll();
    } catch (error) {
      console.error("Upload failed:", error);
    }
  }

  async function handleDownload() {
    try {
      const lastSync = syncStore.lastSyncTimestamp;
      await downloadAll(lastSync);
    } catch (error) {
      console.error("Download failed:", error);
    }
  }

  // 初始化认证监听
  onMounted(async () => {
    await syncStore.checkLoginStatus();
    syncStore.initAuthListener();
  });

  // 组件卸载时清理认证监听
  onUnmounted(() => {
    syncStore.cleanupAuthListener();
  });

  return {
    syncStore,
    syncIcon,
    relativeTime,
    handleUpload,
    handleDownload,
    // 登录相关 - 使用 store 中的状态和方法
    isLoggedIn: computed(() => syncStore.isLoggedIn),
    loggingOut: computed(() => syncStore.loggingOut),
    checkLoginStatus: syncStore.checkLoginStatus,
    handleLogin: syncStore.handleLogin,
    handleLogout: syncStore.handleLogout,
  };
}
