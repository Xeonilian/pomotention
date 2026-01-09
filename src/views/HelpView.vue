<template>
  <!-- 统一的帮助页面：网页版和桌面版都直接显示帮助文档 -->
  <div class="help-view">
    <!-- 版本信息栏（仅桌面版显示） -->
    <div v-if="isTauriApp" class="help-header">
      <div class="version-info">
        <n-tag type="info" round>版本：v{{ appVersion }}</n-tag>
        <n-dropdown trigger="click" :options="downloadOptions" @select="handleDownload">
          <n-button type="primary" size="small" secondary>⬇️ 下载更新</n-button>
        </n-dropdown>
        <n-button @click="openGitHub" size="small" type="default" secondary>📂 查看源码</n-button>
      </div>
    </div>

    <!-- 开发模式：显示文档来源信息 -->
    <div v-if="showSourceInfo" class="dev-info">
      <n-alert type="info" :closable="false">文档来源：{{ docsSource }} ({{ docsUrl }})</n-alert>
    </div>

    <!-- 错误提示 -->
    <div v-if="iframeError" class="error-container">
      <n-alert type="error" title="无法加载帮助文档">
        <p>当前文档源不可用：{{ docsUrl }}</p>
        <p>请检查：</p>
        <ul>
          <li v-if="isDev">
            本地 VitePress 开发服务器是否运行（运行
            <code>pnpm docs:dev</code>
            ）
          </li>
          <li>网络连接是否正常</li>
          <li>文档是否已正确构建和部署</li>
        </ul>
        <n-button @click="reloadIframe" type="primary" style="margin-top: 12px">重试</n-button>
      </n-alert>
    </div>

    <!-- 帮助文档 iframe -->
    <iframe
      v-show="!iframeError"
      :src="docsUrl"
      class="docs-iframe"
      frameborder="0"
      allowfullscreen
      title="帮助文档"
      @error="handleIframeError"
      @load="handleIframeLoad"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { NTag, NButton, NDropdown, NAlert } from "naive-ui";
import type { DropdownOption } from "naive-ui";
import { useDocsUrl } from "@/composables/useDocsUrl";

const isTauriApp = isTauri();
const appVersion = ref("");
const iframeError = ref(false);

// 使用智能文档 URL 获取策略
const { docsUrl, docsSource } = useDocsUrl();

const githubUrl = "https://github.com/Xeonilian/pomotention";

// 打开外部链接的统一方法
const openExternalUrl = async (url: string) => {
  if (isTauriApp) {
    // Tauri 应用中使用 opener 插件
    await openUrl(url);
  } else {
    // Web 环境中使用 window.open
    window.open(url, "_blank");
  }
};

// 开发模式标志
const isDev = import.meta.env.DEV;

// 显示文档来源信息（仅在开发模式或调试时）
const showSourceInfo = isDev;

// 下载源配置（支持多个平台）
const downloadOptions: DropdownOption[] = [
  {
    label: "GitHub Releases",
    key: "github",
    icon: () => "📦",
  },
  {
    label: "码云 Gitee",
    key: "gitee",
    icon: () => "🇨🇳",
  },
  // 可以继续添加其他下载源
];

onMounted(async () => {
  // 只在桌面版获取版本号
  if (isTauriApp) {
    try {
      appVersion.value = await getVersion();
    } catch (error) {
      console.error("获取版本号失败:", error);
      // 从 package.json 读取（构建时注入）
      appVersion.value = import.meta.env.VITE_APP_VERSION || "未知";
    }
  }
});

// 打开 GitHub
const openGitHub = async () => {
  await openExternalUrl(githubUrl);
};

// 处理下载选择
const handleDownload = async (key: string | number) => {
  let url = "";
  switch (key) {
    case "github":
      url = `https://github.com/Xeonilian/pomotention/releases/latest`;
      break;
    case "gitee":
      // 码云 Releases 链接（需要实际创建后更新）
      url = `https://gitee.com/xeonilian/pomotention/releases`;
      break;
    default:
      url = `https://github.com/Xeonilian/pomotention/releases/latest`;
  }
  await openExternalUrl(url);
};

// iframe 加载错误处理
const handleIframeError = () => {
  console.error("帮助文档加载失败:", docsUrl.value);
  iframeError.value = true;
};

// iframe 加载成功
const handleIframeLoad = () => {
  iframeError.value = false;
};

// 重新加载 iframe
const reloadIframe = () => {
  iframeError.value = false;
  // 触发 iframe 重新加载（通过改变 key 强制重新渲染）
  const iframe = document.querySelector(".docs-iframe") as HTMLIFrameElement;
  if (iframe) {
    iframe.src = docsUrl.value;
  }
};
</script>

<style scoped>
/* 统一的帮助页面样式 */
.help-view {
  height: 100%;
  width: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  overflow: hidden;
}

/* 版本信息栏（仅桌面版） */
.help-header {
  flex-shrink: 0;
  padding: 12px 16px;
  background: var(--color-background-secondary);
  border-bottom: 1px solid var(--color-border);
}

.version-info {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: flex-end;
}

/* 开发信息提示 */
.dev-info {
  flex-shrink: 0;
  padding: 8px 16px;
  background: var(--color-background);
}

/* 错误容器 */
.error-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow-y: auto;
}

.error-container ul {
  margin: 8px 0;
  padding-left: 20px;
}

.error-container code {
  background: var(--color-background-secondary);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: monospace;
}

/* 帮助文档 iframe */
.docs-iframe {
  width: 100%;
  height: 100%;
  border: none;
  flex: 1;
  min-height: 0;
}
</style>
