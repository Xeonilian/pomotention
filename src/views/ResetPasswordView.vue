<!-- src/views/ResetPasswordView.vue -->
<template>
  <div class="reset-password-view">
    <div v-if="!isAuthenticated" class="loading-container">
      <p>正在验证身份...</p>
    </div>

    <div v-else>
      <h1>重置密码</h1>
      <p class="subtitle">请输入您的新密码</p>

      <div class="form-container">
        <input type="password" v-model="newPassword" placeholder="新密码 (至少6位)" />
        <input type="password" v-model="confirmPassword" placeholder="确认新密码" @keyup.enter="handleUpdatePassword" />

        <div v-if="errorMessage" class="error-message">
          {{ errorMessage }}
        </div>

        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>

        <button @click="handleUpdatePassword" :disabled="loading">
          {{ loading ? "更新中..." : "更新密码" }}
        </button>

        <div class="back-link">
          <a @click="goBack" href="javascript:void(0)">返回登录</a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "@/core/services/supabase";

const newPassword = ref("");
const confirmPassword = ref("");
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const isAuthenticated = ref(false);
const router = useRouter();

onMounted(async () => {
  // 检查用户是否已经通过密码重置邮件登录
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    isAuthenticated.value = true;
  } else {
    errorMessage.value = "请先点击邮件中的重置链接";
    setTimeout(() => {
      router.push({ name: "Login" });
    }, 2000);
  }
});

function goBack() {
  router.push({ name: "Login" });
}

async function handleUpdatePassword() {
  if (!newPassword.value || !confirmPassword.value) {
    errorMessage.value = "请输入新密码";
    return;
  }

  if (newPassword.value.length < 6) {
    errorMessage.value = "密码至少需要6位";
    return;
  }

  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = "两次输入的密码不一致";
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword.value,
    });

    loading.value = false;

    if (error) {
      errorMessage.value = `更新失败: ${error.message}`;
    } else {
      successMessage.value = "密码更新成功！正在跳转到首页...";
      setTimeout(() => {
        router.push({ name: "Home" });
      }, 2000);
    }
  } catch (err) {
    loading.value = false;
    errorMessage.value = "更新失败，请稍后重试";
  }
}
</script>

<style scoped>
.reset-password-view {
  max-width: 400px;
  margin: 100px auto;
  padding: 40px;
  text-align: center;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: var(--color-background-light-light);
}

.loading-container {
  padding: 40px 0;
  color: #666;
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

button {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background-color: #333;
  color: white;
  transition: opacity 0.2s;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.back-link {
  margin-top: 15px;
  text-align: center;
}

.back-link a {
  color: #007bff;
  text-decoration: none;
  font-size: 14px;
  cursor: pointer;
}

.back-link a:hover {
  text-decoration: underline;
}
</style>
