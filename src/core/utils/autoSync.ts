// src/utils/autoSync.ts

import { debounce } from "@/core/utils/debounce";
import { syncAll } from "@/services/sync/index";
import { getCurrentUser } from "@/core/services/authServicve";

/**
 * 防抖的自动同步函数（保存后 2 秒触发）
 */
export const autoSyncDebounced = debounce(async () => {
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
}, 2000);