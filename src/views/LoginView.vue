<!-- src/views/LoginView.vue -->
<template>
  <div class="app-layout">
    <div class="login-view">
      <h1>欢迎回来</h1>
      <p class="subtitle">登录或注册以同步您的数据</p>

      <n-alert v-if="supabaseUnavailable" type="warning" style="margin-bottom: 15px">
        当前为离线模式，云同步与登录相关功能暂不可用；您仍可离线使用本地功能。
      </n-alert>

      <div class="form-container">
        <n-input v-model:value="email" type="text" placeholder="邮箱地址" size="large" />

        <n-input
          v-if="!isResetMode"
          v-model:value="password"
          type="password"
          placeholder="密码 (至少6位)"
          size="large"
          show-password-on="click"
          @keyup.enter="handleSignIn"
        />

        <n-alert v-if="errorMessage" type="error" :title="errorMessage" style="margin-bottom: 15px" />
        <n-alert v-if="successMessage" type="success" :title="successMessage" style="margin-bottom: 15px" />

        <!-- 注册时显示用户协议 -->
        <div v-if="!isResetMode" class="terms-checkbox">
          <n-checkbox v-model:checked="agreedToTerms">
            我已阅读并同意
            <n-button text type="primary" @click="showTerms = true" style="padding: 0 4px; color: var(--color-blue)">
              《用户服务协议与隐私政策》
            </n-button>
          </n-checkbox>
        </div>

        <!-- 正常登录/注册模式 -->
        <n-space v-if="!isResetMode" :size="10" justify="center" style="width: 100%">
          <!-- 登录按钮 -->
          <n-popconfirm
            v-if="hasDifferentUserData"
            placement="top"
            positive-text="确认登录（清除本地数据）"
            negative-text="取消"
            @positive-click="performSignIn"
          >
            <template #trigger>
              <n-button :loading="loading" strong secondary Default size="large" style="min-width: 140px">登录</n-button>
            </template>
            <div style="max-width: 280px">
              检测到本地有其他用户的数据，登录新用户将清除本地数据并从云端同步。
              <br />
              <br />
              建议：如果这是您的数据，请先登录原账户导出数据，然后再登录新账户。
            </div>
          </n-popconfirm>
          <n-button v-else @click="handleSignIn" :loading="loading" strong secondary Default size="large" style="min-width: 140px">
            登录
          </n-button>

          <!-- 注册按钮 -->
          <n-popconfirm
            v-if="hasDifferentUserData && agreedToTerms"
            placement="top"
            positive-text="确认注册（清除本地数据）"
            negative-text="取消"
            @positive-click="performSignUp"
          >
            <template #trigger>
              <n-button :loading="loading" strong secondary type="info" size="large" style="min-width: 140px">注册</n-button>
            </template>
            <div style="max-width: 280px">
              检测到本地有其他用户的数据，注册新用户将清除本地数据。
              <br />
              <br />
              建议：如果这是您的数据，请先登录原账户导出数据，然后再注册新账户。
            </div>
          </n-popconfirm>
          <n-tooltip v-else-if="!agreedToTerms" trigger="hover">
            <template #trigger>
              <n-button
                strong
                secondary
                type="info"
                @click="handleSignUp"
                :loading="loading"
                :disabled="!agreedToTerms"
                size="large"
                style="min-width: 140px"
              >
                注册
              </n-button>
            </template>
            请先阅读并同意用户协议
          </n-tooltip>
          <n-button v-else strong secondary type="info" @click="handleSignUp" :loading="loading" size="large" style="min-width: 140px">
            注册
          </n-button>
        </n-space>

        <!-- 找回密码模式 -->
        <n-space v-else vertical>
          <n-button strong secondary @click="handleResetPassword" :loading="loading" type="info" size="large" block>发送重置链接</n-button>
          <n-button strong secondary @click="cancelReset" :loading="loading" size="large" block>取消</n-button>
        </n-space>

        <!-- 忘记密码链接 -->
        <div class="forgot-password">
          <n-button text type="primary" @click="toggleResetMode">
            {{ isResetMode ? "返回登录" : "忘记密码？" }}
          </n-button>
        </div>
      </div>

      <!-- 用户协议弹窗 -->
      <n-modal v-model:show="showTerms" preset="card" title="用户服务协议与隐私政策" style="width: 600px; max-width: 90vw">
        <n-scrollbar style="max-height: 60vh">
          <div class="terms-body" v-html="termsHtml"></div>
        </n-scrollbar>
        <template #footer>
          <n-button strong secondary type="info" @click="acceptTerms" block>我同意</n-button>
        </template>
      </n-modal>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router";
import { NInput, NButton, NAlert, NCheckbox, NSpace, NModal, NScrollbar, NTooltip, NPopconfirm } from "naive-ui";
import { signIn, signUp } from "@/core/services/authService";
import { supabase } from "@/core/services/supabase";
import { marked } from "marked";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDataStore } from "@/stores/useDataStore";

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMessage = ref("");
const successMessage = ref("");
const isResetMode = ref(false);
const agreedToTerms = ref(false);
const showTerms = ref(false);
const router = useRouter();
const supabaseClient = supabase;
const supabaseUnavailable = !supabaseClient;
const settingStore = useSettingStore();
const dataStore = useDataStore();

// 检测是否有其他用户的数据
const hasDifferentUserData = computed(() => {
  // 检查是否有本地数据
  const hasLocalData =
    dataStore.activityList.length > 0 ||
    dataStore.todoList.length > 0 ||
    dataStore.scheduleList.length > 0 ||
    dataStore.taskList.length > 0;

  // 如果有本地数据，且记录了上次登录的用户ID，说明可能是其他用户的数据
  // 需要先登录原账户导出数据，然后再登录新账户
  return hasLocalData && settingStore.settings.lastLoggedInUserId !== undefined;
});

// 用户协议内容（Markdown格式）
const termsMarkdown = `
## 欢迎使用本应用

为了让您享受云端同步服务，我们需要收集和处理您的以下信息：

### 我们收集的信息

1. **账户信息**：您用于注册和登录的电子邮箱
2. **日程数据**：您创建的所有日程内容，将存储于云端服务器

### 我们的承诺

- ✅ **数据安全**：采用 HTTPS 加密传输，确保数据在传输过程中的安全
- ✅ **隐私保护**：使用行级安全策略，确保其他用户无法访问您的数据
- ✅ **用途单一**：您的数据仅用于提供多设备同步功能，不做任何其他用途
- ✅ **数据主权**：您的数据完全属于您，开发者不会主动查看。您可以随时导出或删除所有数据

### 数据存储

- **本地存储**：您的数据始终在本地设备保留一份完整副本
- **云端存储**：使用 Supabase 提供的数据库服务（数据中心位于海外）
- **双轨运行**：即使不登录或网络断开，本地功能完全可用

### 您的权利

- 随时停止使用云同步服务
- 要求删除您的账户及所有数据
- 导出您的所有数据

### 联系方式

如有任何疑问，请通过github issues联系我。

---

**点击"注册"或"我同意"即表示您已阅读并同意以上条款。**

*最后更新：2025年11月*
`;

// 将Markdown转换为HTML
const termsHtml = computed(() => {
  return marked(termsMarkdown);
});

// 处理邮箱验证回调
onMounted(async () => {
  if (!supabaseClient) {
    return;
  }

  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  const accessToken = hashParams.get("access_token");
  const type = hashParams.get("type");

  if (accessToken && type === "recovery") {
    console.log("检测到密码重置请求，跳转到重置密码页面...");
    window.history.replaceState({}, document.title, window.location.pathname);
    router.push({ name: "ResetPassword" });
    return;
  }

  if (accessToken) {
    console.log("检测到邮箱验证，正在处理...");
    const { data } = await supabaseClient.auth.getSession();

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

// 接受协议
function acceptTerms() {
  agreedToTerms.value = true;
  showTerms.value = false;
}

// 找回密码
async function handleResetPassword() {
  if (!supabaseClient) {
    errorMessage.value = "当前为离线模式，无法发送重置邮件";
    return;
  }

  if (!email.value) {
    errorMessage.value = "请输入您的邮箱地址";
    return;
  }

  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  try {
    const redirectUrl = import.meta.env.VITE_AUTH_REDIRECT_URL ? `${import.meta.env.VITE_AUTH_REDIRECT_URL}/auth/callback` : undefined;
    console.log("发送重置邮件，redirect URL:", redirectUrl);

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email.value, {
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
  if (!supabaseClient) {
    errorMessage.value = "当前为离线模式，暂时无法登录";
    return;
  }

  if (!email.value || !password.value) {
    errorMessage.value = "邮箱和密码不能为空";
    return;
  }

  // 如果没有用户切换，直接登录
  await performSignIn();
}

async function performSignIn() {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  const { error } = await signIn({ email: email.value, password: password.value });

  loading.value = false;
  if (error) {
    errorMessage.value = `登录失败: ${error.message}`;
  } else {
    // 用户切换检测和数据清除由 App.vue 的 SIGNED_IN 事件处理
    router.push({ name: "Home" });
  }
}

// 处理注册
async function handleSignUp() {
  if (!supabaseClient) {
    errorMessage.value = "当前为离线模式，暂时无法注册";
    return;
  }

  if (!email.value || !password.value) {
    errorMessage.value = "邮箱和密码不能为空";
    return;
  }

  if (!agreedToTerms.value) {
    errorMessage.value = "请先阅读并同意用户服务协议";
    return;
  }

  // 如果没有用户切换，直接注册
  await performSignUp();
}

async function performSignUp() {
  loading.value = true;
  errorMessage.value = "";
  successMessage.value = "";

  // 如果检测到用户切换，先清除本地数据
  if (hasDifferentUserData.value) {
    console.log("检测到用户切换，清除本地数据");
    localStorage.clear();
    dataStore.clearData();
    // 清除用户ID记录
    settingStore.settings.lastLoggedInUserId = undefined;
  }

  const { error } = await signUp({ email: email.value, password: password.value });

  loading.value = false;
  if (error) {
    errorMessage.value = `注册失败: ${error.message}`;
  } else {
    successMessage.value = "注册成功！请检查您的邮箱以完成验证，然后尝试登录。";
    // 注册成功后，如果用户验证并登录，会在登录时更新用户ID
  }
}
</script>

<style scoped>
.app-layout {
  overflow: hidden;
  height: 100vh;
  background-color: var(--color-background-light);
}

.login-view {
  overflow: hidden;
  max-width: 400px;
  margin: 20px auto;
  padding: 40px;
  text-align: center;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: var(--color-background);
}

.subtitle {
  color: #666;
  margin-bottom: 15px;
}

.form-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

/* 用户协议checkbox */
.terms-checkbox {
  text-align: left;
  font-size: 10px;
  margin: 0;
}

.forgot-password {
  margin-top: 0px;
  text-align: center;
}

/* 协议内容样式 */
.terms-body {
  padding: 0 12px;
  line-height: 1.8;
  color: #333;
  text-align: left;
}

.terms-body :deep(h2) {
  font-size: 18px;
  margin-top: 20px;
  margin-bottom: 12px;
  color: #333;
}

.terms-body :deep(h3) {
  font-size: 15px;
  margin-top: 16px;
  margin-bottom: 10px;
  color: #555;
}

.terms-body :deep(ul) {
  padding-left: 24px;
  margin: 12px 0;
}

.terms-body :deep(li) {
  margin: 8px 0;
}

.terms-body :deep(strong) {
  color: #333;
  font-weight: 600;
}

.terms-body :deep(hr) {
  margin: 24px 0;
  border: none;
  border-top: 1px solid #eee;
}

.terms-body :deep(p) {
  margin: 10px 0;
}
</style>
