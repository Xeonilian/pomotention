// src / services / appCloseHandler.ts;
import { useSyncStore } from "@/stores/useSyncStore";
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { useTemplateStore } from "@/stores/useTemplateStore";
import { uploadAll } from "@/services/sync";
import { isTauri } from "@tauri-apps/api/core";

/**
 * 检查是否有未同步数据
 */
function checkUnsyncedData(): boolean {
  const dataStore = useDataStore();
  const tagStore = useTagStore();
  const templateStore = useTemplateStore();

  const hasUnsynced = {
    activities: dataStore.activityList.some((item) => !item.synced),
    todos: dataStore.todoList.some((item) => !item.synced),
    schedules: dataStore.scheduleList.some((item) => !item.synced),
    tasks: dataStore.taskList.some((item) => !item.synced),
    tags: tagStore.rawTags.some((item) => !item.synced),
    templates: templateStore.rawTemplates.some((item) => !item.synced),
  };

  const total = Object.values(hasUnsynced).filter(Boolean).length;

  if (total > 0) {
    console.log("📊 未同步数据统计:", hasUnsynced);
  }

  return total > 0;
}

/**
 * Tauri 环境：拦截窗口关闭
 */
async function setupTauriCloseHandler() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();
  const syncStore = useSyncStore();

  const unlisten = await appWindow.onCloseRequested(async (event) => {
    console.log("🚪 Tauri 窗口准备关闭");

    // 如果正在同步，等待完成
    if (syncStore.isSyncing) {
      console.log("⏳ 正在同步，等待完成...");
      event.preventDefault();

      const timeout = 10000;
      const startTime = Date.now();

      while (syncStore.isSyncing && Date.now() - startTime < timeout) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (syncStore.isSyncing) {
        console.warn("⚠️ 同步超时，强制关闭");
      } else {
        console.log("✅ 同步完成，允许关闭");
      }

      await appWindow.close();
      return;
    }

    // 检查是否有未同步数据
    const hasUnsyncedData = checkUnsyncedData();

    if (hasUnsyncedData) {
      console.log("📤 有未同步数据，开始上传...");
      event.preventDefault();

      try {
        await uploadAll();
        console.log("✅ 上传完成，允许关闭");
      } catch (error) {
        console.error("❌ 上传失败:", error);
      }

      await appWindow.close();
    } else {
      console.log("✅ 无未同步数据，允许关闭");
    }
  });

  return unlisten;
}

/**
 * 浏览器环境：尽力保存
 */
function setupBrowserCloseHandler() {
  const syncStore = useSyncStore();

  // beforeunload：尝试阻止关闭
  const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    const hasUnsyncedData = checkUnsyncedData();

    if (syncStore.isSyncing || hasUnsyncedData) {
      console.log("⚠️ 有未完成的同步操作");
      e.preventDefault();
      e.returnValue = "";
      uploadAll().catch(console.error);
      return "";
    }
  };

  // visibilitychange：页面隐藏时保存
  const visibilityChangeHandler = () => {
    if (document.hidden && checkUnsyncedData()) {
      console.log("📱 页面隐藏，立即上传");
      uploadAll().catch(console.error);
    }
  };

  // pagehide：页面即将卸载
  const pageHideHandler = () => {
    if (checkUnsyncedData()) {
      console.log("📤 页面卸载");
      uploadAll().catch(console.error);
    }
  };

  window.addEventListener("beforeunload", beforeUnloadHandler);
  document.addEventListener("visibilitychange", visibilityChangeHandler);
  window.addEventListener("pagehide", pageHideHandler);

  // 返回清理函数
  return () => {
    window.removeEventListener("beforeunload", beforeUnloadHandler);
    document.removeEventListener("visibilitychange", visibilityChangeHandler);
    window.removeEventListener("pagehide", pageHideHandler);
  };
}

/**
 * 初始化关闭前同步处理
 */
export async function initAppCloseHandler() {
  if (isTauri()) {
    const unlisten = await setupTauriCloseHandler();
    return unlisten;
  } else {
    const cleanup = setupBrowserCloseHandler();
    return cleanup;
  }
}
