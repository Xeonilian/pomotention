import { createRouter, createWebHistory } from "vue-router";

const MainLayout = () => import("@/views/MainLayout.vue");
const HomeView = () => import("@/views/HomeView.vue");
const StatisticsView = () => import("@/views/StatisticView.vue");
const SettingView = () => import("@/views/SettingView.vue");
const HelpView = () => import("@/views/HelpView.vue");
const SearchView = () => import("@/views/SearchView.vue");

const routes = [
  {
    path: "/",
    component: MainLayout,
    children: [
      { path: "", component: HomeView }, // 首页
      { path: "statistics", component: StatisticsView }, // 统计页
      { path: "settings", component: SettingView }, // 设置页
      { path: "help", component: HelpView }, // 帮助页
      { path: "search", component: SearchView }, // 搜索页
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
