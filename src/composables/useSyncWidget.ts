// src/composables/useSyncWidget.ts
import { computed } from "vue";
import { useSyncStore } from "@/stores/useSyncStore";
import { uploadAll, downloadAll } from "@/services/sync";
import { useRelativeTime } from "@/composables/useRelativeTime";

export function useSyncWidget() {
  const syncStore = useSyncStore();

  const syncIcon = computed(() => {
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

  return {
    syncStore,
    syncIcon,
    relativeTime,
    handleUpload,
    handleDownload,
  };
}
