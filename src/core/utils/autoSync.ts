// src/core/utils/autoSync.ts

import { debounce } from "@/core/utils/debounce";
import { syncAll, uploadAll } from "@/services/sync/index";
import { getCurrentUser } from "@/core/services/authService";
import { useSettingStore } from "@/stores/useSettingStore";
import { useSyncStore } from "@/stores/useSyncStore";

/**
 * 防抖全量同步（上传+下载+清理），5s 内合并多次触发
 */
export const autoSyncDebounced = debounce(async () => {
  const settingStore = useSettingStore();
  const syncStore = useSyncStore();
  if (!settingStore.settings.autoSupabaseSync) return; // 检查开关
  if (syncStore.isSyncGateActive) {
    console.log("同步闸门开启，跳过自动同步");
    return;
  }

  // 检查用户是否登录
  const user = await getCurrentUser();
  if (!user) {
    console.log("用户未登录，跳过同步");
    return;
  }

  console.log("触发自动同步...");
  const result = await syncAll();

  if (result.success) {
    const details = (result as any).details;
    const up = details?.uploaded ?? 0;
    const down = details?.downloaded ?? 0;
    console.log(`✅ [AutoSync] 同步成功: 上传 ${up} 条，下载 ${down} 条`);
  } else {
    console.error("❌ 同步失败:", result.errors);
  }
}, 5000);

/**
 * 防抖仅上传：供本地 saveAll 后调度，5s 内合并多次保存
 */
export const uploadAllDebounced = debounce(async () => {
  const settingStore = useSettingStore();
  const syncStore = useSyncStore();
  if (!settingStore.settings.autoSupabaseSync) return; // 检查开关
  if (syncStore.isSyncGateActive) {
    console.log("同步闸门开启，跳过自动上传");
    return;
  }

  // 检查用户是否登录
  const user = await getCurrentUser();
  if (!user) {
    console.log("用户未登录，跳过同步");
    return;
  }

  console.log("触发自动上传...");
  const result = await uploadAll();

  if (result.success) {
    console.log(`✅ 上传成功，共 ${result.uploaded} 条记录`); // ✅ 显示上传数量
  } else {
    console.error("❌ 上传失败:", result.errors);
  }
}, 5000);
