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
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { supabase, isSupabaseEnabled } from "@/core/services/supabase";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";

import UpdateManager from "./components/UpdateManager.vue";
import BackupAlertDialog from "./components/BackupAlertDialog.vue";

import { initSyncServices, syncAll } from "@/services/sync";
import { initializeTouchHandling, cleanupTouchHandling } from "@/core/utils/touchHandler";
import { isTauri } from "@tauri-apps/api/core";
import { initialMigrate } from "./composables/useMigrate";
import { initAppCloseHandler } from "@/services/appCloseHandler";

// state & stores
const showModal = ref(false);
const router = useRouter();
const settingStore = useSettingStore();
const dataStore = useDataStore();

const { activityList, todoList, scheduleList, taskList, tagList, templateList } = storeToRefs(dataStore);

const startAppSync = async () => {
  if (!isSupabaseEnabled()) {
    console.warn("[Supabase] 当前未启用，跳过同步初始化。");
    return;
  }

  console.log("🔄 初始化同步服务...");
  // 初始化同步服务 (绑定 store 数据)
  await initSyncServices({
    activityList,
    todoList,
    scheduleList,
    taskList,
    tagList,
    templateList,
    // Maps
    activityById: dataStore.activityById,
    todoById: dataStore.todoById,
    scheduleById: dataStore.scheduleById,
    taskById: dataStore.taskById,
    tagById: dataStore.tagById,
    templateById: dataStore.templateById,
  });

  console.log("☁️ 开始全量同步...");
  await syncAll(); // 同步所有数据
};

onMounted(async () => {
  // ✅ 新增：同步初始化标志
  const syncInitialized = ref(false);

  // 1. 初始化本地数据
  await dataStore.loadAllData();

  // 触摸事件处理（非 Tauri）
  if (!isTauri()) initializeTouchHandling();

  // 2. Tauri: 首次登陆APP导出/迁移
  if (settingStore.settings.firstSync && isTauri()) {
    await initialMigrate();
    showModal.value = true;
    settingStore.settings.firstSync = false;
  }

  // 3. Supabase session & 初始化同步
  settingStore.settings.autoSupabaseSync = true;
  let session = null;

  // 获取用户 session
  try {
    const { data, error } = await supabase!.auth.getSession();
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

    // ✅ 场景 A：打开 App 时已登录 -> 启动同步
    await startAppSync();
    syncInitialized.value = true; // 标记已初始化

    // 清除 url hash 并跳转
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    router.push({ name: "Home" });
  } else {
    console.log("❌ 没有登录用户，跳转到登录页面");
    router.push({ name: "Login" });
  }

  // 监听认证变化
  supabase!.auth.onAuthStateChange(async (event, _sess) => {
    console.log(`🔔 Auth 事件: ${event}, syncInitialized=${syncInitialized.value}`);

    if (event === "SIGNED_OUT") {
      localStorage.clear();
      dataStore.clearData();
      syncInitialized.value = false; // ✅ 重置标志
      router.push({ name: "Login" });
    } else if (event === "SIGNED_IN") {
      // ✅ 场景 B：用户主动登录（不在 App 启动时）
      if (!syncInitialized.value) {
        console.log("🔄 用户登录，开始首次同步");
        await startAppSync();
        syncInitialized.value = true;
      } else {
        console.log("⏭️ 已完成同步初始化，跳过重复执行");
      }
    } else if (event === "INITIAL_SESSION") {
      // ✅ 这个事件在 getSession() 后自动触发，跳过
      console.log("⏭️ INITIAL_SESSION 事件，跳过（已在 getSession 中处理）");
    }
  });

  // ✅ 初始化窗口关闭事件
  const cleanup = await initAppCloseHandler();
  // 组件卸载时清理
  onUnmounted(() => {
    cleanup?.();
  });
});

// 确保卸载时清理
onUnmounted(() => {
  if (!isTauri()) cleanupTouchHandling();
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
