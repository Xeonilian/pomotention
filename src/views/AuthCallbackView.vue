<!-- src/views/AuthCallbackView.vue -->
<template>
  <div class="auth-callback-view">
    <div class="loading-container">
      <p>正在处理验证...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/core/services/supabase";

const router = useRouter();
const supabaseClient = supabase;

onMounted(async () => {
  if (!supabaseClient) {
    console.warn("[AuthCallback] Supabase 未启用，直接返回首页");
    router.push({ name: "Home" });
    return;
  }

  console.log("AuthCallback - 当前 URL:", window.location.href);
  console.log("AuthCallback - hash:", window.location.hash);

  // 从 hash 中获取参数
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const type = hashParams.get("type");
  const accessToken = hashParams.get("access_token");

  console.log("AuthCallback - type:", type);
  console.log("AuthCallback - accessToken:", accessToken);

  // 如果是密码重置
  if (type === "recovery") {
    console.log("✅ 检测到密码重置请求");
    // 等待 Supabase 处理 session
    await new Promise((resolve) => setTimeout(resolve, 500));
    router.push({ name: "ResetPassword" });
    return;
  }

  // 如果是邮箱验证
  if (accessToken) {
    console.log("✅ 检测到邮箱验证");
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
      router.push({ name: "Home" });
      return;
    }
  }

  // 默认返回登录页
  console.log("❌ 未检测到有效参数，返回登录页");
  router.push({ name: "Login" });
});
</script>

<style scoped>
.auth-callback-view {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.loading-container {
  text-align: center;
  padding: 40px;
}

.loading-container p {
  color: #666;
  font-size: 16px;
}
</style>
