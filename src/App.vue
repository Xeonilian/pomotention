<template>
  <n-config-provider>
    <n-notification-provider>
      <n-dialog-provider>
        <router-view />
        <UpdateManager />
        <BackupAlertDialog v-model:showModal="showModal" @update:showModal="showModal = $event" />
      </n-dialog-provider>
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { supabase, isSupabaseEnabled } from "@/core/services/supabase";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useSyncStore } from "@/stores/useSyncStore"; // ✅ 新增引入

import UpdateManager from "./components/UpdateManager.vue";
import BackupAlertDialog from "./components/BackupAlertDialog.vue";

import { initSyncServices, syncAll, resetSyncServices } from "@/services/sync";
import { isTauri } from "@tauri-apps/api/core";
import { initialMigrate } from "./composables/useMigrate";
import { initAppCloseHandler, cancelPendingSyncTasks } from "@/services/appCloseHandler";
import { getCurrentUser } from "@/core/services/authService";

// state & stores
const showModal = ref(false);
const router = useRouter();
const settingStore = useSettingStore();
const dataStore = useDataStore();
const syncStore = useSyncStore(); // ✅ 获取 syncStore 实例

// 用来存储异步初始化返回的清理函数
let appCloseCleanup: (() => void) | undefined | null = null;

const startAppSync = async () => {
  if (!isSupabaseEnabled()) {
    console.warn("[Supabase] 当前未启用，跳过同步初始化。");
    return;
  }

  // console.log("🔄 初始化同步服务...");
  // 初始化同步服务 (绑定 store 数据)
  await initSyncServices(dataStore);

  // console.log("☁️ 开始同步...");
  await syncAll(); // 同步所有数据
};

onMounted(async () => {
  // 1. 初始化本地数据
  await dataStore.loadAllData();

  // 2. Tauri: 首次登陆APP导出/迁移
  if (settingStore.settings.firstSync && isTauri()) {
    await initialMigrate();
    showModal.value = true;
    settingStore.settings.firstSync = false;
  }

  // 检查是否是本地模式
  if (settingStore.settings.localOnlyMode) {
    console.log("✅ 本地模式，跳过登录检查，直接进入Home");
    // 初始化窗口关闭事件
    appCloseCleanup = await initAppCloseHandler();
    router.push({ name: "Home" });
    return;
  }

  // 3. Supabase session & 初始化同步
  // 检查supabase是否启用，如果启用则尝试获取session并启动同步
  if (isSupabaseEnabled() && supabase) {
    settingStore.settings.autoSupabaseSync = true;
    let session = null;

    // 获取用户 session
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("获取 session 错误:", error.message ?? error);
      } else {
        session = data?.session ?? null;
      }
    } catch (err) {
      console.error("获取 session 时出现异常:", err);
    }

    if (session) {
      console.log("✅ 用户已登录", session.user?.id);

      // 检测用户切换
      const currentUserId = session.user?.id;
      const lastUserId = settingStore.settings.lastLoggedInUserId;
      const wasLocalMode = settingStore.settings.wasLocalModeBeforeLogin;

      // 如果是从本地模式切换过来的，且没有 lastUserId，不清除数据
      // 如果检测到用户切换，且不是从本地模式切换过来的，清除数据
      if (lastUserId && lastUserId !== currentUserId && !wasLocalMode) {
        console.log("⚠️ 检测到用户切换，清除本地数据");
        localStorage.clear();
        dataStore.clearData();
        syncStore.lastSyncTimestamp = 0;
        syncStore.isSyncing = false;
        syncStore.syncError = null;
        resetSyncServices();
      }

      // 更新用户ID
      if (currentUserId) {
        settingStore.settings.lastLoggedInUserId = currentUserId;
      }

      // 场景 A：打开 App 时已登录 -> 启动同步
      await startAppSync();
      syncStore.initSyncService(); // 标记已初始化
    } else {
      console.log("ℹ️ 用户未登录，继续使用本地功能");
    }
  } else {
    console.log("ℹ️ Supabase未启用，使用本地模式");
  }

  // 无论是否有session都直接进入Home页面
  // 初始化窗口关闭事件，并将清理函数赋值给外部变量
  appCloseCleanup = await initAppCloseHandler();
  // 清除 url hash 并跳转
  if (window.location.hash) {
    window.history.replaceState(null, "", window.location.pathname);
  }
  router.push({ name: "Home" });

  // 监听认证变化（仅在supabase启用时）
  if (isSupabaseEnabled() && supabase) {
    supabase.auth.onAuthStateChange(async (event, _sess) => {
      console.log(`🔔 Auth 事件: ${event}, syncInitialized=${syncStore.syncInitialized}`);

      if (event === "SIGNED_OUT") {
        // 1️⃣ 退出登录：根据 wasLocalModeBeforeLogin 决定是否清除数据
        const wasLocalMode = settingStore.settings.wasLocalModeBeforeLogin;

        if (wasLocalMode) {
          // 从本地模式切换过来的，不清除本地数据
          console.log("👋 用户退出（从本地模式切换），保留本地数据，只清除认证状态");

          // 只清除认证相关的 localStorage 项
          try {
            // 清除 supabase session
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

          // 取消所有待处理的同步任务 #HACK
          cancelPendingSyncTasks();

          // 重置同步时间戳和状态
          syncStore.lastSyncTimestamp = 0;
          syncStore.isSyncing = false;
          syncStore.syncError = null;
          resetSyncServices();
          syncStore.destroySyncService();
          settingStore.settings.supabaseSync[0] = 0;
          // 清除用户ID记录
          settingStore.settings.lastLoggedInUserId = undefined;
          // 重置标志
          settingStore.settings.wasLocalModeBeforeLogin = false;
        } else {
          // 正常退出，清除所有数据
          console.log("👋 用户退出，清理本地数据与状态");
          localStorage.clear();
          dataStore.clearData();

          // ✅ 关键：重置同步时间戳，防止下次登录误判为增量同步
          syncStore.lastSyncTimestamp = 0;
          // 取消所有待处理的同步任务
          cancelPendingSyncTasks();

          // 如果 syncStore 是用 setup 写法且没有 $reset，手动重置其他状态
          syncStore.isSyncing = false;
          syncStore.syncError = null;
          resetSyncServices();
          syncStore.destroySyncService(); // 重置标志
          settingStore.settings.supabaseSync[0] = 0; // 如果你也用这个存时间，也要重置
          // 清除用户ID记录
          settingStore.settings.lastLoggedInUserId = undefined;
        }

        // 退出登录后不强制跳转，保持在当前页面
      } else if (event === "SIGNED_IN") {
        // 2️⃣ 登录成功
        const user = await getCurrentUser();
        if (user) {
          const currentUserId = user.id;
          const lastUserId = settingStore.settings.lastLoggedInUserId;

          // 检查是否从本地模式登录
          const wasLocalMode = settingStore.settings.localOnlyMode;
          if (wasLocalMode) {
            // 从本地模式登录，设置标志以保护数据
            settingStore.settings.wasLocalModeBeforeLogin = true;
            settingStore.settings.localOnlyMode = false;
            console.log("✅ 从本地模式登录，设置 wasLocalModeBeforeLogin = true");
          }

          // 检测用户切换
          // 如果是从本地模式切换过来的，且没有 lastLoggedInUserId，不清除数据
          if (lastUserId && lastUserId !== currentUserId && !wasLocalMode) {
            console.log("⚠️ 检测到用户切换，清除本地数据");
            localStorage.clear();
            dataStore.clearData();
            syncStore.lastSyncTimestamp = 0;
            syncStore.isSyncing = false;
            syncStore.syncError = null;
            resetSyncServices();
          }

          // 更新用户ID
          settingStore.settings.lastLoggedInUserId = currentUserId;
        }

        // 登录时强制重置同步状态，确保能重新初始化
        console.log("🔄 用户登录，强制重置同步状态");

        // ✅ 双重保险：确保登录时从 0 开始同步
        syncStore.lastSyncTimestamp = 0;

        // 强制重置同步服务状态，允许重新初始化
        resetSyncServices();
        syncStore.destroySyncService();

        // 重新初始化同步服务
        if (!syncStore.syncInitialized) {
          console.log("🔄 重新初始化同步服务");
          await startAppSync();
          syncStore.initSyncService();
        } else {
          console.log("⏭️ 同步服务已初始化，跳过重复执行");
        }
      } else if (event === "INITIAL_SESSION") {
        // 这个事件在 getSession() 后自动触发，跳过
        console.log("⏭️ INITIAL_SESSION 事件，跳过（已在 getSession 中处理）");
      }
    });
  }
});

// 组件卸载时统一清理
onUnmounted(() => {
  // 清理窗口关闭监听
  if (appCloseCleanup) {
    appCloseCleanup();
  }
});
</script>

<style scoped>
html,
body,
#app {
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
