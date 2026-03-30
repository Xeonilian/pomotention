<template>
  <n-config-provider>
    <n-notification-provider>
      <n-dialog-provider>
        <PwaSplashScreen />
        <router-view />
        <UpdateManager />
        <PwaUpdateNotifier />
        <PwaInstallBanner />
      </n-dialog-provider>
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, onErrorCaptured, watch } from "vue";
import { useRouter } from "vue-router";
import { supabase, isSupabaseEnabled } from "@/core/services/supabase";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useSyncStore } from "@/stores/useSyncStore";
import { STORAGE_KEYS } from "@/core/constants";

import UpdateManager from "./components/UpdateManager.vue";
import PwaInstallBanner from "./components/PwaInstallBanner.vue";
import PwaSplashScreen from "./components/PwaSplashScreen.vue";
import PwaUpdateNotifier from "./components/PwaUpdateNotifier.vue";
import { initSyncServices, syncAll, resetSyncServices } from "@/services/sync";
import { initAppCloseHandler, cancelPendingSyncTasks } from "@/services/appCloseHandler";
import { useTimerStore } from "@/stores/useTimerStore";
import { resumeSharedAudioAfterForegroundAsync, prefetchSoundAssets, prefetchWhiteNoiseForSelection } from "@/core/sounds";

// ========== 状态与依赖 ==========
const router = useRouter();
const settingStore = useSettingStore();
const dataStore = useDataStore();
const syncStore = useSyncStore();
const timerStore = useTimerStore();

watch(
  () => settingStore.settings.whiteNoiseSoundTrack,
  (track, prevTrack) => {
    if (track === prevTrack) return;
    prefetchWhiteNoiseForSelection(track);
  },
);

// 清理函数存储
let appCloseCleanup: (() => void) | null = null;
let authStateChangeListener: (() => void) | null = null;

// ========== 工具函数（解耦核心逻辑） ==========
/**
 * 统一销毁同步生命周期（同步服务 + 关闭/焦点监听）
 * 仅在已初始化或有挂载监听时执行，避免无谓的销毁日志
 */
const cleanupSyncLifecycle = () => {
  const hasLifecycle = syncStore.syncInitialized || !!appCloseCleanup;
  if (!hasLifecycle) return;

  cancelPendingSyncTasks();

  if (appCloseCleanup) {
    appCloseCleanup();
    appCloseCleanup = null;
  }

  resetSyncServices();
  syncStore.destroySyncService();
};

/**
 * 集中清理用户数据与状态
 * @param keepLastUserId 是否保留最后一次登录用户ID
 * @param clearAuthSession 是否清除认证会话（退出登录时需要清除）
 * @param clearUserData 是否删除除 globalSettings 外的业务类 localStorage（登出「不保留」时为 true）
 */
const clearAllUserState = (keepLastUserId: boolean = false, clearAuthSession: boolean = false, clearUserData: boolean = false) => {
  // 先停掉同步相关副作用
  cleanupSyncLifecycle();

  // 清除业务数据
  dataStore.clearData();

  // 清除本地存储
  Object.keys(localStorage).forEach((key) => {
    // 保留全局设置，便于记录 lastLoggedInUserId 等配置
    if (key === STORAGE_KEYS.GLOBAL_SETTINGS) return;

    // 认证会话根据标志决定是否清除
    if (key.startsWith("sb-")) {
      if (clearAuthSession) {
        localStorage.removeItem(key);
      }
      return;
    }

    if (clearUserData) {
      localStorage.removeItem(key);
    }
  });

  // 重置同步与标记
  syncStore.resetSync();
  settingStore.settings.wasLocalModeBeforeLogin = false;

  if (!keepLastUserId) {
    settingStore.settings.lastLoggedInUserId = undefined;
  }
};

/**
 * 初始化同步生命周期（同步 + 关闭/焦点监听）
 */
const initSyncLifecycle = async () => {
  if (!isSupabaseEnabled()) {
    console.warn("[Supabase] 未启用，跳过同步初始化");
    return;
  }

  if (syncStore.syncInitialized) {
    console.log("⏭️ 同步已初始化，跳过");
    return;
  }

  try {
    await initSyncServices(dataStore);
    await syncAll();
    appCloseCleanup = await initAppCloseHandler();
    syncStore.initSyncService();
    console.log("✅ 同步生命周期初始化完成");
  } catch (error) {
    console.error("❌ 同步初始化失败:", error);
    syncStore.syncError = error as string;
  }
};

/**
 * 已登录会话处理（包含用户切换判定）
 */
const handleSignedInSession = async (session: any) => {
  const currentUserId = session?.user?.id as string | undefined;
  if (!currentUserId) return;

  const lastUserId = settingStore.settings.lastLoggedInUserId;
  const userSwitched = !!lastUserId && lastUserId !== currentUserId;
  const isSameUser = lastUserId === currentUserId;

  // 更新登录状态和用户ID
  settingStore.settings.localOnlyMode = false;
  settingStore.settings.wasLocalModeBeforeLogin = false;
  // 登录成功默认开启自动同步
  settingStore.settings.autoSupabaseSync = true;
  settingStore.settings.lastLoggedInUserId = currentUserId;
  syncStore.isLoggedIn = true;

  if (userSwitched) {
    // 用户切换：清理数据并重新初始化
    console.log("⚠️ 检测到用户切换，执行本地清理");
    clearAllUserState(false, false, true);
    await initSyncLifecycle();
  } else if (isSameUser && syncStore.syncInitialized) {
    // 同一用户且已初始化：不需要重新初始化，只确保状态正确
    console.log("✅ 同一用户已登录且同步已初始化，跳过重复初始化");
  } else if (syncStore.syncInitialized || appCloseCleanup) {
    // 同步已初始化但用户ID不匹配（可能是首次设置）：重置并重新初始化
    console.log("🔄 重置同步状态并重新初始化");
    cleanupSyncLifecycle();
    syncStore.resetSyncState();
    await initSyncLifecycle();
  } else {
    // 首次初始化
    syncStore.resetSyncState();
    await initSyncLifecycle();
  }
};

/**
 * 处理 SIGNED_OUT 事件
 * keepLocalDataAfterSignOut=true → 保留本地业务数据与上次用户 id；false → 清空业务存储并恢复默认设置（下次等同全新安装）
 */
const handleSignedOut = async () => {
  console.log("👋 用户已登出，清理同步状态和认证会话");
  syncStore.isLoggedIn = false;
  const keep = settingStore.settings.keepLocalDataAfterSignOut || settingStore.settings.keepLocalDataOnNextSignOut;
  settingStore.settings.keepLocalDataOnNextSignOut = false;
  clearAllUserState(keep, true, !keep);
  if (!keep) {
    settingStore.resetSettings();
  }
  await dataStore.loadAllData();
};

/**
 * 初始化 Auth 状态监听
 */
const initAuthStateListener = () => {
  if (!isSupabaseEnabled() || !supabase) return;

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    console.log(`🔔 Auth 事件: ${event}, syncInitialized=${syncStore.syncInitialized}`);

    if (event === "SIGNED_IN") {
      await handleSignedInSession(session);
    } else if (event === "SIGNED_OUT") {
      await handleSignedOut();
    } else if (event === "INITIAL_SESSION") {
      // INITIAL_SESSION 事件在应用启动时触发，已在 onMounted 中处理，这里跳过避免重复初始化
      console.log("⏭️ INITIAL_SESSION 事件，已在 onMounted 中处理，跳过");
    }
  });

  authStateChangeListener = () => subscription.unsubscribe();
};

// ========== 生命周期钩子 ==========
onMounted(async () => {
  try {
    prefetchSoundAssets(settingStore.settings.whiteNoiseSoundTrack);
    // 1. 初始化本地数据
    await dataStore.loadAllData();

    // 3. 本地模式直接跳转（仍保留 Auth 监听以便后续切换登录）
    if (settingStore.settings.localOnlyMode) {
      console.log("✅ 本地模式，跳过登录检查，直接进入Home");
      router.push({ name: "Home" });
      initAuthStateListener();
      return;
    }

    // 4. Supabase登录状态检查
    if (isSupabaseEnabled() && supabase) {
      settingStore.settings.autoSupabaseSync = true;

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data?.session ?? null;
        if (session) {
          await handleSignedInSession(session);
        } else {
          console.log("ℹ️ 用户未登录，继续使用本地功能");
          syncStore.isLoggedIn = false;
        }
      } catch (error) {
        console.error("获取Session失败:", error);
      }
    } else {
      console.log("ℹ️ Supabase未启用，使用本地模式");
    }

    // 5. 清理URL并跳转Home
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    router.push({ name: "Home" });

    // 6. 初始化Auth状态监听
    initAuthStateListener();
  } catch (error) {
    console.error("❌ 应用初始化失败:", error);
    // 初始化失败仍跳转Home，保证基础功能可用
    router.push({ name: "Home" });
  }
});

// 全局错误捕获
onErrorCaptured((error) => {
  console.error("❌ 应用运行时错误:", error);
  return false; // 不阻止错误向上传播
});

// 回到前台：先 await AudioContext.resume，再墙钟校准（避免休眠唤醒后 finalize 播提示音时 ctx 仍 suspended）
const handleVisibilityReconcileTimer = () => {
  if (document.visibilityState === "visible") {
    void (async () => {
      await resumeSharedAudioAfterForegroundAsync();
      timerStore.reconcilePhaseFromWallClock();
    })();
  }
};

const handlePageShow = (e: PageTransitionEvent) => {
  void (async () => {
    await resumeSharedAudioAfterForegroundAsync();
    if (e.persisted) timerStore.reconcilePhaseFromWallClock();
  })();
};

onMounted(() => {
  document.addEventListener("visibilitychange", handleVisibilityReconcileTimer);
  window.addEventListener("pageshow", handlePageShow);
});

// 组件卸载清理
onUnmounted(() => {
  document.removeEventListener("visibilitychange", handleVisibilityReconcileTimer);
  window.removeEventListener("pageshow", handlePageShow);
  cleanupSyncLifecycle();

  if (authStateChangeListener) {
    authStateChangeListener();
    authStateChangeListener = null;
  }
});
</script>
