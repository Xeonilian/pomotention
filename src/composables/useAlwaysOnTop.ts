import { ref, Ref } from "vue";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface UseAlwaysOnTopReturn {
  isAlwaysOnTop: Ref<boolean>;
  isLoading: Ref<boolean>;
  error: Ref<string | null>;
  toggleAlwaysOnTop: () => Promise<void>;
  setAlwaysOnTop: (state: boolean) => Promise<void>;
}

export function useAlwaysOnTop(): UseAlwaysOnTopReturn {
  const isAlwaysOnTop = ref<boolean>(false);
  const isLoading = ref<boolean>(false);
  const error = ref<string | null>(null);

  const setAlwaysOnTop = async (state: boolean): Promise<void> => {
    if (isLoading.value) return;

    try {
      isLoading.value = true;
      error.value = null;

      // Tauri v2 官方窗口 API
      const currentWin = getCurrentWindow();
      await currentWin.setAlwaysOnTop(state);

      isAlwaysOnTop.value = state;
      console.log(`窗口置顶状态: ${state}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "设置窗口置顶失败";
      error.value = errorMessage;
      console.error("设置窗口置顶失败:", err);
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const toggleAlwaysOnTop = async (): Promise<void> => {
    await setAlwaysOnTop(!isAlwaysOnTop.value);
  };

  return {
    isAlwaysOnTop,
    isLoading,
    error,
    toggleAlwaysOnTop,
    setAlwaysOnTop,
  };
}
