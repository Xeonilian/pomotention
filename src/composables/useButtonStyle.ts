// composables/useButtonStyle.ts
import { useTimerStore } from "@/stores/useTimerStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { ref, computed, watch } from "vue";
import { isTauri } from "@tauri-apps/api/core";
import {
  // ArrowLeft24Filled,
  // ArrowUp24Filled,
  // ArrowDown24Filled,
  // ArrowRight24Filled,
  Timeline20Regular,
  BookLetter20Regular,
  CalligraphyPen20Regular,
  TasksApp20Regular,
  Timer24Regular,
  Pin24Regular,
  //BrainCircuit24Regular,
} from "@vicons/fluent";
import { useDevice } from "./useDevice";

type ViewKey = "ontop" | "pomodoro" | "schedule" | "task" | "planner" | "activity"; //| "ai"

export function useButtonStyle() {
  const timerStore = useTimerStore();
  const settingStore = useSettingStore();
  const { isMobile } = useDevice();

  const buttonStates = ref<Record<ViewKey, boolean>>({
    ontop: false,
    pomodoro: false,
    schedule: false,
    planner: false,
    task: false,
    activity: false,
    //ai: false,
  });

  const buttonStyle = (show: boolean, key: string) => {
    // const isDisabled = key === "pomodoro" && timerStore.isActive; 不再区别disabled
    const isDisabled = false;
    const isOntop = key === "ontop";

    return {
      opacity: show ? (isDisabled ? 0.3 : 1) : 0.4,
      backgroundColor: show ? "var(--color-background)" : "var(--color-background-light)",
      borderRadius: "4px",
      transition: "all 0.3s ease",
      cursor: isOntop ? "pointer" : isDisabled ? "not-allowed" : "pointer",
      filter: isDisabled ? "grayscale(50%)" : "none",
      transform: isDisabled ? "scale(0.95)" : "scale(1)",
      color: isDisabled ? "var(--color-red) !important" : "var(--color-text-primary)",
    };
  };

  const updateButtonStates = () => {
    buttonStates.value.pomodoro = settingStore.settings.showPomodoro;
    buttonStates.value.schedule = settingStore.settings.showSchedule;
    buttonStates.value.planner = settingStore.settings.showPlanner;
    buttonStates.value.task = settingStore.settings.showTask;
    buttonStates.value.activity = settingStore.settings.showActivity;
    //buttonStates.value.ai = settingStore.settings.showAi;
  };

  // 视图控制配置
  const viewControls = computed(() => [
    { key: "ontop", icon: Pin24Regular, title: "番茄时钟置顶", show: isTauri() },
    { key: "pomodoro", icon: Timer24Regular, title: "切换番茄钟视图", show: settingStore.settings.showPomodoro },
    { key: "schedule", icon: Timeline20Regular, title: "切换日程视图", show: settingStore.settings.showSchedule },
    { key: "planner", icon: TasksApp20Regular, title: "切换计划视图", show: settingStore.settings.showPlanner },
    { key: "task", icon: CalligraphyPen20Regular, title: "切换执行视图", show: settingStore.settings.showTask },
    { key: "activity", icon: BookLetter20Regular, title: "切换活动视图", show: settingStore.settings.showActivity },
    //{ key: "ai", icon: BrainCircuit24Regular, title: "切换AI助手", show: settingStore.settings.showAi },
  ]);

  // 切换设置面板显示状态
  function toggleSettingPanel(panel: "schedule" | "activity" | "task" | "today" | "pomodoro" | "planner") {
    //| "ai"
    const toKey = (p: string) => ("show" + p.charAt(0).toUpperCase() + p.slice(1)) as keyof typeof settingStore.settings;
    const key = toKey(panel);

    if (!isMobile.value) {
      const next = !settingStore.settings[key];
      // @ts-ignore
      settingStore.settings[key] = next;
      // 互斥逻辑 ai activity 暂不需要
      // if (next) {
      //   if (panel === "activity") settingStore.settings.showAi = false;
      //   else if (panel === "ai") settingStore.settings.showActivity = false;
      // }
    } else {
      // 移动端交互规则：
      // - 点击 activity：只显示 activity；再次点击恢复进入前的显示状态
      // - 点击 schedule：仅在不显示 activity 时才允许切换 schedule
      const next = !settingStore.settings[key];
      // @ts-ignore
      settingStore.settings[key] = next;
      // 其它面板：保持普通开关行为
      if (next) {
        // 打开面板时的逻辑
        if (panel === "activity") {
          // Activity 打开时，其他全部关闭
          settingStore.settings.showSchedule = false;
          settingStore.settings.showPlanner = false;
          settingStore.settings.showTask = false;
        } else if (panel === "schedule") {
          settingStore.settings.showPlanner = true;
          settingStore.settings.showActivity = false;
        } else if (panel === "planner") {
          settingStore.settings.showSchedule = false;
          settingStore.settings.showTask = true;
          settingStore.settings.showActivity = false;
        } else if (panel === "task") {
          settingStore.settings.showSchedule = false;
          settingStore.settings.showActivity = false;
        } else {
          // 其他面板打开时，只关闭 activity
          // settingStore.settings.showActivity = false;
        }
      } else {
        // 关闭面板时的逻辑
        const { showActivity, showPlanner, showTask, showSchedule } = settingStore.settings;

        // 检查是否所有面板都关闭了
        const allClosed = !showActivity && !showPlanner && !showTask && !showSchedule;

        if (allClosed) {
          // 如果全关了，默认打开 planner
          settingStore.settings.showPlanner = true;
        } else if (panel === "planner" && !showTask) {
          // 关了 planner 且 task 也没开，打开 task
          settingStore.settings.showTask = true;
        } else if (panel === "task" && !showPlanner) {
          // 关了 task 且 planner 也没开，打开 planner
          settingStore.settings.showPlanner = true;
        }
      }
    }
  }

  // 监听配置变化更新按钮样式
  watch(
    () => [
      settingStore.settings.showSchedule,
      settingStore.settings.showPlanner,
      settingStore.settings.showTask,
      settingStore.settings.showActivity,
      settingStore.settings.showPomodoro,
      //settingStore.settings.showAi,
    ],
    () => updateButtonStates(),
    { immediate: true },
  );

  return {
    buttonStyle,
    buttonStates,
    updateButtonStates,
    viewControls,
    toggleSettingPanel,
  };
}
