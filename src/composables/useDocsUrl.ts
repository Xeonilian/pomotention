// src/composables/useDocsUrl.ts
// 智能帮助文档 URL 获取策略

import { ref, computed } from "vue";
import { isTauri } from "@tauri-apps/api/core";

/**
 * 帮助文档 URL 获取策略
 *
 * 优先级顺序：
 * 1. 开发模式：本地 VitePress 开发服务器 (http://localhost:5173)
 * 2. 生产模式（Tauri）：本地打包的文档 (./docs/index.html)
 * 3. 生产模式（Web）：在线版本（优先 Cloudflare Pages，fallback 到 GitHub Pages）
 *
 * 三路部署方案：
 * - GitHub Pages: https://xeonilian.github.io/pomotention/
 * - Cloudflare Pages: https://pomotention.pages.dev/help/
 * - 本地 APP: ./docs/index.html (相对路径，离线可用)
 */
export function useDocsUrl() {
  const isTauriApp = isTauri();
  const isDev = import.meta.env.DEV;
  const isProd = import.meta.env.PROD;

  // 本地 VitePress 开发服务器地址
  const localDevUrl = "http://localhost:5173";

  // 本地打包文档路径（需要在构建时复制文档到 public/docs）
  const localDocsUrl = "./docs/index.html";

  // GitHub Pages 在线文档地址（fallback）
  const githubPagesUrl = "https://xeonilian.github.io/pomotention/";

  // Cloudflare Pages 在线文档地址（base: /help，优先使用）
  const cloudflarePagesUrl = "https://pomotention.pages.dev/help/";

  // 检测本地开发服务器是否可用
  const isLocalDevServerAvailable = ref(false);

  // 在开发模式下检测本地服务器
  if (isDev) {
    checkLocalDevServer();
  }

  async function checkLocalDevServer() {
    try {
      const response = await fetch(localDevUrl, { method: "HEAD", mode: "no-cors" });
      console.log("Local dev server available:", response);
      isLocalDevServerAvailable.value = true;
    } catch (error) {
      // 检测失败，可能是服务器未运行或 CORS 限制
      // 即使检测失败，也尝试使用本地开发服务器（让浏览器报错更直观）
      isLocalDevServerAvailable.value = true; // 默认尝试本地服务器
    }
  }

  // 计算最终的文档 URL
  const docsUrl = computed(() => {
    // 开发模式：优先使用本地 VitePress 开发服务器
    if (isDev && isLocalDevServerAvailable.value) {
      return localDevUrl;
    }

    // 生产模式（Tauri）：优先使用本地打包的文档
    if (isProd && isTauriApp) {
      return localDocsUrl;
    }

    // 生产模式（Web）：优先使用 Cloudflare Pages，fallback 到 GitHub Pages
    if (isProd && !isTauriApp) {
      return cloudflarePagesUrl;
    }

    // 开发模式但本地服务器不可用：fallback 到在线版本（优先 Cloudflare）
    return cloudflarePagesUrl;
  });

  // 文档来源描述（用于调试）
  const docsSource = computed(() => {
    if (isDev && isLocalDevServerAvailable.value) {
      return "本地开发服务器";
    }
    if (isProd && isTauriApp) {
      return "本地打包文档";
    }
    if (isProd && !isTauriApp) {
      return "Cloudflare Pages";
    }
    return "在线文档";
  });

  return {
    docsUrl,
    docsSource,
    isLocalDevServerAvailable,
    checkLocalDevServer,
  };
}
