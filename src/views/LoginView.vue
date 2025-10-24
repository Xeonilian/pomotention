<!-- src/views/LoginView.vue -->
<template>
  <div class="login-view">
    <h1>欢迎回来</h1>
    <p class="subtitle">登录或注册以同步您的数据</p>

    <div class="form-container">
      <input type="email" v-model="email" placeholder="邮箱地址" />
      <input type="password" v-model="password" placeholder="密码 (至少6位)" @keyup.enter="handleSignIn" />

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div class="button-group">
        <button @click="handleSignIn" :disabled="loading">
          {{ loading ? "登录中..." : "登录" }}
        </button>
        <button @click="handleSignUp" :disabled="loading" class="secondary">
          {{ loading ? "注册中..." : "注册" }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { signIn, signUp } from "@/core/services/authServicve";
import { supabase } from "@/core/services/supabase";

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");
const router = useRouter();

// 处理邮箱验证回调
onMounted(async () => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get("access_token");

  if (accessToken) {
    console.log("检测到邮箱验证，正在处理...");
    const { data } = await supabase.auth.getSession();

    if (data.session) {
      console.log("验证成功！");
      router.push({ name: "Home" });
    }
  }
});

// 处理登录
async function handleSignIn() {
  if (!email.value || !password.value) {
    errorMessage.value = "邮箱和密码不能为空";
    return;
  }
  loading.value = true;
  errorMessage.value = "";

  const { error } = await signIn({ email: email.value, password: password.value });

  loading.value = false;
  if (error) {
    errorMessage.value = `登录失败: ${error.message}`;
  } else {
    // 登录成功，跳转到首页或之前的页面
    router.push({ name: "Home" });
  }
}

// 处理注册
async function handleSignUp() {
  if (!email.value || !password.value) {
    errorMessage.value = "邮箱和密码不能为空";
    return;
  }
  loading.value = true;
  errorMessage.value = "";

  const { error } = await signUp({ email: email.value, password: password.value });

  loading.value = false;
  if (error) {
    errorMessage.value = `注册失败: ${error.message}`;
  } else {
    errorMessage.value = "注册成功！请检查您的邮箱以完成验证，然后尝试登录。";
  }
}
</script>

<style scoped>
.login-view {
  max-width: 400px;
  margin: 100px auto;
  padding: 40px;
  text-align: center;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: var(--color-background-light-light);
}
.subtitle {
  color: #666;
  margin-bottom: 30px;
}
.form-container input {
  width: 100%;
  padding: 12px;
  margin-bottom: 15px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
.error-message {
  color: var(--color-red);
  margin-bottom: 15px;
}
.button-group {
  display: flex;
  gap: 10px;
}
.button-group button {
  flex-grow: 1;
  padding: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #333;
  color: white;
}
.button-group button.secondary {
  background-color: #f0f0f0;
  color: #333;
}
.button-group button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
