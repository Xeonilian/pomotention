// src/composables/useSyncWidget.ts
import { computed, onMounted } from "vue";
import { useSyncStore } from "@/stores/useSyncStore";
import { uploadAll, downloadAll } from "@/services/sync";
import { useRelativeTime } from "@/composables/useRelativeTime";
import { LockClosed20Regular, ArrowSync20Regular, DismissCircle20Regular, CheckmarkCircle20Regular } from "@vicons/fluent";

export function useSyncWidget() {
  const syncStore = useSyncStore();

  const syncIcon = computed(() => {
    // 未登录状态优先显示
    if (!syncStore.isLoggedIn) {
      return LockClosed20Regular;
    }

    switch (syncStore.syncStatus) {
      case "syncing":
      case "uploading":
      case "downloading":
        return ArrowSync20Regular;
      case "error":
        return DismissCircle20Regular;
      default:
        return CheckmarkCircle20Regular;
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
