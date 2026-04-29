<template>
  <n-notification-provider>
    <n-dialog-provider>
      <PwaSplashScreen />
      <router-view />
      <UpdateManager />
      <PwaUpdateNotifier />
      <PwaInstallBanner />
    </n-dialog-provider>
  </n-notification-provider>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, onErrorCaptured, watch } from "vue";
import { useRouter } from "vue-router";
import { supabase, isSupabaseEnabled } from "@/core/services/supabase";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useSyncStore } from "@/stores/useSyncStore";
import {
  cleanupSyncLifecycle,
  subscribeAuthStateChanges,
  teardownAuthSubscription,
} from "@/core/auth/signedInSessionLifecycle";

import UpdateManager from "./components/UpdateManager.vue";
import PwaInstallBanner from "./components/PwaInstallBanner.vue";
import PwaSplashScreen from "./components/PwaSplashScreen.vue";
import PwaUpdateNotifier from "./components/PwaUpdateNotifier.vue";
import { useTimerStore } from "@/stores/useTimerStore";
import { resumeSharedAudioAfterForegroundAsync, prefetchSoundAssets, prefetchWhiteNoiseForSelection } from "@/core/sounds";
import { bootMark } from "@/bootTiming";

const shouldLogAppDebug = ["1", "true"].includes(String(import.meta.env.VITE_APP_DEBUG_LOG ?? "").trim().toLowerCase());
function appDebugLog(...args: unknown[]) {
  if (!shouldLogAppDebug) return;
  console.log(...args);
}

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

// ========== 生命周期钩子 ==========
onMounted(async () => {
  try {
    // 先让浏览器完成首帧绘制，再同步读取大量 localStorage，减轻白屏/长任务
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    bootMark("app-after-paint");

    // v3: 确保prefetch在PWA reload后完成，避免timer在sounds未就绪时启动 (iPhone sound fix)
    appDebugLog("[App] Starting prefetchSoundAssets for timer sounds");
    prefetchSoundAssets(settingStore.settings.whiteNoiseSoundTrack);
    // 1. 初始化本地数据
    await dataStore.loadAllData();
    bootMark("app-data-loaded");

    // 3. 本地模式直接跳转（Auth 监听因 isSupabaseEnabled 为 false 不会挂载；登录成功后在 LoginView 补挂）
    if (settingStore.settings.localOnlyMode) {
      appDebugLog("✅ 本地模式，跳过登录检查，直接进入Home");
      router.push({ name: "Home" });
      subscribeAuthStateChanges();
      return;
    }

    // 4. Supabase登录状态检查
    if (isSupabaseEnabled() && supabase) {
      settingStore.settings.autoSupabaseSync = true;

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const session = data?.session ?? null;
        if (!session) {
          appDebugLog("ℹ️ 用户未登录，继续使用本地功能");
          syncStore.isLoggedIn = false;
        }
      } catch (error) {
        console.error("获取Session失败:", error);
      }
    } else {
      appDebugLog("ℹ️ Supabase未启用，使用本地模式");
    }

    // 5. 清理URL并跳转Home
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    router.push({ name: "Home" });

    // 6. 初始化Auth状态监听
    subscribeAuthStateChanges();
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

  teardownAuthSubscription();
});
</script>
