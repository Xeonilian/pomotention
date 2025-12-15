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

  // 只有在真的有未同步数据时才打印，减少失去焦点时的日志干扰
  if (total > 0) {
    console.log("📊 [自动同步检测] 发现未同步数据:", hasUnsynced);
  }

  return total > 0;
}

/**
 * 尝试执行自动同步（用于失去焦点或特定事件）
 */
async function tryAutoSync(source: string) {
  const syncStore = useSyncStore();

  // 如果正在同步，跳过
  if (syncStore.isSyncing) return;

  if (checkUnsyncedData()) {
    console.log(`🔄 [${source}] 触发自动同步...`);
    try {
      await uploadAll();
    } catch (error) {
      console.error(`❌ [${source}] 同步失败:`, error);
    }
  }
}

/**
 * Tauri 环境：拦截窗口关闭 & 失去焦点监听
 */
async function setupTauriCloseHandler() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const appWindow = getCurrentWindow();
  const syncStore = useSyncStore();

  // 1. 监听窗口关闭请求
  const unlistenClose = await appWindow.onCloseRequested(async (event) => {
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
    if (checkUnsyncedData()) {
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

  // 2. ✅ 新增：监听窗口焦点变化
  const unlistenFocus = await appWindow.onFocusChanged(({ payload: focused }) => {
    if (!focused) {
      // 窗口失去焦点（切换到其他软件）
      tryAutoSync("Tauri Blur");
    }
  });

  // 返回组合清理函数
  return () => {
    unlistenClose();
    unlistenFocus();
  };
}

/**
 * 浏览器环境：关闭保护 & 失去焦点监听
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

  // visibilitychange：页面隐藏（最小化/切标签）
  const visibilityChangeHandler = () => {
    if (document.hidden) {
      tryAutoSync("Visibility Hidden");
    }
  };

  // ✅ 新增：blur 页面失去焦点（点击地址栏/开发者工具/其他窗口）
  const blurHandler = () => {
    tryAutoSync("Window Blur");
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
  window.addEventListener("blur", blurHandler); // 注册 blur
  window.addEventListener("pagehide", pageHideHandler);

  // 返回清理函数
  return () => {
    window.removeEventListener("beforeunload", beforeUnloadHandler);
    document.removeEventListener("visibilitychange", visibilityChangeHandler);
    window.removeEventListener("blur", blurHandler); // 清理 blur
    window.removeEventListener("pagehide", pageHideHandler);
  };
}

/**
 * 初始化关闭及后台同步处理
 */
export async function initAppCloseHandler() {
  if (isTauri()) {
    const cleanup = await setupTauriCloseHandler();
    return cleanup;
  } else {
    const cleanup = setupBrowserCloseHandler();
    return cleanup;
  }
}
