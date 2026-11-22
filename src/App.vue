<template>
  <n-notification-provider>
    <n-dialog-provider>
      <router-view />
      <UpdateManager />
      <PwaUpdateNotifier />
      <PwaInstallBanner />
    </n-dialog-provider>
  </n-notification-provider>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, onErrorCaptured } from "vue";
import { useRouter } from "vue-router";
import { supabase, isSupabaseEnabled } from "@/core/services/supabase";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useSyncStore } from "@/stores/useSyncStore";
import { cleanupSyncLifecycle, subscribeAuthStateChanges, teardownAuthSubscription } from "@/core/auth/signedInSessionLifecycle";

import UpdateManager from "./components/platform/UpdateManager.vue";
import PwaInstallBanner from "./components/platform/PwaInstallBanner.vue";
import PwaUpdateNotifier from "./components/platform/PwaUpdateNotifier.vue";
import { useTimerStore } from "@/stores/useTimerStore";
import { resumeSharedAudioAfterForegroundAsync } from "@/core/sounds";
import { bootMark } from "@/bootTiming";
import { clearBootRecoveryFlags } from "@/composables/platform/chunkReloadGuard";
import { beginBootNonAudioPhase } from "@/core/platform/bootFetchQueue";

const shouldLogAppDebug = ["1", "true"].includes(
  String(import.meta.env.VITE_APP_DEBUG_LOG ?? "")
    .trim()
    .toLowerCase(),
);
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

/** 首页实际渲染后再撤启动屏，并清更新/chunk 恢复标记 */
function signalShellReady() {
  clearBootRecoveryFlags();
  beginBootNonAudioPhase();
  // 供晚挂载的 SW 注册逻辑得知首屏已完成（避免错过事件）
  window.__POMO_SHELL_READY__ = true;
  requestAnimationFrame(() => {
    window.dispatchEvent(new CustomEvent("pwa-shell-ready"));
  });
}

async function goHomeAndSignalReady() {
  await router.push({ name: "Home" });
  signalShellReady();
}

// ========== 生命周期钩子 ==========
onMounted(async () => {
  try {
    // 先让浏览器完成首帧绘制，再同步读取大量 localStorage，减轻白屏/长任务
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
    bootMark("app-after-paint");

    // 音频不在启动预取：先非音频壳 → shell-ready 后 SW；音效/白噪音用到再拉
    // 1. 初始化本地数据
    await dataStore.loadAllData();
    bootMark("app-data-loaded");

    // 3. 本地模式直接跳转（Auth 监听因 isSupabaseEnabled 为 false 不会挂载；登录成功后在 LoginView 补挂）
    if (settingStore.settings.localOnlyMode) {
      appDebugLog("✅ 本地模式，跳过登录检查，直接进入Home");
      await goHomeAndSignalReady();
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
    await goHomeAndSignalReady();

    // 6. 初始化Auth状态监听
    subscribeAuthStateChanges();
  } catch (error) {
    console.error("❌ 应用初始化失败:", error);
    // 初始化失败仍跳转Home，保证基础功能可用
    try {
      await router.push({ name: "Home" });
    } catch {
      /* ignore */
    }
    signalShellReady();
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
  dataStore.dateService.setupSystemDateWatcher();
  document.addEventListener("visibilitychange", handleVisibilityReconcileTimer);
  window.addEventListener("pageshow", handlePageShow);
});

// 组件卸载清理
onUnmounted(() => {
  dataStore.dateService.cleanupSystemDateWatcher();
  document.removeEventListener("visibilitychange", handleVisibilityReconcileTimer);
  window.removeEventListener("pageshow", handlePageShow);
  cleanupSyncLifecycle();

  teardownAuthSubscription();
});
</script>
