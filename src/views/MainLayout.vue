<template>
  <div class="pomodoro-mini-view-wrapper" ref="PomotentionTimerContainerRef">
    <n-layout class="app-layout">
      <n-layout-header class="app-layout__header" :class="{ 'app-layout__header--hidden': isMiniMode }">
        <div class="app-layout__header-content">
          <n-menu :options="menuOptions" mode="horizontal" :value="current" @update:value="handleMenuSelect" />
          <div class="app-layout__view-controls">
            <n-button
              v-for="(control, index) in viewControls"
              :key="index"
              size="tiny"
              tertiary
              strong
              type="default"
              :style="buttonStyle(control.show, control.key)"
              :title="control.title"
              @click="handleMainLayoutViewToggle(control.key)"
              class="header-button"
            >
              <template #icon>
                <n-icon size="18" :component="control.icon" />
              </template>
            </n-button>
          </div>
        </div>
      </n-layout-header>
      <n-layout-content class="app-layout__content" :class="{ 'app-layout__content--full-height': isMiniMode }">
        <router-view v-if="!isMiniMode" />
        <div class="draggable-container" ref="draggableContainer" v-if="!isMiniMode && settingStore.settings.showPomodoro">
          <PomotentionTimer
            :showPomoSeq="showPomoSeq"
            :isMiniMode="isMiniMode"
            @toggle-pomo-seq="showPomoSeq = !showPomoSeq"
            @report-size="handlePomotentionTimerSizeReport"
          />
        </div>

        <PomotentionTimer
          v-if="isMiniMode"
          :class="{ 'mainLayout-mini': isMiniMode && !isTauri() }"
          :showPomoSeq="showPomoSeq"
          :isMiniMode="isMiniMode"
          @toggle-pomo-seq="showPomoSeq = !showPomoSeq"
          @report-size="handlePomotentionTimerSizeReport"
          @exit-mini-mode="handleToggleOntopMode(reportedPomodoroWidth, reportedPomodoroHeight)"
        />
      </n-layout-content>
    </n-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { NMenu, NButton, NIcon } from "naive-ui";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow, PhysicalPosition, LogicalSize } from "@tauri-apps/api/window";

import { useSettingStore } from "@/stores/useSettingStore";
import { useTimerStore } from "@/stores/useTimerStore";

import {
  ArrowLeft24Filled,
  ArrowUp24Filled,
  ArrowDown24Filled,
  ArrowRight24Filled,
  Timer24Regular,
  Pin24Regular,
  BrainCircuit24Regular,
} from "@vicons/fluent";

import { useAlwaysOnTop } from "@/composables/useAlwaysOnTop";
import { useDraggable } from "@/composables/useDraggable";
import { useButtonStyle } from "@/composables/useButtonStyle";

import PomotentionTimer from "@/components/PomotentionTimer/PomotentionTimer.vue";

// ======================== 0. 初始化 ========================
const timerStore = useTimerStore();
const settingStore = useSettingStore();
const router = useRouter();
const route = useRoute();

// =================== 1. routor 切换页面 ==================================================
// 页面切换 routor
const menuOptions = [
  { label: "首页", key: "/" },
  { label: "数据", key: "/search" },
  { label: "仪表盘", key: "/chart" },
  { label: "帮助", key: "/help" },
  // { label: "设置", key: "/settings" },
];
const current = ref(route.path);

function handleMenuSelect(key: string) {
  if (key !== route.path) {
    router.push(key);
  }
}

// ====================== 2. 拖动Timer 功能实现 =========================
const DRAG_THRESHOLD = 5;
const { draggableContainer, setInitialPosition, handleMouseDown, lastPosition } = useDraggable(DRAG_THRESHOLD);
// 拖动功能
async function updateDraggableContainerVisibilityAndPosition(show: boolean) {
  await nextTick();
  if (draggableContainer.value) {
    const parentElement = draggableContainer.value.parentElement;
    if (!parentElement) {
      console.error("Draggable container has no parent element in watcher!");
      return;
    }
    if (show) {
      setInitialPosition();
      draggableContainer.value.style.visibility = "visible";
    } else {
      lastPosition.value = {
        x: draggableContainer.value.offsetLeft,
        y: draggableContainer.value.offsetTop,
      };
      lastPosition.value.x = draggableContainer.value.offsetLeft;
      lastPosition.value.y = draggableContainer.value.offsetTop;
      draggableContainer.value.style.visibility = "hidden";
    }
  }
}

// ================ 3. Timer miniMode 实现 ==============================================

// 全屏显示时钟 支持 tauri 或 网页
// 注意：这个函数针对Tauri和浏览器的共同调用
// 番茄时钟显示相关
const { isMiniMode, toggleMiniMode } = useAlwaysOnTop();
const showPomoSeq = ref(false);
const reportedPomodoroWidth = ref(0);
const reportedPomodoroHeight = ref(0);
const PomotentionTimerContainerRef = ref<HTMLElement | null>(null);

async function handleToggleOntopMode(width: number, height: number) {
  isMiniMode.value = !isMiniMode.value; // 切换迷你模式状态

  // 计算最终尺寸
  let finalWidth = width * settingStore.settings.miniModeRefactor;
  let finalHeight = height * settingStore.settings.miniModeRefactor;

  if (isMiniMode.value) {
    console.log("[mini] Entering mini mode...");
    console.log(`[mini] Window resized to: ${finalWidth}x${finalHeight}`);

    if (isTauri()) {
      // 在 Tauri 环境中设置窗口属性
      const appWindow = getCurrentWindow();
      await appWindow.setDecorations(false);
      await appWindow.setSize(new LogicalSize(finalWidth, finalHeight));
      await appWindow.setPosition(new PhysicalPosition(400, 400));
    } else {
      // 在网页环境中调整样式
      document.body.classList.add("mini-mode");
      document.body.style.width = `${finalWidth}px`;
      document.body.style.height = `${finalHeight}px`;
    }

    // 更新 DOM 状态
    await nextTick();
  } else {
    console.log("[mini] Exiting mini mode...");

    if (isTauri()) {
      // 恢复 Tauri 窗口属性
      const appWindow = getCurrentWindow();
      await appWindow.setDecorations(true);
      await appWindow.setSize(new LogicalSize(950, 600)); // 恢复原始大小
      await appWindow.center();
    } else {
      // 恢复网页样式
      document.body.classList.remove("mini-mode");
      document.body.style.width = "";
      document.body.style.height = "";
    }

    await nextTick(); // 确保 DOM 更新
    updateDraggableContainerVisibilityAndPosition(settingStore.settings.showPomodoro);
  }

  // 更新拖拽功能
  if (draggableContainer.value && !isMiniMode.value) {
    draggableContainer.value.addEventListener("mousedown", handleMouseDown);
  }

  if (route.path !== "/") {
    await router.push("/");
  }
}

// PomotentionTimer 的尺寸报告
const handlePomotentionTimerSizeReport = ({ width, height }: { width: number; height: number }) => {
  reportedPomodoroWidth.value = width;
  reportedPomodoroHeight.value = height;
};

// 同步Timer大小
async function handleMiniModeSizeUpdate() {
  if (isMiniMode.value) {
    const finalWidth = reportedPomodoroWidth.value * settingStore.settings.miniModeRefactor;
    const finalHeight = reportedPomodoroHeight.value * settingStore.settings.miniModeRefactor;

    console.log(`[mini] Window update to: ${finalWidth}x${finalHeight}`);
    // 更新CSS或者Tauri窗口
    if (!isTauri()) {
      document.body.style.width = `${finalWidth}px`;
      document.body.style.height = `${finalHeight}px`;
    }
  }
}

// ================ 4. 按钮切换显示 ==============================================
const { buttonStyle, updateButtonStates } = useButtonStyle();
const viewControls = computed(() => [
  {
    key: "ontop",
    icon: Pin24Regular,
    title: "番茄时钟置顶",
    show: true,
  },
  {
    key: "pomodoro",
    icon: Timer24Regular,
    title: "切换番茄钟视图",
    show: settingStore.settings.showPomodoro,
  },
  {
    key: "schedule",
    icon: ArrowLeft24Filled,
    title: "切换日程视图",
    show: settingStore.settings.showSchedule,
  },
  {
    key: "planner",
    icon: ArrowUp24Filled,
    title: "切换计划视图",
    show: settingStore.settings.showPlanner,
  },
  {
    key: "task",
    icon: ArrowDown24Filled,
    title: "切换执行视图",
    show: settingStore.settings.showTask,
  },
  {
    key: "activity",
    icon: ArrowRight24Filled,
    title: "切换活动视图",
    show: settingStore.settings.showActivity,
  },
  {
    key: "ai",
    icon: BrainCircuit24Regular,
    title: "切换AI助手",
    show: settingStore.settings.showAi,
  },
]);

type Panel = "schedule" | "activity" | "task" | "today" | "pomodoro" | "ai";

function toggleSettingPanel(panel: Panel) {
  // 统一生成 key，并用显式联合类型避免拼写错误
  const toKey = (p: Panel) =>
    ("show" + p.charAt(0).toUpperCase() + p.slice(1)) as
      | "showSchedule"
      | "showActivity"
      | "showTask"
      | "showToday"
      | "showPomodoro"
      | "showAi";

  const settings = settingStore.settings;
  const key = toKey(panel);

  // 先切换当前面板
  const next = !(settings as any)[key] as boolean;
  (settings as any)[key] = next;

  // 若当前被打开，则关闭互斥的另一个
  if (next) {
    if (panel === "activity") {
      (settings as any)[toKey("ai")] = false;
    } else if (panel === "ai") {
      (settings as any)[toKey("activity")] = false;
    }
  }
}

// 统一切换的接口
function handleMainLayoutViewToggle(key: string) {
  if (key === "ontop") {
    toggleMiniMode(); // 切换迷你模式
    return;
  }

  toggleSettingPanel(key as "schedule" | "activity" | "task" | "today" | "pomodoro" | "ai");
}

onMounted(() => {
  updateDraggableContainerVisibilityAndPosition(settingStore.settings.showPomodoro);
  if (draggableContainer.value) {
    draggableContainer.value.addEventListener("mousedown", handleMouseDown);
  }
});

onUnmounted(() => {
  // Cleanup the draggable event listener
  if (draggableContainer.value) {
    draggableContainer.value.removeEventListener("mousedown", handleMouseDown);
  }
});

watch(route, (newVal) => {
  current.value = newVal.path;
});

watch(
  [
    () => settingStore.settings.showSchedule,
    () => settingStore.settings.showPlanner,
    () => settingStore.settings.showTask,
    () => settingStore.settings.showActivity,
    () => settingStore.settings.showPomodoro,
    () => settingStore.settings.showAi,
  ],
  () => {
    updateButtonStates();
  },
  { immediate: true }
);

//  浮动组件显示状态变化监听 (设置位置)
watch(
  () => settingStore.settings.showPomodoro,
  async (newVal) => {
    await updateDraggableContainerVisibilityAndPosition(newVal);
    if (draggableContainer.value) {
      draggableContainer.value.addEventListener("mousedown", handleMouseDown);
    }
  }
);

watch(
  () => showPomoSeq.value,
  async (newVal) => {
    if (isMiniMode.value) {
      console.log("[MainLayout show pomoseq]:", newVal);
      const appWindow = getCurrentWindow();

      await nextTick();

      let finalWidth = reportedPomodoroWidth.value * settingStore.settings.miniModeRefactor;
      let finalHeight = reportedPomodoroHeight.value * settingStore.settings.miniModeRefactor;
      console.log(`[mini] Window update to: ${finalWidth}x${finalHeight}`);
      try {
        await appWindow.setSize(new LogicalSize(finalWidth, finalHeight));
      } catch (error) {
        console.error("[mini] Failed to set pomoSeq", error);
      }
    }
    if (draggableContainer.value) {
      draggableContainer.value.addEventListener("mousedown", handleMouseDown);
    }
  }
);

watch(
  () => timerStore.isActive,
  async (newVal) => {
    if (isMiniMode.value && showPomoSeq.value) {
      console.log("[MainLayout running pomoseq]:", newVal);
      await handleMiniModeSizeUpdate(); // 调整迷你模式大小
    }
  }
);

// 监听 isMiniMode 变化
watch(
  () => isMiniMode.value,
  async (newVal) => {
    // 当迷你模式状态切换时，更新窗口的大小及其他逻辑
    if (newVal) {
      console.log("[MiniMode] Entering mini mode...");
      if (isTauri()) {
        const appWindow = getCurrentWindow();
        await appWindow.setSize(
          new LogicalSize(
            reportedPomodoroWidth.value * settingStore.settings.miniModeRefactor,
            reportedPomodoroHeight.value * settingStore.settings.miniModeRefactor
          )
        );
        await appWindow.center();
      }
    } else {
      console.log("[MiniMode] Exiting mini mode...");
      // 在退出迷你模式时，可以恢复窗口的大小或者执行其他逻辑
      const originalWidth = 950; // 恢复原始宽度
      const originalHeight = 600; // 恢复原始高度
      if (isTauri()) {
        const appWindow = getCurrentWindow();
        await appWindow.setSize(new LogicalSize(originalWidth, originalHeight));
        await appWindow.center();
      }
    }
  },
  { immediate: true } // 立即执行检查（如果需要）
);
</script>

<style scoped>
/* 根布局容器：占据整个视口，并垂直 flex 布局 */
.app-layout {
  overflow: hidden;
  height: 100vh;
}

/* 头部样式 */
.app-layout__header {
  flex-shrink: 0; /* 确保 header 不会被压缩 */
  height: 30px; /* 默认高度 */
  min-height: 30px; /* 确保最小高度 */
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: var(--color-background); /* 使用主题变量 */
  border-bottom: 1px solid var(--color-background-light);
  font-weight: bold;
  transition: all 0.3s ease-in-out; /* 平滑过渡 */
  overflow: hidden; /* 隐藏 header 内部的溢出内容 */
  box-sizing: border-box; /* 确保 padding 和 border 包含在高度内 */
}

/* 迷你模式下隐藏头部 */
.app-layout__header--hidden {
  height: 0px !important; /* 强制高度为 0 */
  min-height: 0px !important; /* 强制最小高度为 0 */
  padding: 0 !important;
  border-bottom: none !important;
  opacity: 0;
  pointer-events: none; /* 隐藏时不允许交互 */
}

/* 头部内容布局 */
.app-layout__header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* 视图控制按钮组样式 */
.app-layout__view-controls {
  display: flex;
  gap: 2px; /* 按钮间距 */
  align-items: center;
}

/* 主内容区域样式：占据所有剩余空间 */
.app-layout__content {
  position: relative;
  height: calc(100% - 30px); /* 填充整个视口高度 */
  overflow: hidden;
  display: flex; /* 启用 Flexbox */
  justify-content: center; /* 水平居中 */
  align-items: center; /* 垂直居中 */
}

/* 头部按钮通用样式 */
.header-button {
  width: 30px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  font-size: 14px;
}

.header-button:hover {
  background-color: var(--color-blue-light) !important;
}

/* draggable-container 样式 */
.draggable-container {
  position: absolute; /* 允许在内容区域内自由拖动 */
  visibility: hidden; /* 初始隐藏，直到设置好位置再显示，避免闪烁 */
  cursor: grab; /* 拖动光标 */
  z-index: 100; /* 确保它在其他内容之上 */
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  user-select: none;
  background-color: transparent;
}
.n-layout {
  background-color: white;
}

/* 迷你模式下内容区域全屏 */
.app-layout__content--full-height {
  display: flex;
  justify-content: center;
  align-items: center;
  user-select: none;
  height: 100%;
}

.pomodoro-mini-view-wrapper:deep(.n-layout .n-layout-scroll-container) {
  overflow-y: hidden !important;
}

.mini-mode {
  overflow: hidden; /* 隐藏多余内容 */
  transition: width 0.2s ease, height 0.2s ease; /* 平滑过渡 */
  width: 100%; /* 定义宽度 */
  height: 100%; /* 定义高度 */
}

.mainLayout-mini {
  margin-top: 20px;
}
</style>
