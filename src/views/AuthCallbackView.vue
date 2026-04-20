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
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/core/services/supabase";
import {
  clearAuthCallbackRecoveryHint,
  consumeAuthCallbackRecoveryHint,
} from "@/core/auth/authCallbackHints";

const router = useRouter();
const supabaseClient = supabase;

/** 解析 access_token payload（仅用于识别 recovery，本地 base64 解码） */
function parseAccessTokenPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const part = accessToken.split(".")[1];
    if (!part) return null;
    const base64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    const json = atob(padded);
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** hash 已被客户端抢先清空时，用 JWT amr 区分密码重置链路与普通登录 */
function sessionIsPasswordRecovery(session: Session): boolean {
  const payload = parseAccessTokenPayload(session.access_token);
  const amr = payload?.amr;
  if (!Array.isArray(amr)) return false;
  return amr.some((entry) => {
    if (entry === "recovery") return true;
    if (entry && typeof entry === "object" && "method" in entry) {
      return (entry as { method?: string }).method === "recovery";
    }
    return false;
  });
}

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
  console.log("AuthCallback - accessToken:", accessToken ? "(present)" : "(absent)");

  // 如果是密码重置
  if (type === "recovery") {
    console.log("✅ 检测到密码重置请求");
    clearAuthCallbackRecoveryHint();
    // 等待 Supabase 处理 session
    await new Promise((resolve) => setTimeout(resolve, 500));
    router.push({ name: "ResetPassword" });
    return;
  }

  // 如果是邮箱验证（hash 仍可读）
  if (accessToken) {
    console.log("✅ 检测到邮箱验证");
    const { data } = await supabaseClient.auth.getSession();

    if (data.session) {
      router.push({ name: "Home" });
      return;
    }
  }

  // detectSessionInUrl 已抢先消费 hash：无 token 仍可能有 session，勿直接退回登录页
  const { data: fallback } = await supabaseClient.auth.getSession();
  if (fallback.session) {
    console.log("✅ hash 已空但 session 存在，跳转（回调链已由客户端写入 storage）");
    const isRecovery =
      consumeAuthCallbackRecoveryHint() || sessionIsPasswordRecovery(fallback.session);
    const target = isRecovery ? "ResetPassword" : "Home";
    router.push({ name: target });
    return;
  }

  console.log("❌ 未检测到有效参数与 session，返回登录页");
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
