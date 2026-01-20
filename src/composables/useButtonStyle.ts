// composables/useButtonStyle.ts
import { useTimerStore } from "@/stores/useTimerStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { ref, computed, watch } from "vue";
import {
  ArrowLeft24Filled,
  ArrowUp24Filled,
  ArrowDown24Filled,
  ArrowRight24Filled,
  Timer24Regular,
  Pin24Regular,
  BrainCircuit24Regular,
} from "@vicons/fluent";

type ViewKey = "ontop" | "pomodoro" | "schedule" | "planner" | "task" | "activity" | "ai";

export function useButtonStyle() {
  const timerStore = useTimerStore();
  const settingStore = useSettingStore();

  const buttonStates = ref<Record<ViewKey, boolean>>({
    ontop: false,
    pomodoro: false,
    schedule: false,
    planner: false,
    task: false,
    activity: false,
    ai: false,
  });

  const buttonStyle = (show: boolean, key: string) => {
    const isDisabled = key === "pomodoro" && timerStore.isActive;
    const isOntop = key === "ontop";

    return {
      filter: show ? (isDisabled ? "grayscale(50%)" : "none") : "grayscale(100%)",
      opacity: show ? (isDisabled ? 0.4 : 1) : 0.6,
      backgroundColor: show ? "var(--color-background)" : "var(--color-background-light)",
      borderRadius: "4px",
      transition: "all 0.3s ease",
      cursor: isOntop ? "pointer" : isDisabled ? "not-allowed" : "pointer",
      transform: isDisabled ? "scale(0.95)" : "scale(1)",
    };
  };

  const updateButtonStates = () => {
    buttonStates.value.pomodoro = settingStore.settings.showPomodoro;
    buttonStates.value.schedule = settingStore.settings.showSchedule;
    buttonStates.value.planner = settingStore.settings.showPlanner;
    buttonStates.value.task = settingStore.settings.showTask;
    buttonStates.value.activity = settingStore.settings.showActivity;
    buttonStates.value.ai = settingStore.settings.showAi;
  };

  // 视图控制配置
  const viewControls = computed(() => [
    { key: "ontop", icon: Pin24Regular, title: "番茄时钟置顶", show: true },
    { key: "pomodoro", icon: Timer24Regular, title: "切换番茄钟视图", show: settingStore.settings.showPomodoro },
    { key: "schedule", icon: ArrowLeft24Filled, title: "切换日程视图", show: settingStore.settings.showSchedule },
    { key: "planner", icon: ArrowUp24Filled, title: "切换计划视图", show: settingStore.settings.showPlanner },
    { key: "task", icon: ArrowDown24Filled, title: "切换执行视图", show: settingStore.settings.showTask },
    { key: "activity", icon: ArrowRight24Filled, title: "切换活动视图", show: settingStore.settings.showActivity },
    { key: "ai", icon: BrainCircuit24Regular, title: "切换AI助手", show: settingStore.settings.showAi },
  ]);

  // 切换设置面板显示状态
  function toggleSettingPanel(panel: "schedule" | "activity" | "task" | "today" | "pomodoro" | "ai") {
    const toKey = (p: string) => ("show" + p.charAt(0).toUpperCase() + p.slice(1)) as keyof typeof settingStore.settings;
    const key = toKey(panel);
    const next = !settingStore.settings[key];
    // @ts-ignore
    settingStore.settings[key] = next;

    // 互斥逻辑
    if (next) {
      if (panel === "activity") settingStore.settings.showAi = false;
      else if (panel === "ai") settingStore.settings.showActivity = false;
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
      settingStore.settings.showAi,
    ],
    () => updateButtonStates(),
    { immediate: true }
  );

  return {
    buttonStyle,
    buttonStates,
    updateButtonStates,
    viewControls,
    toggleSettingPanel,
  };
}
