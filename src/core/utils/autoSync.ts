// src/utils/autoSync.ts

import { debounce } from "@/core/utils/debounce";
import { syncAll, uploadAll } from "@/services/sync/index";
import { getCurrentUser } from "@/core/services/authServicve";
import { useSettingStore } from "@/stores/useSettingStore";

/**
 * 防抖的自动同步函数（保存后 2 秒触发）
 */
export const autoSyncDebounced = debounce(async () => {
  const settingStore = useSettingStore();
  if (!settingStore.settings.autoSupabaseSync) return; // 检查开关

  // 检查用户是否登录
  const user = await getCurrentUser();
  if (!user) {
    console.log("用户未登录，跳过同步");
    return;
  }

  console.log("触发自动同步...");
  const result = await syncAll();

  if (result.success) {
    console.log(`✅ 同步成功: 上传 ${result.details.uploaded} 条，下载 ${result.details.downloaded} 条`);
  } else {
    console.error("❌ 同步失败:", result.errors);
  }
}, 5000);

/**
 * 防抖的自动同步函数（保存后 2 秒触发）
 */
export const uploadAllDebounced = debounce(async () => {
  const settingStore = useSettingStore();
  if (!settingStore.settings.autoSupabaseSync) return; // 检查开关

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
}, 5000); // 可以改到 10s 测试完成后
