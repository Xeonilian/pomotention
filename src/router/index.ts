// src/router/index.ts

import { defineComponent } from "vue";
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { isSupabaseEnabled } from "@/core/services/supabase";
import { navigateToBuiltDocs } from "@/composables/useDocsUrl";

// --- 视图组件 ---
const MainLayout = () => import("@/views/MainLayout.vue");
const HomeView = () => import("@/views/HomeView.vue");
const StatisticView = () => import("@/views/StatisticView.vue"); // 注意：这里更新为 StatisticView.vue
/** 仅占位；实际在 beforeEnter 中整页跳到 VitePress 静态站 */
const helpDocsRouteShell = defineComponent({ name: "HelpDocsRouteShell", setup: () => () => null });
const SearchView = () => import("@/views/SearchView.vue");
const ChartView = () => import("@/views/ChartView.vue");

const LoginView = () => import("@/views/LoginView.vue");
const AuthCallbackView = () => import("@/views/AuthCallbackView.vue");
const ResetPassword = () => import("@/views/ResetPasswordView.vue");
const SettingView = () => import("@/views/SettingView.vue");

// --- 路由定义 ---
const routes: Array<RouteRecordRaw> = [
  // 登录页面路由
  {
    path: "/login",
    name: "Login",
    component: LoginView,
  },
  // 邮箱验证回调
  {
    path: "/auth/callback",
    name: "AuthCallback",
    component: AuthCallbackView,
  },
  {
    path: "/reset-password",
    name: "ResetPassword",
    component: ResetPassword,
  },
  // 主应用布局路由
  {
    path: "/",
    component: MainLayout,
    meta: { requiresAuth: true }, // 在父路由上添加认证要求
    children: [
      { path: "", name: "Home", component: HomeView },
      { path: "statistics", name: "Statistics", component: StatisticView },
      { path: "settings", name: "Settings", component: SettingView },
      { path: "search", name: "Search", component: SearchView },
      { path: "chart", name: "Chart", component: ChartView },
      {
        path: "help",
        name: "Help",
        beforeEnter: () => {
          navigateToBuiltDocs();
          return false;
        },
        component: helpDocsRouteShell,
        meta: { requiresAuth: false },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// --- 全局前置导航守卫 ---
router.beforeEach(async (to, _from, next) => {
  // 动态导入 useSettingStore 以避免循环依赖
  const { useSettingStore } = await import("@/stores/useSettingStore");
  const settingStore = useSettingStore();
  const isDev = !!import.meta.env.VITE_APP_DEV || import.meta.env.DEV;

  // 检查是否是本地模式
  if (settingStore.settings.localOnlyMode) {
    // 本地模式下，允许直接访问主应用，不需要检查登录状态
    next();
    return;
  }

  if (!isSupabaseEnabled()) {
    // 离线模式下跳过鉴权，直接放行
    next();
    return;
  }

  // 会话由 App.vue onMounted 统一拉取并驱动同步；此处不再 await getSession，避免阻塞首屏路由与 MainLayout 懒加载 chunk

  // 登录页始终放行，便于用户主动切换账号或重新登录
  if (to.name === "Login") {
    console.log("🔐 路由守卫：访问登录页，直接放行");
    next();
    return;
  }

  // 仅 dev 可访问的路由（本地 pnpm dev 或 Preview 环境）
  if (to.meta.devOnly && !isDev) {
    next({ path: "/" });
    return;
  }

  // 其余路由保持原有放行策略（已登录、未登录、本地模式都允许）
  next();
});

export default router;
