// src / services / appCloseHandler.ts;
import { useSyncStore } from "@/stores/useSyncStore";
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { useTemplateStore } from "@/stores/useTemplateStore";
import { useSettingStore } from "@/stores/useSettingStore";
// ✅ 复用核心同步函数
import { downloadAll, uploadAll, syncAll } from "@/services/sync";
// ✅ 复用你的防抖工具
import { debounce } from "@/core/utils/debounce";
import { isTauri } from "@tauri-apps/api/core";

// 全局防抖函数引用 - 用于在登出时取消
let globalDebouncedFocusSync: any = null;
let globalDebouncedBlurSync: any = null;

/**
 * 检查是否有未同步数据
 * (这是本地检查，速度极快，不需要防抖)
 */
function checkUnsyncedData(source: string = "Unknown"): boolean {
  const dataStore = useDataStore();
  const tagStore = useTagStore();
  const templateStore = useTemplateStore();

  const hasUnsynced = {
    activities: dataStore.activityList.some((item) => !item.synced),
    todos: dataStore.todoList.some((item) => !item.synced),
    schedules: dataStore.scheduleList.some((item) => !item.synced),
    tasks: dataStore.taskList.some((item) => !item.synced),
    tags: tagStore.rawTags?.some((item) => !item.synced) ?? false,
    templates: templateStore.rawTemplates?.some((item) => !item.synced) ?? false,
  };

  const total = Object.values(hasUnsynced).filter(Boolean).length;

  if (total > 0) {
    console.log(`📊 [${source}] 发现 ${total} 类未同步数据`);
  }

  return total > 0;
}

// =========================================================================
// ✅ 核心逻辑：使用你的 debounce 包装同步请求
// =========================================================================

/**
 * 获得焦点时的同步：需要拉取云端数据 (Pull)
 * 设置 2000ms 防抖：防止用户频繁切屏导致请求过多
 */
const debouncedFocusSync = debounce(async (source: string) => {
  const settingStore = useSettingStore();
  const syncStore = useSyncStore();

  if (!settingStore.settings.autoSupabaseSync) {
    console.log(`🚫 [${source}] 自动同步已关闭，跳过`);
    return;
  }

  if (syncStore.isSyncing) {
    return; // 正在同步中，静默跳过
  }

  if (!syncStore.isLoggedIn) {
    console.log(`🚫 [${source}] 未登录，跳过同步`);
    return;
  }

  try {
    if (checkUnsyncedData(source)) {
      await syncAll(); // 包含 upload + download
    } else {
      await downloadAll(syncStore.lastSyncTimestamp);
    }
  } catch (error) {
    console.error(`❌ [${source}] 同步失败`, error);
    syncStore.isSyncing = false; // 同步报错时重置状态
  }
}, 2000);

// 保存全局引用，用于登出时取消
globalDebouncedFocusSync = debouncedFocusSync;

/**
 * 失去焦点时的同步：只需要上传本地修改 (Push)
 * 设置 500ms 短防抖：人走了要尽快保存
 */
const debouncedBlurSync = debounce(async (source: string) => {
  const settingStore = useSettingStore();
  const syncStore = useSyncStore();

  if (!settingStore.settings.autoSupabaseSync) {
    return; // 自动同步已关闭，静默跳过
  }

  if (syncStore.isSyncing) {
    return; // 正在同步中，静默跳过
  }

  // 只有本地有脏数据才上传
  if (checkUnsyncedData(source)) {
    try {
      await uploadAll(); // 只上传
    } catch (error) {
      console.error(`❌ [${source}] 上传失败`, error);
      syncStore.isSyncing = false; // 上传报错时重置状态
    }
  }
}, 500);

// 保存全局引用，用于登出时取消
globalDebouncedBlurSync = debouncedBlurSync;

// =========================================================================
// 监听器注册
// =========================================================================

// 全局关闭状态 - 防止多次处理关闭请求
let isAppClosing = false;

/**
 * Tauri 环境监听
 */
async function setupTauriCloseHandler() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    const syncStore = useSyncStore();

    // 1. 关闭拦截 (优化逻辑，防止状态锁死)
    const unlistenClose = await appWindow.onCloseRequested(async (event) => {
      // 防止重复处理关闭请求 - 使用全局状态
      if (isAppClosing) {
        return;
      }
      isAppClosing = true;

      event.preventDefault(); // 先统一阻止默认关闭

      try {
        // 如果正在同步，等待500ms再检查
        if (syncStore.isSyncing) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // 检查并上传未同步数据
        if (checkUnsyncedData("Tauri Close")) {
          // 创建5秒超时的上传任务
          const uploadPromise = uploadAll();
          const timeoutPromise = new Promise<{ success: false; errors: string[]; uploaded: number }>((_, reject) => {
            setTimeout(() => reject(new Error("上传超时 (5秒)")), 5000);
          });

          try {
            const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
            if (uploadResult.success) {
              syncStore.syncSuccess("关闭前上传成功");
              await new Promise((resolve) => setTimeout(resolve, 800));
            } else {
              console.warn(`⚠️ [Tauri Close] 上传失败: ${uploadResult.errors.join("; ")}`);
              syncStore.syncFailed(`关闭前上传失败: ${uploadResult.errors.join("; ")}`);
              await new Promise((resolve) => setTimeout(resolve, 800));
            }
          } catch (timeoutError: any) {
            console.warn(`⏰ [Tauri Close] ${timeoutError.message}`);
            syncStore.syncFailed(timeoutError.message);
            syncStore.isSyncing = false;
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }

        await appWindow.close();
      } catch (error) {
        console.error(`❌ [Tauri Close] 关闭时同步失败`, error);
        syncStore.isSyncing = false; // 异常时重置状态
        isAppClosing = false; // 重置全局关闭标志（异常情况下）
        await appWindow.close();
      }
    });

    // 2. 焦点监听 (使用防抖函数)
    const unlistenFocus = await appWindow.onFocusChanged((event) => {
      const isFocused = event.payload;

      if (isFocused) {
        // ✅ 获得焦点 -> 拉取
        debouncedFocusSync("Tauri Focus");
      } else {
        // 📤 失去焦点 -> 上传
        debouncedBlurSync("Tauri Blur");
      }
    });

    return () => {
      unlistenClose();
      unlistenFocus();
      debouncedFocusSync.cancel(); // 清理定时器
      debouncedBlurSync.cancel();
    };
  } catch (e) {
    console.error("Tauri Listeners Error", e);
    return () => {};
  }
}

/**
 * 浏览器环境监听
 */
function setupBrowserCloseHandler() {
  const handleBlur = () => {
    debouncedBlurSync("Window Blur");
  };

  const handleFocus = () => {
    debouncedFocusSync("Window Focus");
  };

  const handleVisibility = () => {
    if (document.hidden) {
      debouncedBlurSync("Visibility Hidden");
    } else {
      debouncedFocusSync("Visibility Visible");
    }
  };

  window.addEventListener("blur", handleBlur);
  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibility);

  return () => {
    window.removeEventListener("blur", handleBlur);
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibility);
    debouncedFocusSync.cancel();
    debouncedBlurSync.cancel();
  };
}

/**
 * 取消所有待处理的防抖同步任务
 * 在登出时调用，防止同步服务已销毁但任务还在队列中执行
 */
export function cancelPendingSyncTasks() {
  if (globalDebouncedFocusSync) {
    globalDebouncedFocusSync.cancel();
  }
  if (globalDebouncedBlurSync) {
    globalDebouncedBlurSync.cancel();
  }
  console.log("🛑 已取消所有待处理的同步任务");
}

export async function initAppCloseHandler() {
  if (isTauri()) {
    return await setupTauriCloseHandler();
  } else {
    return setupBrowserCloseHandler();
  }
}
