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
import { onMounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { supabase, isSupabaseEnabled } from "@/core/services/supabase"; // 确保引入
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore } from "@/stores/useTagStore";
import { useTemplateStore } from "@/stores/useTemplateStore";
import { initSyncServices } from "@/services/sync";
import { uploadAllDebounced } from "@/core/utils/autoSync";
import BackupAlertDialog from "./components/BackupAlertDialog.vue";

const showModal = ref(false);
const router = useRouter();
const dataStore = useDataStore();
const tagStore = useTagStore();
const templateStore = useTemplateStore();

const { activityList, todoList, scheduleList, taskList } = storeToRefs(dataStore);
const { rawTags } = storeToRefs(tagStore);
const { rawTemplates } = storeToRefs(templateStore);

onMounted(async () => {
  // ========== 1. 初始化本地数据 ==========
  await dataStore.loadAllData(); // 确保返回 Promise
  console.log("✅ [App] 本地数据已加载");

  // ========== 2. 如果 Supabase 可用，则初始化同步服务 ==========
  if (isSupabaseEnabled()) {
    initSyncServices({
      activityList: activityList,
      todoList: todoList,
      scheduleList: scheduleList,
      taskList: taskList,
      tagList: rawTags,
      templateList: rawTemplates,
    });

    // ========== 3. 监听数据变化，触发自动同步 ==========
    watch(
      [activityList, todoList, scheduleList, taskList, rawTemplates, rawTags],
      () => {
        dataStore.saveAllDebounced(); // 先保存到 localStorage
        uploadAllDebounced(); // 再触发云端同步（5秒防抖）
      },
      { deep: true }
    );
    console.log("✅ [App] 自动同步已启动");

    // ========== 4. 处理 Supabase 的认证回调 ==========
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
      console.log("用户已登录", session);
    } else {
      console.log("没有登录用户，跳转到登录页面");
      router.push({ name: "Login" });
    }

    // 监听认证状态变化
    supabase!.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        console.log("用户登录成功，跳转到首页");
        if (window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname);
        }
        router.push({ name: "Home" });
      }

      if (event === "SIGNED_OUT") {
        console.log("用户已注销，跳转到登录页面");
        router.push({ name: "Login" });
      }
    });
  } else {
    console.warn("[Supabase] 当前未启用，跳过 Supabase 相关操作。");
    // 这里可以自行决定要如何处理离线模式
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
