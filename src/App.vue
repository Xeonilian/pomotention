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
import { onMounted, ref, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { supabase, isSupabaseEnabled } from "@/core/services/supabase"; // 确保引入
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { useTemplateStore } from "@/stores/useTemplateStore";
import { initSyncServices, syncAll } from "@/services/sync"; // 导入必要的同步服务
import { uploadAllDebounced } from "@/core/utils/autoSync";
import BackupAlertDialog from "./components/BackupAlertDialog.vue";
import { initializeTouchHandling, cleanupTouchHandling } from "@/core/utils/touchHandler";
import { useSettingStore } from "@/stores/useSettingStore";
import { runMigrations } from "@/services/migrationService";
import { isTauri } from "@tauri-apps/api/core";
import { downloadAll } from "@/services/sync";

const showModal = ref(false);
const router = useRouter();
const dataStore = useDataStore();
const tagStore = useTagStore();
const templateStore = useTemplateStore();
const settingStore = useSettingStore();
const { activityList, todoList, scheduleList, taskList } = storeToRefs(dataStore);
const { rawTags } = storeToRefs(tagStore);
const { rawTemplates } = storeToRefs(templateStore);
const subscriptions: any[] = [];
const tables = ["activities", "todos", "tasks", "schedules", "tags", "templates"];

onMounted(async () => {
  settingStore.settings.autoSupabaseSync = true;
  // ========== 1. 初始化本地数据 ==========
  await dataStore.loadAllData(); // 确保返回 Promise
  console.log("✅ [App] 本地数据已加载");

  // ===========2. Tauri环境首次登陆 引导数据导出 ======
  if (settingStore.settings.firstSync && isTauri()) {
    console.log("✅ [App] 首次同步", settingStore.settings.firstSync);
    const migrationReport = runMigrations();
    const errors = [];
    if (migrationReport.errors.length > 0) {
      console.error("⚠️ [Sync] 迁移过程中出现错误", migrationReport.errors);
      errors.push(...migrationReport.errors.map((e) => `迁移错误: ${e}`));
    }

    if (migrationReport.cleaned.length > 0) {
      console.log(`✅ [Sync] 清理了 ${migrationReport.cleaned.length} 个废弃 key`);
    }

    if (migrationReport.migrated.length > 0) {
      console.log(`✅ [Sync] 迁移了 ${migrationReport.migrated.length} 个数据集`);
    }

    showModal.value = true;
    settingStore.settings.firstSync = false;
  }

  // ========== 3.  Supabase 的认证回调 ==========
  const {
    data: { session },
    error,
  } = await supabase!.auth.getSession();

  if (error) {
    console.error("获取 session 时出现错误:", error.message);
    return; // 如果获取 session 失败，不继续后面的逻辑
  }

  // 检查用户的登录状态
  if (session) {
    console.log("用户已登录", session.user.id);
    // ========== 2. 如果 Supabase 可用，则初始化同步服务 ==========
    if (isSupabaseEnabled()) {
      await initSyncServices({
        activityList,
        todoList,
        scheduleList,
        taskList,
        tagList: rawTags,
        templateList: rawTemplates,
      });

      // ========== 3. 触发第一次同步 ==========
      await syncAll(); // 确保在服务初始化后立即同步数据
      console.log("✅ [App] 第一次同步完成");

      // ========== 4. 监听数据变化，触发自动同步 ==========
      watch(
        [activityList, todoList, scheduleList, taskList, rawTemplates, rawTags],
        () => {
          dataStore.saveAllDebounced(); // 先保存到 localStorage
          uploadAllDebounced(); // 再触发云端同步（5秒防抖）
        },
        { deep: true }
      );
      console.log("✅ [App] 自动同步已启动");

      // 启动触摸
      if (!isTauri()) initializeTouchHandling();

      // 启动频道
      createChannelSubscriptions(tables);
    } else {
      console.warn("[Supabase] 当前未启用，跳过 Supabase 相关操作。");
      // 这里可以自行决定要如何处理离线模式
    }

    // 监听认证状态变化
    supabase!.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        console.log("用户登录成功，跳转到首页");

        // 重定向去除 URL hash
        if (window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }

        router.push({ name: "Home" });
      }

      if (event === "SIGNED_OUT") {
        console.log("用户已退出，跳转到登录页面");
        router.push({ name: "Login" });
      }
    });
  } else {
    console.log("没有登录用户，跳转到登录页面");
    router.push({ name: "Login" });
  }
});

onUnmounted(() => {
  if (!isTauri()) cleanupTouchHandling();
  cleanupSubscriptions();
});

function createChannelSubscriptions(tables: String[]) {
  tables.forEach((table: String) => {
    const channel = supabase!.channel(`realtime:${table}`, { config: { private: true } });
    channel
      .on("broadcast", { event: "*" }, (payload) => {
        console.log(`${table} 数据变更:`, payload);
        downloadAll(0); // 调用下载数据的函数
      })
      .subscribe((status) => {
        console.log(`订阅频道 ${channel} 状态:`, status);
      });

    subscriptions.push(channel); // 保存订阅的频道
  });
}

// 清理所有频道订阅
function cleanupSubscriptions() {
  subscriptions.forEach((channel) => {
    channel.unsubscribe();
    console.log(`已取消对频道 ${channel.name} 的订阅`);
  });
}
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
