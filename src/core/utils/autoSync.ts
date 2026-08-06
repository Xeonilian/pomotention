// src/core/utils/autoSync.ts

import { debounce } from "@/core/utils/debounce";
import { syncAll, uploadAll } from "@/services/sync/index";
import { getCurrentUser } from "@/core/services/authService";
import { useSettingStore } from "@/stores/useSettingStore";
import { useSyncStore } from "@/stores/useSyncStore";

/** 撞车时合并为一次结束后补跑 */
let pendingUpload = false;
let pendingSync = false;
let uploadIdleTimer: ReturnType<typeof setTimeout> | null = null;
let syncIdleTimer: ReturnType<typeof setTimeout> | null = null;

const IDLE_POLL_MS = 400;

function armPendingUpload() {
  pendingUpload = true;
  console.log("同步进行中，结束后将自动补传");
  if (uploadIdleTimer) return;
  const tick = () => {
    const syncStore = useSyncStore();
    if (syncStore.isSyncing) {
      uploadIdleTimer = setTimeout(tick, IDLE_POLL_MS);
      return;
    }
    uploadIdleTimer = null;
    if (!pendingUpload) return;
    pendingUpload = false;
    void performUpload();
  };
  uploadIdleTimer = setTimeout(tick, IDLE_POLL_MS);
}

function armPendingSync() {
  pendingSync = true;
  console.log("同步进行中，结束后将自动补同步");
  if (syncIdleTimer) return;
  const tick = () => {
    const syncStore = useSyncStore();
    if (syncStore.isSyncing) {
      syncIdleTimer = setTimeout(tick, IDLE_POLL_MS);
      return;
    }
    syncIdleTimer = null;
    if (!pendingSync) return;
    pendingSync = false;
    void performSync();
  };
  syncIdleTimer = setTimeout(tick, IDLE_POLL_MS);
}

async function performSync() {
  const settingStore = useSettingStore();
  const syncStore = useSyncStore();
  if (!settingStore.settings.autoSupabaseSync) return;
  if (syncStore.isSyncGateActive) {
    console.log("同步闸门开启，跳过自动同步");
    return;
  }
  if (syncStore.isSyncing) {
    armPendingSync();
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    console.log("用户未登录，跳过同步");
    return;
  }

  console.log("触发自动同步...");
  const result = await syncAll();

  if ((result as { skipped?: boolean }).skipped) {
    armPendingSync();
    return;
  }

  if (result.success) {
    const details = (result as { details?: { uploaded?: number; downloaded?: number } }).details;
    const up = details?.uploaded ?? 0;
    const down = details?.downloaded ?? 0;
    console.log(`✅ [AutoSync] 同步成功: 上传 ${up} 条，下载 ${down} 条`);
  } else {
    console.error("❌ 同步失败:", result.errors);
  }
}

async function performUpload() {
  const settingStore = useSettingStore();
  const syncStore = useSyncStore();
  if (!settingStore.settings.autoSupabaseSync) return;
  if (syncStore.isSyncGateActive) {
    console.log("同步闸门开启，跳过自动上传");
    return;
  }
  if (syncStore.isSyncing) {
    armPendingUpload();
    return;
  }

  const user = await getCurrentUser();
  if (!user) {
    console.log("用户未登录，跳过同步");
    return;
  }

  console.log("触发自动上传...");
  const result = await uploadAll();

  if ((result as { skipped?: boolean }).skipped) {
    armPendingUpload();
    return;
  }

  if (result.success) {
    console.log(`✅ 上传成功，共 ${result.uploaded} 条记录`);
  } else {
    console.error("❌ 上传失败:", result.errors);
  }
}

/**
 * 防抖全量同步（上传+下载+清理），5s 内合并多次触发
 */
export const autoSyncDebounced = debounce(() => {
  void performSync();
}, 5000);

/**
 * 防抖仅上传：供本地 saveAll 后调度，5s 内合并多次保存
 */
export const uploadAllDebounced = debounce(() => {
  void performUpload();
}, 5000);
