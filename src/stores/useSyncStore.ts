// src/stores/useSyncStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useSettingStore } from "./useSettingStore";
import { useRouter } from "vue-router";
import { signOut, getCurrentUser } from "@/core/services/authService";
import { supabase, isSupabaseEnabled } from "@/core/services/supabase";

export const useSyncStore = defineStore("sync", () => {
  const settingStore = useSettingStore();
  const router = useRouter();

  // ✅ 同步状态
  const isSyncing = ref(false);
  const syncError = ref<string | null>(null);
  const currentSyncMessage = ref<string>("就绪");
  const syncStatus = ref<"idle" | "syncing" | "uploading" | "downloading" | "error">("idle");

  // 根据登录状态显示不同的消息
  const syncMessage = computed(() => (isLoggedIn.value ? currentSyncMessage.value : "未登录"));

  // ✅ 登录状态
  const isLoggedIn = ref(false);
  const loggingOut = ref(false);
  let authStateSubscription: { unsubscribe: () => void } | null = null;

  // 时间戳
  const lastSyncTimestamp = computed({
    get: () => settingStore.settings.supabaseSync[0] || 0,
    set: (val: number) => {
      settingStore.settings.supabaseSync[0] = val;
    },
  });

  const lastCleanupTimestamp = computed({
    get: () => settingStore.settings.supabaseSync[1] || 0,
    set: (val: number) => {
      settingStore.settings.supabaseSync[1] = val;
    },
  });

  // ✅ 开始同步
  function startSync(message: string = "正在同步...") {
    isSyncing.value = true;
    syncStatus.value = "syncing";
    currentSyncMessage.value = message;
    syncError.value = null;
  }

  // ✅ 开始上传
  function startUpload() {
    isSyncing.value = true;
    syncStatus.value = "uploading";
    currentSyncMessage.value = "正在上传...";
    syncError.value = null;
  }

  // ✅ 开始下载
  function startDownload() {
    isSyncing.value = true;
    syncStatus.value = "downloading";
    currentSyncMessage.value = "正在下载...";
    syncError.value = null;
  }

  // ✅ 同步成功
  function syncSuccess(message: string = "同步完成") {
    isSyncing.value = false;
    syncStatus.value = "idle";
    currentSyncMessage.value = message;
    syncError.value = null;
    lastSyncTimestamp.value = Date.now();
  }

  // ✅ 同步失败
  function syncFailed(error: string) {
    isSyncing.value = false;
    syncStatus.value = "error";
    currentSyncMessage.value = "同步失败";
    syncError.value = error;
  }

  function updateLastSyncTimestamp(timestamp?: number) {
    lastSyncTimestamp.value = timestamp ?? Date.now();
  }

  function updateLastCleanupTimestamp(timestamp?: number) {
    lastCleanupTimestamp.value = timestamp ?? Date.now();
  }

  function resetSync() {
    lastSyncTimestamp.value = 0;
    lastCleanupTimestamp.value = 0;
    isSyncing.value = false;
    syncError.value = null;
    currentSyncMessage.value = "就绪";
    syncStatus.value = "idle";
  }

  // ✅ 登录状态管理
  async function checkLoginStatus() {
    if (!isSupabaseEnabled()) {
      isLoggedIn.value = false;
      return;
    }
    const user = await getCurrentUser();
    isLoggedIn.value = !!user;
  }

  function handleLogin() {
    router.push({ name: "Login" });
  }

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
      localStorage.clear();
    }

    await signOut();
    loggingOut.value = false;
    // 退出登录后更新登录状态，不强制跳转
    await checkLoginStatus();
  }

  // 初始化认证监听
  function initAuthListener() {
    if (isSupabaseEnabled() && supabase) {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event) => {
        console.log(`🔔 SyncStore Auth 事件: ${event}`);
        await checkLoginStatus();
      });
      authStateSubscription = subscription;
    }
  }

  // 清理认证监听
  function cleanupAuthListener() {
    if (authStateSubscription) {
      authStateSubscription.unsubscribe();
      authStateSubscription = null;
    }
  }

  return {
    // 状态
    isSyncing,
    syncError,
    syncMessage,
    syncStatus,
    lastSyncTimestamp,
    lastCleanupTimestamp,
    // 登录状态
    isLoggedIn,
    loggingOut,

    // 方法
    startSync,
    startUpload,
    startDownload,
    syncSuccess,
    syncFailed,
    updateLastSyncTimestamp,
    updateLastCleanupTimestamp,
    resetSync,
    // 登录方法
    checkLoginStatus,
    handleLogin,
    handleLogout,
    initAuthListener,
    cleanupAuthListener,
  };
});
