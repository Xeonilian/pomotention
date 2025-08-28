// composables/useButtonStyle.ts
import { useTimerStore } from "@/stores/useTimerStore";
import { useUIStore } from "@/stores/useUIStore";
import { ref } from "vue";

type ViewKey =
  | "ontop"
  | "pomodoro"
  | "schedule"
  | "today"
  | "task"
  | "activity";

export function useButtonStyle() {
  const timerStore = useTimerStore();
  const uiStore = useUIStore();

  const buttonStates = ref<Record<ViewKey, boolean>>({
    ontop: false,
    pomodoro: false,
    schedule: false,
    today: false,
    task: false,
    activity: false,
  });

  const buttonStyle = (show: boolean, key: string) => {
    const isDisabled = key === "pomodoro" && timerStore.isActive;
    const isOntop = key === "ontop";

    return {
      filter: show
        ? isDisabled
          ? "grayscale(50%)"
          : "none"
        : "grayscale(100%)",
      opacity: show ? (isDisabled ? 0.4 : 1) : 0.6,
      backgroundColor: show
        ? "var(--color-background)"
        : "var(--color-background-light)",
      borderRadius: "4px",
      transition: "all 0.3s ease",
      cursor: isOntop ? "pointer" : isDisabled ? "not-allowed" : "pointer",
      transform: isDisabled ? "scale(0.95)" : "scale(1)",
    };
  };

  const updateButtonStates = () => {
    buttonStates.value.pomodoro = uiStore.showPomodoroPanel;
    buttonStates.value.schedule = uiStore.showSchedulePanel;
    buttonStates.value.today = uiStore.showPlannerPanel;
    buttonStates.value.task = uiStore.showTaskPanel;
    buttonStates.value.activity = uiStore.showActivityPanel;
  };

  return {
    buttonStyle,
    buttonStates,
    updateButtonStates,
  };
}
