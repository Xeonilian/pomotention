// src/router/index.ts

import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import { getSession } from "@/core/services/authService"; // 导入获取会话的方法
import { isSupabaseEnabled } from "@/core/services/supabase";

// --- 视图组件 ---
const MainLayout = () => import("@/views/MainLayout.vue");
const HomeView = () => import("@/views/HomeView.vue");
const StatisticView = () => import("@/views/StatisticView.vue"); // 注意：这里更新为 StatisticView.vue
const HelpView = () => import("@/views/HelpView.vue");
const SearchView = () => import("@/views/SearchView.vue");
const ChartView = () => import("@/views/ChartView.vue");

const LoginView = () => import("@/views/LoginView.vue");
const AuthCallbackView = () => import("@/views/AuthCallbackView.vue");
const ResetPassword = () => import("@/views/ResetPasswordView.vue");
// const SettingView = () => import("@/views/SettingView.vue");

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
      // { path: "settings", name: "Settings", component: SettingView },
      { path: "help", name: "Help", component: HelpView },
      { path: "search", name: "Search", component: SearchView },
      { path: "chart", name: "Chart", component: ChartView },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// --- 全局前置导航守卫 ---
router.beforeEach(async (to, _from, next) => {
  if (!isSupabaseEnabled()) {
    // 离线模式下跳过鉴权，直接放行
    next();
    return;
  }

  // getSession() 返回 Session | null
  const session = await getSession();

  // 检查目标路由是否需要认证
  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);

  if (requiresAuth && !session) {
    // 需要认证但用户未登录，重定向到登录页
    next({ name: "Login" });
  } else if (to.name === "Login" && session) {
    // 用户已登录但试图访问登录页，重定向到首页
    next({ name: "Home" });
  } else {
    // 正常放行
    next();
  }
});

export default router;
