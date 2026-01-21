// src/composables/useSyncWidget.ts
import { computed, onMounted } from "vue";
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
  });

  return {
    syncStore,
    syncIcon,
    relativeTime,
    handleUpload,
    handleDownload,
  };
}
