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
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { NConfigProvider, NNotificationProvider, NDialogProvider } from "naive-ui";
import UpdateManager from "./components/UpdateManager.vue";
import { supabase } from "@/core/services/supabase";

const router = useRouter();

onMounted(async () => {
  // 处理 Supabase 的认证回调（邮箱确认、密码重置等）
  const { error } = await supabase.auth.getSession();

  if (error) {
    console.error("Error handling auth callback:", error.message);
  }

  // 监听认证状态变化
  supabase.auth.onAuthStateChange((event, session) => {
    //console.log("Auth state changed:", event, session);

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
