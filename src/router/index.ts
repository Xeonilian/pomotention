import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import StatisticsView from "../views/StatisticView.vue";
import SettingView from "../views/SettingView.vue";
import MainLayout from "../views/MainLayout.vue";
import HelpView from "@/views/HelpView.vue";
import SearchView from "@/views/SearchView.vue";

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
