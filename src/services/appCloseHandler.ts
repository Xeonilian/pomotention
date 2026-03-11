// src/services/appCloseHandler.ts
import { useSyncStore } from "@/stores/useSyncStore";
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { useTemplateStore } from "@/stores/useTemplateStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { downloadAll, uploadAll, syncAll } from "@/services/sync";
import { debounce } from "@/core/utils/debounce";
import { isTauri } from "@tauri-apps/api/core";

// 全局状态管理
const globalState = {
  // 防抖函数实例
  debouncedFocusSync: null as any,
  debouncedBlurSync: null as any,
  // 监听器取消函数（Tauri/浏览器）
  unlistenHandlers: [] as Array<() => void>,
  // 防止重复关闭
  isAppClosing: false,
  // 防止重复清理
  isDestroyed: false,
  tasksCancelled: false,
};

/**
 * 检查是否有未同步的数据
 * @param source 调用来源（用于日志）
 * @returns 是否有未同步数据
 */
function checkUnsyncedData(source: string = "Unknown"): boolean {
  const dataStore = useDataStore();
  const tagStore = useTagStore();
  const templateStore = useTemplateStore();

  const hasUnsyncedMap = {
    activities: dataStore.activityList.some((item) => !item.synced),
    todos: dataStore.todoList.some((item) => !item.synced),
    schedules: dataStore.scheduleList.some((item) => !item.synced),
    tasks: dataStore.taskList.some((item) => !item.synced),
    tags: tagStore.rawTags?.some((item) => !item.synced) ?? false,
    templates: templateStore.rawTemplates?.some((item) => !item.synced) ?? false,
  };

  const unsyncedCount = Object.values(hasUnsyncedMap).filter(Boolean).length;

  if (unsyncedCount > 0) {
    console.log(`📊 [${source}] 发现 ${unsyncedCount} 类未同步数据`);
  }

  return unsyncedCount > 0;
}

/**
 * 通用同步前置检查
 * @returns 是否允许执行同步
 */
function checkSyncPreconditions(): boolean {
  const settingStore = useSettingStore();
  const syncStore = useSyncStore();

  // 1. 检查同步服务是否初始化
  if (!syncStore.syncInitialized) {
    console.log(`🚫 同步服务未初始化，跳过同步`);
    return false;
  }

  // 2. 检查自动同步开关
  if (!settingStore.settings.autoSupabaseSync) {
    console.log(`🚫 自动同步已关闭，跳过同步`);
    return false;
  }

  // 3. 检查是否正在同步中
  if (syncStore.isSyncing) {
    console.log(`🚫 已有同步任务执行中，跳过同步`);
    return false;
  }

  // 4. 检查是否登录（仅焦点同步需要）
  if (!syncStore.isLoggedIn) {
    console.log(`🚫 未登录，跳过同步`);
    return false;
  }

  return true;
}

/**
 * 初始化防抖同步函数（抽离冗余逻辑）
 */
function initDebouncedSyncFunctions() {
  // 焦点获取时的同步（拉取/全量同步）
  globalState.debouncedFocusSync = debounce(async (source: string) => {
    if (!checkSyncPreconditions()) return;

    try {
      if (checkUnsyncedData(source)) {
        await syncAll();
      } else {
        const syncStore = useSyncStore();
        await downloadAll(syncStore.lastSyncTimestamp);
      }
    } catch (error) {
      console.error(`❌ [${source}] 同步失败`, error);
      useSyncStore().isSyncing = false;
    }
  }, 2000);

  // 焦点丢失时的同步（仅上传）
  globalState.debouncedBlurSync = debounce(async (source: string) => {
    const syncStore = useSyncStore();
    // 抽离通用检查，但模糊同步不需要登录检查
    if (!syncStore.syncInitialized || !useSettingStore().settings.autoSupabaseSync || syncStore.isSyncing) {
      console.log(`🚫 [${source}] 同步前置条件不满足，跳过上`);
      return;
    }

    if (checkUnsyncedData(source)) {
      try {
        await uploadAll();
      } catch (error) {
        console.error(`❌ [${source}] 上传失败`, error);
        syncStore.isSyncing = false;
      }
    }
  }, 500);
}

/**
 * 设置Tauri环境下的关闭/焦点监听
 */
async function setupTauriHandlers() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    const syncStore = useSyncStore();

    // 窗口关闭请求监听
    const unlistenClose = await appWindow.onCloseRequested(async (event) => {
      if (globalState.isAppClosing) return;
      globalState.isAppClosing = true;

      event.preventDefault();

      try {
        // 等待当前同步完成
        if (syncStore.isSyncing) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // 有未同步数据则上传
        if (checkUnsyncedData("Tauri Close")) {
          const uploadPromise = uploadAll();
          const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("上传超时 (5秒)")), 5000));

          try {
            const uploadResult: any = await Promise.race([uploadPromise, timeoutPromise]);
            if (uploadResult.success) {
              syncStore.syncSuccess("关闭前上传成功");
            } else {
              console.warn(`⚠️ [Tauri Close] 上传失败: ${uploadResult.errors.join("; ")}`);
              syncStore.syncFailed(`关闭前上传失败: ${uploadResult.errors.join("; ")}`);
            }
            await new Promise((resolve) => setTimeout(resolve, 800));
          } catch (timeoutError: any | Error) {
            console.warn(`⏰ [Tauri Close] ${timeoutError.message}`);
            syncStore.syncFailed(timeoutError.message);
            syncStore.isSyncing = false;
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }

        await appWindow.close();
      } catch (error) {
        console.error(`❌ [Tauri Close] 关闭时同步失败`, error);
        syncStore.isSyncing = false;
        globalState.isAppClosing = false;
        await appWindow.close();
      }
    });

    // 窗口焦点变化监听
    const unlistenFocus = await appWindow.onFocusChanged((event) => {
      if (event.payload) {
        globalState.debouncedFocusSync("Tauri Focus");
      } else {
        globalState.debouncedBlurSync("Tauri Blur");
      }
    });

    // 保存取消函数
    globalState.unlistenHandlers.push(unlistenClose, unlistenFocus);
  } catch (e) {
    console.error("Tauri Listeners Error", e);
  }
}

/**
 * 设置浏览器环境下的焦点监听
 */
function setupBrowserHandlers() {
  const handleBlur = () => globalState.debouncedBlurSync("Window Blur");
  const handleFocus = () => globalState.debouncedFocusSync("Window Focus");
  const handleVisibility = () => {
    if (document.hidden) {
      globalState.debouncedBlurSync("Visibility Hidden");
    } else {
      globalState.debouncedFocusSync("Visibility Visible");
    }
  };

  // 添加监听
  window.addEventListener("blur", handleBlur);
  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibility);

  // 保存取消函数
  globalState.unlistenHandlers.push(() => {
    window.removeEventListener("blur", handleBlur);
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibility);
  });
}

/**
 * 取消所有待处理的同步任务
 */
export function cancelPendingSyncTasks() {
  if (globalState.tasksCancelled) {
    return; // 已取消，跳过
  }

  try {
    if (globalState.debouncedFocusSync) {
      globalState.debouncedFocusSync.cancel();
    }
    if (globalState.debouncedBlurSync) {
      globalState.debouncedBlurSync.cancel();
    }
    globalState.tasksCancelled = true;
    console.log("🛑 已取消失焦/焦点同步防抖任务");
  } catch (error) {
    console.error("❌ 取消同步任务时出错", error);
  }
}

/**
 * 完整关闭所有关闭/焦点同步功能（核心新增函数）
 */
export function destroyAppCloseHandler() {
  if (globalState.isDestroyed) {
    return; // 已销毁，跳过
  }

  try {
    // 1. 取消所有防抖任务
    cancelPendingSyncTasks();

    // 2. 移除所有监听器
    globalState.unlistenHandlers.forEach((unlisten) => {
      try {
        unlisten();
      } catch (e) {
        console.error("❌ 移除监听器失败", e);
      }
    });
    globalState.unlistenHandlers = [];

    // 3. 重置全局状态
    globalState.isAppClosing = false;
    globalState.debouncedFocusSync = null;
    globalState.debouncedBlurSync = null;
    globalState.isDestroyed = true;

    console.log("✅ 已完整关闭应用关闭/焦点同步处理功能");
  } catch (error) {
    console.error("❌ 关闭应用处理功能时出错", error);
  }
}

/**
 * 初始化应用关闭/焦点同步处理
 * @returns 销毁函数（等价于 destroyAppCloseHandler）
 */
export async function initAppCloseHandler() {
  // 重置销毁状态，允许重新初始化
  globalState.isDestroyed = false;
  globalState.tasksCancelled = false;

  // 初始化防抖函数
  initDebouncedSyncFunctions();

  // 根据环境设置监听
  if (isTauri()) {
    await setupTauriHandlers();
  } else {
    setupBrowserHandlers();
  }

  // 返回销毁函数，方便调用
  return destroyAppCloseHandler;
}
