import { createRouter, createWebHistory } from "vue-router";
import TimerLayout from "./TimerLayout.vue";
import TimerSettingView from "./TimerSettingView.vue";
import TimerHelpView from "./TimerHelpView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      component: TimerLayout,
    },
    {
      path: "/settings",
      name: "TimerSettings",
      component: TimerSettingView,
    },
    {
      path: "/help",
      name: "TimerHelp",
      component: TimerHelpView,
    },
  ],
});

export default router;
