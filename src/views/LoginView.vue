<!-- src/views/LoginView.vue -->
<template>
  <div class="login-view">
    <h1>欢迎回来</h1>
    <p class="subtitle">登录或注册以同步您的数据</p>

    <div class="form-container">
      <input type="email" v-model="email" placeholder="邮箱地址" />
      <input v-if="!isResetMode" type="password" v-model="password" placeholder="密码 (至少6位)" @keyup.enter="handleSignIn" />

      <div v-if="errorMessage" class="error-message">
        {{ errorMessage }}
      </div>

      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>

      <!-- 正常登录/注册模式 -->
      <div v-if="!isResetMode" class="button-group">
        <button @click="handleSignIn" :disabled="loading">
          {{ loading ? "登录中..." : "登录" }}
        </button>
        <button @click="handleSignUp" :disabled="loading" class="secondary">
          {{ loading ? "注册中..." : "注册" }}
        </button>
      </div>

      <!-- 找回密码模式 -->
      <div v-else class="button-group">
        <button @click="handleResetPassword" :disabled="loading">
          {{ loading ? "发送中..." : "发送重置链接" }}
        </button>
        <button @click="cancelReset" :disabled="loading" class="secondary">取消</button>
      </div>

      <!-- 忘记密码链接 -->
      <div class="forgot-password">
        <a @click="toggleResetMode" href="javascript:void(0)">
          {{ isResetMode ? "返回登录" : "忘记密码？" }}
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { signIn, signUp } from "@/core/services/authServicve";
import { supabase } from "@/core/services/supabase";

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const isResetMode = ref(false);
const router = useRouter();

// 处理邮箱验证回调
onMounted(async () => {
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get("access_token");
  const type = hashParams.get("type");

  if (accessToken && type === "recovery") {
    console.log("检测到密码重置请求，跳转到重置密码页面...");
    // 清理 URL 中的 hash，但保持 session
    window.history.replaceState({}, document.title, window.location.pathname);
    // 直接跳转到重置密码页面
    router.push({ name: "ResetPassword" });
    return;
  }

  if (accessToken) {
    console.log("检测到邮箱验证，正在处理...");
    const { data } = await supabase.auth.getSession();

    if (data.session) {
      console.log("验证成功！");
      router.push({ name: "Home" });
    }
  }
});

// 切换找回密码模式
function toggleResetMode() {
  isResetMode.value = !isResetMode.value;
  errorMessage.value = "";
  successMessage.value = "";
  password.value = "";
}

// 取消找回密码
function cancelReset() {
  isResetMode.value = false;
  errorMessage.value = "";
  successMessage.value = "";
}

// 找回密码
async function handleResetPassword() {
  if (!email.value) {
    errorMessage.value = "请输入您的邮箱地址";
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    // ✅ 确保是这个 URL
    const redirectUrl = `${window.location.origin}/auth/callback`;
    console.log("发送重置邮件，redirect URL:", redirectUrl);

    const { error } = await supabase.auth.resetPasswordForEmail(email.value, {
      redirectTo: redirectUrl,
    });

    loading.value = false;

    if (error) {
      errorMessage.value = `发送失败: ${error.message}`;
    } else {
      successMessage.value = "密码重置链接已发送到您的邮箱，请查收并点击链接重置密码！";
    }
  } catch (err) {
    loading.value = false;
    errorMessage.value = "发送失败，请稍后重试";
  }
}

// 处理登录
async function handleSignIn() {
  if (!email.value || !password.value) {
    errorMessage.value = "邮箱和密码不能为空";
    return;
  }
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  const { error } = await signIn({ email: email.value, password: password.value });

  loading.value = false;
  if (error) {
    errorMessage.value = `登录失败: ${error.message}`;
  } else {
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
  successMessage.value = "";

  const { error } = await signUp({ email: email.value, password: password.value });

  loading.value = false;
  if (error) {
    errorMessage.value = `注册失败: ${error.message}`;
  } else {
    successMessage.value = "注册成功！请检查您的邮箱以完成验证，然后尝试登录。";
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
  box-sizing: border-box;
}

.error-message {
  color: var(--color-red);
  margin-bottom: 15px;
  padding: 10px;
  background-color: #fee;
  border-radius: 4px;
}

.success-message {
  color: #28a745;
  margin-bottom: 15px;
  padding: 10px;
  background-color: #d4edda;
  border-radius: 4px;
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
  transition: opacity 0.2s;
}

.button-group button.secondary {
  background-color: #f0f0f0;
  color: #333;
}

.button-group button:hover:not(:disabled) {
  opacity: 0.9;
}

.button-group button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.forgot-password {
  margin-top: 15px;
  text-align: center;
}

.forgot-password a {
  color: #007bff;
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
}

.forgot-password a:hover {
  text-decoration: underline;
}
</style>
