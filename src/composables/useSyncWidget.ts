// src/composables/useSyncWidget.ts
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useSyncStore } from "@/stores/useSyncStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { uploadAll, downloadAll } from "@/services/sync";
import { useRelativeTime } from "@/composables/useRelativeTime";
import { signOut, getCurrentUser } from "@/core/services/authService";
import { supabase, isSupabaseEnabled } from "@/core/services/supabase";
import { collectLocalData } from "@/services/localStorageService";
import { open } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "@tauri-apps/api/core";

export function useSyncWidget() {
  const syncStore = useSyncStore();
  const settingStore = useSettingStore();
  const router = useRouter();

  const syncIcon = computed(() => {
    // 未登录状态优先显示
    if (isSupabaseEnabled() && !isLoggedIn.value) {
      return "🔒";
    }

    switch (syncStore.syncStatus) {
      case "syncing":
      case "uploading":
      case "downloading":
        return "🔄";
      case "error":
        return "❌";
      default:
        return "✅";
    }
  });

  const relativeTime = useRelativeTime(computed(() => syncStore.lastSyncTimestamp));

  async function handleUpload() {
    try {
      await uploadAll();
    } catch (error) {
      console.error("Upload failed:", error);
    }
  }

  async function handleDownload() {
    try {
      const lastSync = syncStore.lastSyncTimestamp;
      await downloadAll(lastSync);
    } catch (error) {
      console.error("Download failed:", error);
    }
  }

  // === 登录/退出逻辑 ===
  const isLoggedIn = ref(false);
  const loggingOut = ref(false);
  let authStateSubscription: { unsubscribe: () => void } | null = null;

  // 检查登录状态
  async function checkLoginStatus() {
    if (!isSupabaseEnabled()) {
      isLoggedIn.value = false;
      return;
    }
    const user = await getCurrentUser();
    isLoggedIn.value = !!user;
  }

  // 登录跳转函数
  function handleLogin() {
    router.push({ name: "Login" });
  }

  // 导出数据
  async function handleExport() {
    try {
      const localdata = collectLocalData();

      // 选择目录
      const dirPath = await open({
        directory: true,
        multiple: false,
      });

      if (!dirPath || typeof dirPath !== "string") {
        return false;
      }

      // 分别保存每个数据类型
      const savePromises = Object.entries(localdata).map(async ([key, value]) => {
        const fileName = `${key}.json`;
        const filePath = `${dirPath}/${fileName}`;
        const jsonData = JSON.stringify(value, null, 2);
        await writeTextFile(filePath, jsonData);
        return fileName;
      });

      await Promise.all(savePromises);
      return true;
    } catch (error) {
      console.error("导出失败:", error);
      return false;
    }
  }

  // 退出登录
  async function handleLogout() {
    loggingOut.value = true;

    // 检查是否从本地模式切换过来的
    const wasLocalMode = settingStore.settings.wasLocalModeBeforeLogin;

    if (wasLocalMode) {
      // 从本地模式切换过来的，不清除本地数据
      console.log("👋 退出登录（从本地模式切换），保留本地数据");

      // 只清除认证相关的 localStorage 项
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes("supabase") || key.includes("auth"))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      } catch (err) {
        console.error("清除认证数据时出错:", err);
      }
    } else {
      // 正常退出，清除所有数据
      // App上数据备份
      if (isTauri()) {
        const confirmExport = confirm("在退出之前，您必须导出数据。是否继续导出？");
        if (confirmExport) {
          const exportSuccessful = await handleExport();
          if (!exportSuccessful) {
            // 如果导出失败，停止注销
            loggingOut.value = false;
            return;
          }
        }
      }
      localStorage.clear();
    }

    await signOut();
    loggingOut.value = false;
    // 退出登录后更新登录状态，不强制跳转
    await checkLoginStatus();
  }

  // 初始化登录状态和监听
  onMounted(async () => {
    await checkLoginStatus();

    // 监听认证状态变化
    if (isSupabaseEnabled() && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event) => {
        console.log(`🔔 MainLayout Auth 事件: ${event}`);
        await checkLoginStatus();
      });
      authStateSubscription = subscription;
    }
  });

  // 组件卸载时清理认证状态监听
  onUnmounted(() => {
    if (authStateSubscription) {
      authStateSubscription.unsubscribe();
      authStateSubscription = null;
    }
  });

  return {
    syncStore,
    syncIcon,
    relativeTime,
    handleUpload,
    handleDownload,
    // 登录相关
    isLoggedIn,
    loggingOut,
    checkLoginStatus,
    handleLogin,
    handleLogout,
  };
}
