// src/stores/useUIStore.ts
import { defineStore } from "pinia";
import { ref } from "vue";

// 定义一个类型别名，用于表示视图面板的键
type PanelKey = "schedule" | "activity" | "task" | "today" | "pomodoro";

export const useUIStore = defineStore("uiStore", () => {
  // 定义各种面板的显示状态，初始值可以根据你的需求设定
  const showSchedulePanel = ref(true); // 对应 HomeView 的左侧面板
  const showActivityPanel = ref(true); // 对应 HomeView 的右侧面板
  const showTaskPanel = ref(true); // 对应 HomeView 的任务面板 (假设在中间底部)
  const showTodayPanel = ref(true); // 对应 HomeView 的今日视图 (假设在中间顶部)
  const showPomodoroPanel = ref(true); // 对应 PomodoroView 的今日视图 (假设在中间顶部)

  /**
   * 切换指定面板的显示状态。
   * @param panelKey 要切换的面板的键。
   */
  function togglePanel(panelKey: PanelKey) {
    switch (panelKey) {
      case "schedule":
        showSchedulePanel.value = !showSchedulePanel.value;
        break;
      case "activity":
        showActivityPanel.value = !showActivityPanel.value;
        break;
      case "task":
        showTaskPanel.value = !showTaskPanel.value;
        break;
      case "today":
        showTodayPanel.value = !showTodayPanel.value;
        break;
      case "pomodoro":
        showPomodoroPanel.value = !showPomodoroPanel.value;
        break;

      default:
        // 如果传入了未知的键，发出警告
        console.warn(
          `Unknown panel key received by useUIStore.togglePanel: ${panelKey}`
        );
    }
  }

  return {
    // 暴露状态
    showSchedulePanel,
    showActivityPanel,
    showTaskPanel,
    showTodayPanel,
    showPomodoroPanel,
    // 暴露方法
    togglePanel,
  };
});
