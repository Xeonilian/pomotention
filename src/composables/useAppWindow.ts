// src/composables/useAppWindow.ts
import { ref, nextTick, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow, PhysicalPosition, LogicalSize } from "@tauri-apps/api/window";
import { useSettingStore } from "@/stores/useSettingStore";
import { useTimerStore } from "@/stores/useTimerStore";
import { useAlwaysOnTop } from "@/composables/useAlwaysOnTop";

export function useAppWindow() {
  const settingStore = useSettingStore();
  const timerStore = useTimerStore();
  const router = useRouter();
  const route = useRoute();
  const { isAlwaysOnTop, toggleAlwaysOnTop } = useAlwaysOnTop();

  const isMiniMode = ref(false);
  const showPomoSeq = ref(false);

  // 容器 Ref，用于计算缩放比例
  const PomotentionTimerContainerRef = ref<HTMLElement | null>(null);

  // 记录番茄钟组件上报的大小
  const reportedPomodoroWidth = ref<number>(221);
  const reportedPomodoroHeight = ref<number>(140);

  // 核心逻辑：切换 Mini 模式
  async function handleToggleOntopMode(width: number, height: number, onExitCallback?: () => void) {
    if (!isTauri()) {
      isMiniMode.value = true;
      return;
    }

    const appWindow = getCurrentWindow();
    await toggleAlwaysOnTop();
    await nextTick();

    if (isAlwaysOnTop.value) {
      // === 进入 Mini 模式 ===
      console.log("[mini] Entering mini mode...");

      // 🔴 安全气囊2：强制设置默认值，防止 width/height 为 0 或 undefined
      const safeWidth = width && width > 100 ? width : 221;
      const safeHeight = height && height > 50 ? height : 140;

      // 🔴 安全气囊3：确保 factor 是有效数字
      let factor = settingStore.settings.miniModeRefactor;
      if (!factor || factor <= 0 || isNaN(factor)) {
        factor = 1; // 默认回退到 1
        settingStore.settings.miniModeRefactor = 1;
      }

      // 计算最终大小
      const finalWidth = Math.round(safeWidth * factor);
      const finalHeight = Math.round(safeHeight * factor);

      console.log(`[mini] Target Size: ${finalWidth}x${finalHeight} (Base: ${safeWidth}x${safeHeight}, Factor: ${factor})`);

      try {
        isMiniMode.value = true;
        await appWindow.setDecorations(false);

        // 🔴 安全气囊4：设置一个绝对最小尺寸 (例如 150x100)，防止缩成点
        await appWindow.setSize(new LogicalSize(Math.max(finalWidth, 150), Math.max(finalHeight, 100)));

        // 等待 Vue 渲染完成
        await new Promise((resolve) => setTimeout(resolve, 100)); // 稍微增加延时

        // 🔴 危险区域：重新计算 Factor 的逻辑
        // 这里极易在慢速机器上读到 0，必须加判断
        if (PomotentionTimerContainerRef.value) {
          const containerW = PomotentionTimerContainerRef.value.clientWidth;

          // 只有当读取到的 DOM 宽度有效且足够大时，才进行校准
          if (containerW > 50) {
            let factorReal = finalWidth / containerW;
            // 限制校准范围，防止算出离谱的数值 (例如 0.0001 或 100)
            if (factorReal > 0.5 && factorReal < 3 && factorReal !== 1) {
              factorReal = Math.ceil(factorReal * 100) / 100;
              // settingStore.settings.miniModeRefactor = factorReal; // 建议：先注释掉自动更新 factor，这往往是罪魁祸首
              console.log(`[mini] Calculated real factor: ${factorReal} (Container: ${containerW})`);
            }
          } else {
            console.warn("[mini] Container width is too small or 0, skipping factor recalibration.");
          }
        }

        await appWindow.setPosition(new PhysicalPosition(400, 400));
      } catch (error) {
        console.error("[mini] Error entering mini mode:", error);
        // 如果出错，尝试紧急恢复
        isMiniMode.value = false;
        await appWindow.setDecorations(true);
      }
    } else {
      // === 退出 Mini 模式 ===
      // ... 保持原有逻辑，建议也加上 Math.max 保护 ...
      console.log("[mini] Exiting mini mode...");
      isMiniMode.value = false;

      try {
        await appWindow.setDecorations(true);
        // 这里的 factor 也要保护
        let factor = settingStore.settings.miniModeRefactor || 1;
        await appWindow.setSize(new LogicalSize(Math.max(950 * factor, 800), Math.max(600 * factor, 500)));
        await appWindow.center();

        if (route.path !== "/") await router.push("/");
        if (onExitCallback) onExitCallback();
      } catch (error) {
        console.error("[mini] Error exiting mini mode:", error);
      }
    }
  }

  // 监听器：当番茄钟状态变化或显示序列变化时，自动调整窗口大小
  async function updateWindowSize() {
    if (!isMiniMode.value || !isTauri()) return;

    const appWindow = getCurrentWindow();
    await nextTick();

    const finalWidth = reportedPomodoroWidth.value * settingStore.settings.miniModeRefactor;
    const finalHeight = reportedPomodoroHeight.value * settingStore.settings.miniModeRefactor;

    try {
      await appWindow.setSize(new LogicalSize(finalWidth, finalHeight));
    } catch (e) {
      console.error("[mini] Resize error:", e);
    }
  }

  watch(() => showPomoSeq.value, updateWindowSize);
  watch(() => timerStore.isActive, updateWindowSize);

  // 🔴 修正：使用 setTimeout 延迟执行回调，给 Vue 渲染 DOM 的时间
  function handleWebToggle(callback?: () => void) {
    isMiniMode.value = false;

    if (callback) {
      // nextTick 有时候在复杂组件切换中不够用，setTimeout(..., 50) 是最稳妥的
      setTimeout(() => {
        callback();
      }, 50);
    }
  }

  // 接收组件上报的尺寸
  // useAppWindow.ts

  // 修改接收尺寸的方法：增加过滤
  function handlePomotentionTimerSizeReport({ width, height }: { width: number; height: number }) {
    // 🔴 安全气囊1：如果上报的尺寸太小（可能是隐藏时的尺寸），直接忽略
    if (width < 50 || height < 50) {
      console.warn(`[mini] Ignore invalid size report: ${width}x${height}`);
      return;
    }
    reportedPomodoroWidth.value = width;
    reportedPomodoroHeight.value = height;
  }

  return {
    isMiniMode,
    showPomoSeq,
    PomotentionTimerContainerRef,
    reportedPomodoroWidth,
    reportedPomodoroHeight,
    handleToggleOntopMode,
    handleWebToggle,
    handlePomotentionTimerSizeReport,
  };
}
