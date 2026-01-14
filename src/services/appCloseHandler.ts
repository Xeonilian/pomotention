// src / services / appCloseHandler.ts;
import { useSyncStore } from "@/stores/useSyncStore";
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { useTemplateStore } from "@/stores/useTemplateStore";
import { useSettingStore } from "@/stores/useSettingStore";
// ✅ 复用核心同步函数
import { syncAll, uploadAll } from "@/services/sync";
// ✅ 复用你的防抖工具
import { debounce } from "@/core/utils/debounce";
import { isTauri } from "@tauri-apps/api/core";

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
    console.log(`📊 [${source}] 发现本地待上传数据`, hasUnsynced);
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

  if (!settingStore.settings.autoSupabaseSync) return;
  if (syncStore.isSyncing) return;

  try {
    console.log(`📥 [${source}] 窗口激活，执行全量同步 (拉取更新)...`);
    await syncAll(); // 包含 upload + download
  } catch (error) {
    console.error(`❌ [${source}] 全量同步失败`, error);
    syncStore.isSyncing = false; // 同步报错时重置状态
  }
}, 2000);

/**
 * 失去焦点时的同步：只需要上传本地修改 (Push)
 * 设置 500ms 短防抖：人走了要尽快保存
 */
const debouncedBlurSync = debounce(async (source: string) => {
  const settingStore = useSettingStore();
  const syncStore = useSyncStore();

  if (!settingStore.settings.autoSupabaseSync) return;
  if (syncStore.isSyncing) return;

  // 只有本地有脏数据才上传
  if (checkUnsyncedData(source)) {
    try {
      console.log(`📤 [${source}] 窗口失去焦点，执行上传...`);
      await uploadAll(); // 只上传
    } catch (error) {
      console.error(`❌ [${source}] 上传失败`, error);
      syncStore.isSyncing = false; // 上传报错时重置状态
    }
  }
}, 500);

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
      console.log("🔒 [Tauri Close] 收到关闭请求，开始处理...");

      // 防止重复处理关闭请求 - 使用全局状态
      if (isAppClosing) {
        console.log("⚠️ [Tauri Close] 已在处理关闭请求，忽略重复请求");
        return;
      }
      isAppClosing = true;

      event.preventDefault(); // 先统一阻止默认关闭

      try {
        // 如果正在同步，等待500ms再检查
        if (syncStore.isSyncing) {
          console.log(`⏳ [Tauri Close] 已有同步任务，等待完成...`);
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        // 检查并上传未同步数据
        if (checkUnsyncedData("Tauri Close")) {
          console.log(`📤 [Tauri Close] 执行最终上传 (5秒超时)...`);

          // 创建5秒超时的上传任务
          const uploadPromise = uploadAll();
          const timeoutPromise = new Promise<{ success: false; errors: string[]; uploaded: number }>((_, reject) => {
            setTimeout(() => reject(new Error("上传超时 (5秒)")), 5000);
          });

          try {
            const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
            if (uploadResult.success) {
              console.log(`✅ [Tauri Close] 上传成功: ${uploadResult.uploaded} 项`);
              // 短暂显示成功状态
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
            // 强制重置同步状态
            syncStore.isSyncing = false;
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        } else {
          console.log(`📤 [Tauri Close] 无未同步数据，跳过上传`);
        }

        // 最终关闭窗口
        console.log("🚪 [Tauri Close] 开始关闭窗口...");
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
  const handleBlur = () => debouncedBlurSync("Window Blur");
  const handleFocus = () => debouncedFocusSync("Window Focus");

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

export async function initAppCloseHandler() {
  if (isTauri()) {
    return await setupTauriCloseHandler();
  } else {
    return setupBrowserCloseHandler();
  }
}
