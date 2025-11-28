import { ref, Ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { isTauri } from "@tauri-apps/api/core";

interface UseAlwaysOnTopReturn {
  isAlwaysOnTop: Ref<boolean>;
  isMiniMode: Ref<boolean>;
  toggleAlwaysOnTop: () => Promise<void>;
  toggleMiniMode: () => Promise<void>;
}

export function useAlwaysOnTop(): UseAlwaysOnTopReturn {
  const isAlwaysOnTop = ref<boolean>(false);
  const isMiniMode = ref<boolean>(false); // 迷你模式状态

  const toggleAlwaysOnTop = async (): Promise<void> => {
    if (isTauri()) {
      const currentWin = getCurrentWindow();
      isAlwaysOnTop.value = !isAlwaysOnTop.value; // 切换状态
      await currentWin.setAlwaysOnTop(isAlwaysOnTop.value);
      console.log(`窗口置顶状态: ${isAlwaysOnTop.value}`);
    } else {
      console.warn("在网页中无法使用置顶功能。");
      // 如果在网页中，你可以选择直接进入迷你模式
      await toggleMiniMode();
    }
  };

  const toggleMiniMode = async (): Promise<void> => {
    isMiniMode.value = !isMiniMode.value;

    if (isTauri()) {
      const currentWin = getCurrentWindow();
      await currentWin.setDecorations(!isMiniMode.value); // 切换窗口装饰
    } else {
      document.body.classList.toggle("mini-mode", isMiniMode.value);
    }
  };

  return {
    isAlwaysOnTop,
    isMiniMode,
    toggleAlwaysOnTop,
    toggleMiniMode,
  };
}
