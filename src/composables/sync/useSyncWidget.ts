// src/composables/useSyncWidget.ts
import { computed, onMounted } from "vue";
import { useNotification } from "naive-ui";
import { useSyncStore } from "@/stores/useSyncStore";
import { uploadAll, downloadAll } from "@/services/sync";
import { useRelativeTime } from "@/composables/sync/useRelativeTime";
import { LockClosed20Regular, ArrowSync20Regular, DismissCircle20Regular, CheckmarkCircle20Regular } from "@vicons/fluent";

export function useSyncWidget() {
  const syncStore = useSyncStore();
  const notification = useNotification();

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
      const result = await uploadAll();
      // 试用到期/未登录被拦：弹通知给个理由，避免按钮像没反应
      if ((result as { denied?: boolean }).denied && syncStore.syncNeedsSubscription) {
        notification.warning({
          title: "云同步未执行",
          content: syncStore.syncNeedsSubscription,
          duration: 5000,
          keepAliveOnHover: true,
        });
      }
    } catch (error) {
      console.error("Upload failed:", error);
    }
  }

  async function handleDownload() {
    try {
      const lastSync = syncStore.lastSyncTimestamp;
      const result = await downloadAll(lastSync);
      if ((result as { denied?: boolean }).denied && syncStore.syncNeedsSubscription) {
        notification.warning({
          title: "云同步未执行",
          content: syncStore.syncNeedsSubscription,
          duration: 5000,
          keepAliveOnHover: true,
        });
      }
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
