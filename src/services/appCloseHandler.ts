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

  console.log(`📥 [${source}] 窗口激活，执行全量同步 (拉取更新)...`);
  await syncAll(); // 包含 upload + download
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
    console.log(`📤 [${source}] 窗口失去焦点，执行上传...`);
    await uploadAll(); // 只上传
  }
}, 500);

// =========================================================================
// 监听器注册
// =========================================================================

/**
 * Tauri 环境监听
 */
async function setupTauriCloseHandler() {
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    const appWindow = getCurrentWindow();
    const syncStore = useSyncStore();

    // 1. 关闭拦截 (保持原有逻辑，不做防抖，必须立即执行)
    const unlistenClose = await appWindow.onCloseRequested(async (event) => {
      if (syncStore.isSyncing) {
        event.preventDefault();
        await appWindow.close(); // 或者等待逻辑
        return;
      }
      if (checkUnsyncedData("Tauri Close")) {
        event.preventDefault();
        await uploadAll();
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
