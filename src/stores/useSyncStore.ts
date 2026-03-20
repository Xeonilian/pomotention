// src/stores/useSyncStore.ts
import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { useSettingStore } from "./useSettingStore";
import { useRouter } from "vue-router";
import { signOut, getCurrentUser } from "@/core/services/authService";
import { isSupabaseEnabled, supabase } from "@/core/services/supabase";
import { destroyAppCloseHandler } from "@/services/appCloseHandler";

export const useSyncStore = defineStore("sync", () => {
  const settingStore = useSettingStore();
  const router = useRouter();

  // ✅ 同步状态
  const isSyncing = ref(false);
  const syncError = ref<string | null>(null);
  const currentSyncMessage = ref<string>("就绪");
  const syncStatus = ref<"idle" | "syncing" | "uploading" | "downloading" | "error">("idle");

  // 同步服务初始化状态
  const syncInitialized = ref(false);

  // 根据登录状态显示不同的消息
  const syncMessage = computed(() => (isLoggedIn.value ? currentSyncMessage.value : "未登录"));

  // 登录状态
  const isLoggedIn = ref(false);
  const loggingOut = ref(false);

  // 时间戳
  const lastSyncTimestamp = computed({
    get: () => {
      const v = settingStore.settings.supabaseSync[0] || 0;

      return v;
    },
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

  // 开始同步
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

  // 开始下载
  function startDownload() {
    isSyncing.value = true;
    syncStatus.value = "downloading";
    currentSyncMessage.value = "正在下载...";
    syncError.value = null;
  }

  // 同步成功
  function syncSuccess(message: string = "同步完成") {
    isSyncing.value = false;
    syncStatus.value = "idle";
    currentSyncMessage.value = message;
    syncError.value = null;
    lastSyncTimestamp.value = Date.now();
  }

  // 同步失败
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

  // 初始化同步服务（在 App.vue 的 onMounted 中调用）
  function initSyncService() {
    syncInitialized.value = true;
    console.log("✅ 同步服务已初始化");
  }

  // 销毁同步服务（登出时调用）
  function destroySyncService() {
    syncInitialized.value = false;
    console.log("❌ 同步服务已销毁");
  }

  function resetSync() {
    lastSyncTimestamp.value = 0;
    lastCleanupTimestamp.value = 0;
    isSyncing.value = false;
    syncError.value = null;
    currentSyncMessage.value = "就绪";
    syncStatus.value = "idle";
    syncInitialized.value = false;
  }

  function resetSyncState() {
    isSyncing.value = false;
    syncError.value = null;
    currentSyncMessage.value = "就绪";
    syncStatus.value = "idle";
    syncInitialized.value = false;
  }

  // 同步前钩子：在真正执行上传/下载前执行，用于把未保存的编辑先落库（如 TaskRecord 正在编辑时先 commit）
  const beforeSyncCallbacks = new Set<() => void | Promise<void>>();

  function registerBeforeSync(cb: () => void | Promise<void>) {
    beforeSyncCallbacks.add(cb);
  }

  function unregisterBeforeSync(cb: () => void | Promise<void>) {
    beforeSyncCallbacks.delete(cb);
  }

  async function runBeforeSync() {
    await Promise.all(Array.from(beforeSyncCallbacks).map((fn) => Promise.resolve(fn())));
  }

  // 登录状态管理
  async function checkLoginStatus() {
    if (!isSupabaseEnabled()) {
      isLoggedIn.value = false;
      return;
    }
    const user = await getCurrentUser();
    isLoggedIn.value = !!user;
  }

  function handleLogin() {
    console.log("🔐 点击登录按钮，跳转到登录页");
    router.push({ name: "Login" }).catch((err) => {
      console.error("❌ 跳转到登录页失败:", err);
      // 如果名称路由失败，尝试使用路径
      router.push("/login").catch((pathErr) => {
        console.error("❌ 使用路径跳转也失败:", pathErr);
      });
    });
  }

  async function handleLogout() {
    // 防止重复调用
    if (loggingOut.value) {
      console.log("⚠️ 已在退出登录中，跳过重复调用");
      return;
    }

    loggingOut.value = true;

    try {
      // 登出时先销毁同步服务
      destroySyncService();

      // 必须用 supabase 实例判断：isSupabaseEnabled() 在 localOnlyMode 时为 false，会跳过 signOut，导致会话仍留在 localStorage，刷新又自动登录
      if (!supabase) {
        console.log("👋 无 Supabase 客户端，跳过远端 signOut");
      } else {
        console.log("👋 退出登录，切断同步连接");
        await signOut();
      }

      destroyAppCloseHandler();
      isLoggedIn.value = false;
    } catch (error) {
      console.error("退出登录时出错:", error);
    } finally {
      // 无论成功还是失败，都要重置 loading 状态
      loggingOut.value = false;
    }
  }

  return {
    // 同步状态
    isSyncing,
    syncError,
    syncMessage,
    syncStatus,
    lastSyncTimestamp,
    lastCleanupTimestamp,
    syncInitialized,

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
    resetSyncState,
    initSyncService,
    destroySyncService,

    registerBeforeSync,
    unregisterBeforeSync,
    runBeforeSync,

    // 登录方法
    checkLoginStatus,
    handleLogin,
    handleLogout,
  };
});

// 供外部（如 sync 服务）调用的同步前钩子入口，避免 Pinia Store 类型只暴露 state 导致 runBeforeSync 不可见
export async function runBeforeSyncHook() {
  const store = useSyncStore();
  await (store as { runBeforeSync: () => Promise<void> }).runBeforeSync();
}
