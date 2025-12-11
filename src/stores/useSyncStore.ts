// src/stores/useSyncStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useSettingStore } from "./useSettingStore";

export const useSyncStore = defineStore("sync", () => {
  const settingStore = useSettingStore();

  // ✅ 同步状态
  const isSyncing = ref(false);
  const syncError = ref<string | null>(null);
  const syncMessage = ref<string>("就绪");
  const syncStatus = ref<"idle" | "syncing" | "uploading" | "downloading" | "error">("idle");

  // 时间戳
  const lastSyncTimestamp = computed({
    get: () => settingStore.settings.supabaseSync[0] || 0,
    set: (val: number) => {
      settingStore.settings.supabaseSync[0] = val;
    },
  });

  const lastCleanupTimestamp = computed({
    get: () => settingStore.settings.supabaseSync[1] || 0,
    set: (val: number) => {
      settingStore.settings.supabaseSync[1] = val;
    },
  });

  // ✅ 开始同步
  function startSync(message: string = "正在同步...") {
    isSyncing.value = true;
    syncStatus.value = "syncing";
    syncMessage.value = message;
    syncError.value = null;
  }

  // ✅ 开始上传
  function startUpload() {
    isSyncing.value = true;
    syncStatus.value = "uploading";
    syncMessage.value = "正在上传...";
    syncError.value = null;
  }

  // ✅ 开始下载
  function startDownload() {
    isSyncing.value = true;
    syncStatus.value = "downloading";
    syncMessage.value = "正在下载...";
    syncError.value = null;
  }

  // ✅ 同步成功
  function syncSuccess(message: string = "同步完成") {
    isSyncing.value = false;
    syncStatus.value = "idle";
    syncMessage.value = message;
    syncError.value = null;
    lastSyncTimestamp.value = Date.now();
  }

  // ✅ 同步失败
  function syncFailed(error: string) {
    isSyncing.value = false;
    syncStatus.value = "error";
    syncMessage.value = "同步失败";
    syncError.value = error;
  }

  function updateLastSyncTimestamp(timestamp?: number) {
    lastSyncTimestamp.value = timestamp ?? Date.now();
  }

  function updateLastCleanupTimestamp(timestamp?: number) {
    lastCleanupTimestamp.value = timestamp ?? Date.now();
  }

  function resetSync() {
    lastSyncTimestamp.value = 0;
    lastCleanupTimestamp.value = 0;
    isSyncing.value = false;
    syncError.value = null;
    syncMessage.value = "就绪";
    syncStatus.value = "idle";
  }

  return {
    // 状态
    isSyncing,
    syncError,
    syncMessage,
    syncStatus,
    lastSyncTimestamp,
    lastCleanupTimestamp,

    // 方法
    startSync,
    startUpload,
    startDownload,
    syncSuccess,
    syncFailed,
    updateLastSyncTimestamp,
    updateLastCleanupTimestamp,
    resetSync,
  };
});
