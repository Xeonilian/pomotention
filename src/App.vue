<template>
  <n-config-provider>
    <n-notification-provider>
      <n-dialog-provider>
        <router-view />
        <UpdateManager />
      </n-dialog-provider>
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { onMounted, watch } from "vue";
import { storeToRefs } from "pinia"; // ✅ 添加导入
import { useRouter } from "vue-router";
import { NConfigProvider, NNotificationProvider, NDialogProvider } from "naive-ui";
import UpdateManager from "./components/UpdateManager.vue";
import { supabase } from "@/core/services/supabase";

// 导入 dataStore 和同步相关
import { useDataStore } from "@/stores/useDataStore";
import { initSyncServices } from "@/services/sync";
import { uploadAllDebounced } from "@/core/utils/autoSync";

const router = useRouter();
const dataStore = useDataStore();

// ✅ 使用 storeToRefs 提取响应式引用
const { activityList, todoList, scheduleList, taskList } = storeToRefs(dataStore);

onMounted(async () => {
  // ========== 1. 初始化本地数据 ==========
  dataStore.loadAllData();
  console.log("✅ [App] 本地数据已加载");

  // ========== 2. 初始化同步服务 ==========
  initSyncServices({
    activityList: activityList,
    todoList: todoList,
    scheduleList: scheduleList,
    // 未来加表只需在这里添加一行
    // scheduleList: scheduleList,
  });

  // ========== 3. 监听数据变化，触发自动同步 ==========
  watch(
    [activityList, todoList, scheduleList, taskList], // ✅ 直接 watch ref
    () => {
      dataStore.saveAllDebounced(); // 先保存到 localStorage
      uploadAllDebounced(); // 再触发云端同步（5秒防抖）
    },
    { deep: true }
  );
  console.log("✅ [App] 自动同步已启动");

  // ========== 4. 处理 Supabase 的认证回调（原有逻辑） ==========
  const { error } = await supabase.auth.getSession();

  if (error) {
    console.error("Error handling auth callback:", error.message);
  }

  // 监听认证状态变化
  supabase.auth.onAuthStateChange((event, session) => {
    // 当用户确认邮箱或登录成功后
    if (event === "SIGNED_IN" && session) {
      // 清除 URL 中的 hash（认证令牌），让 URL 更干净
      if (window.location.hash) {
        window.history.replaceState(null, "", window.location.pathname);
      }
      // 导航到首页
      router.push({ name: "Home" });
    }

    // 当用户退出登录时，重定向到登录页
    if (event === "SIGNED_OUT") {
      router.push({ name: "Login" });
    }
  });
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
