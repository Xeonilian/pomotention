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
          :showPomoSeq="showPomoSeq"
          :isMiniMode="isMiniMode"
          @toggle-pomo-seq="showPomoSeq = !showPomoSeq"
          @report-size="handlePomotentionTimerSizeReport"
          @exit-mini-mode="handleToggleOntopMode(reportedPomodoroWidth, reportedPomodoroHeight)"
          @exit-mini-mode-web="handleWebToggle()"
        />
      </n-layout-content>

      <!-- ✅ 新增：同步状态 Footer -->
      <n-layout-footer v-if="!isMiniMode" class="sync-footer" bordered>
        <div class="sync-status">
          <!-- 状态图标 -->
          <div class="sync-status__icon" :class="`sync-status__icon--${syncStore.syncStatus}`">
            {{ syncIcon }}
          </div>

          <!-- 状态信息 -->
          <div class="sync-status__info">
            <span class="sync-status__message">{{ syncStore.syncMessage }}</span>
            <span v-if="syncStore.lastSyncTimestamp" class="sync-status__time">
              {{ relativeTime }}
            </span>
          </div>

          <!-- 错误信息 -->
          <div v-if="syncStore.syncError" class="sync-status__error">
            {{ syncStore.syncError }}
          </div>

          <!-- 操作按钮 -->
          <div class="sync-status__actions">
            <!-- <n-button size="tiny" quaternary :loading="syncStore.isSyncing" @click="handleFullSync" title="完整同步（上传+下载）">
              <template #icon>
                <n-icon><CloudSync24Regular /></n-icon>
              </template>
              同步
            </n-button> -->

            <n-button size="tiny" quaternary :loading="syncStore.isSyncing" @click="handleUpload" title="只上传本地数据">
              <template #icon>
                <n-icon><CloudSync24Regular /></n-icon>
              </template>
              上传
            </n-button>

            <n-button size="tiny" quaternary :loading="syncStore.isSyncing" @click="handleDownload" title="只下载云端数据">
              <template #icon>
                <n-icon><CloudSync24Regular /></n-icon>
              </template>
              下载
            </n-button>
          </div>
        </div>
      </n-layout-footer>
    </n-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { NMenu, NButton, NIcon } from "naive-ui";
import { isTauri } from "@tauri-apps/api/core";

import { getCurrentWindow, PhysicalPosition, LogicalSize } from "@tauri-apps/api/window";

import { useSyncStore } from "@/stores/useSyncStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useTimerStore } from "@/stores/useTimerStore";

import { syncAll, uploadAll, downloadAll } from "@/services/sync";

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
import { useRelativeTime } from "@/composables/useRelativeTime";

import { CloudSync24Regular } from "@vicons/fluent";

import PomotentionTimer from "@/components/PomotentionTimer/PomotentionTimer.vue";

const timerStore = useTimerStore();
const settingStore = useSettingStore();
const syncStore = useSyncStore();

const { isAlwaysOnTop, toggleAlwaysOnTop } = useAlwaysOnTop();
const router = useRouter();
const route = useRoute();

const isMiniMode = ref(false);
const showPomoSeq = ref(false);

const PomotentionTimerContainerRef = ref<HTMLElement | null>(null);
const reportedPomodoroWidth = ref<number>(221);
const reportedPomodoroHeight = ref<number>(140);
const containerWidth = ref<number>(221);
const containerHeight = ref<number>(140);

const syncIcon = computed(() => {
  switch (syncStore.syncStatus) {
    case "syncing":
    case "uploading":
    case "downloading":
      return "🔄";
    case "error":
      return "❌";
    default:
      return "✅";
  }
});

// 格式化时间
const relativeTime = useRelativeTime(computed(() => syncStore.lastSyncTimestamp));

// 测试按钮
// async function handleFullSync() {
//   try {
//     await syncAll();
//   } catch (error) {
//     console.error("同步失败:", error);
//   }
// }

async function handleUpload() {
  try {
    await uploadAll();
  } catch (error) {
    console.error("上传失败:", error);
  }
}

async function handleDownload() {
  try {
    const lastSync = syncStore.lastSyncTimestamp;
    await downloadAll(lastSync);
  } catch (error) {
    console.error("下载失败:", error);
  }
}

const menuOptions = [
  { label: "首页", key: "/" },
  { label: "数据", key: "/search" },
  { label: "仪表盘", key: "/chart" },
  { label: "帮助", key: "/help" },
  // { label: "设置", key: "/settings" },
];
const current = ref(route.path);

const DRAG_THRESHOLD = 5;

// Use the composables

const { buttonStyle, updateButtonStates } = useButtonStyle();

const { draggableContainer, setInitialPosition, handleMouseDown, lastPosition } = useDraggable(DRAG_THRESHOLD);

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

function handleMenuSelect(key: string) {
  if (key !== route.path) {
    router.push(key);
  }
}

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

function handleMainLayoutViewToggle(key: string) {
  if (key === "ontop") {
    isMiniMode.value = true;
    handleToggleOntopMode(reportedPomodoroWidth.value, reportedPomodoroHeight.value);
    return;
  }

  toggleSettingPanel(key as "schedule" | "activity" | "task" | "today" | "pomodoro" | "ai");
}

async function handleToggleOntopMode(width: number, height: number) {
  if (isTauri()) {
    const appWindow = getCurrentWindow();
    await toggleAlwaysOnTop();

    await nextTick();

    if (isAlwaysOnTop.value) {
      console.log("[mini] Entering mini mode...Set ", settingStore.settings.miniModeRefactor);
      let finalWidth = width * settingStore.settings.miniModeRefactor;
      let finalHeight = height * settingStore.settings.miniModeRefactor;
      console.log(`[mini] Window resized ori: ${width}x${height}`);
      console.log(`[mini] Window resized factor: ${finalWidth}x${finalHeight}`);
      try {
        await appWindow.setDecorations(false);
        await appWindow.setSize(new LogicalSize(finalWidth, finalHeight));

        await new Promise((resolve) => setTimeout(resolve, 50));

        if (PomotentionTimerContainerRef.value) {
          // 打印出具体引用的 DOM 元素
          console.log("[mini] Container Ref:", PomotentionTimerContainerRef.value);

          // 获取并记录尺寸
          containerWidth.value = PomotentionTimerContainerRef.value.clientWidth;
          containerHeight.value = PomotentionTimerContainerRef.value.clientHeight;
          console.log("[mini] Window resized true:", containerWidth.value, containerHeight.value);
          let factorReal = finalWidth / containerWidth.value;
          if (factorReal !== 1) {
            factorReal = Math.ceil(factorReal * 100) / 100;
            settingStore.settings.miniModeRefactor = factorReal;
          }
        } else {
          console.warn("[mini] Container Ref not found!");
        }

        await appWindow.setPosition(new PhysicalPosition(400, 400));
      } catch (error) {
        console.error("[mini] Failed to set window properties for mini mode:", error);
      }
    } else {
      isMiniMode.value = false;
      console.log("[mini] Exiting mini mode...");

      try {
        await appWindow.setDecorations(true);
        await appWindow.setSize(
          new LogicalSize(950 * settingStore.settings.miniModeRefactor, 600 * settingStore.settings.miniModeRefactor)
        );
        await appWindow.center();
        console.log("[mini] Window properties restored from mini mode.");
        lastPosition.value = { x: -1, y: -1 };
        await updateDraggableContainerVisibilityAndPosition(true);
      } catch (error) {
        console.error("Failed to restore window properties:", error);
      }
      if (draggableContainer.value) {
        draggableContainer.value.addEventListener("mousedown", handleMouseDown);
      }

      if (route.path !== "/") {
        await router.push("/");
      }
    }
  } else {
    console.warn("Tauri calls are being skipped as the app is not running in Tauri environment.");
  }
}

function handleWebToggle() {
  isMiniMode.value = false;
}

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

const handlePomotentionTimerSizeReport = ({ width, height }: { width: number; height: number }) => {
  reportedPomodoroWidth.value = width;
  reportedPomodoroHeight.value = height;
};

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

// 7.3 浮动组件显示状态变化监听 (设置位置)
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
  }
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

/* ✅ 同步 Footer 样式 */
.sync-footer {
  position: fixed; /* ✅ 固定定位 */
  bottom: 0; /* ✅ 贴底 */
  left: 0; /* ✅ 从左侧开始 */
  right: 0; /* ✅ 延伸到右侧 */

  display: flex;
  height: 30px;
  padding: 0px 10px;

  z-index: 1000; /* ✅ 确保在其他内容上方 */
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 11px;
}

.sync-status__icon {
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 11px;
  height: 11px;
}

.sync-status__icon--syncing,
.sync-status__icon--uploading,
.sync-status__icon--downloading {
  animation: rotate 1s linear infinite;
}

.sync-status__icon--error {
  color: #d03050;
}

.sync-status__icon--idle {
  color: #18a058;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.sync-status__info {
  display: flex;
  flex-direction: row;
  gap: 6px;
  font-size: 12px;
}

.sync-status__message {
  font-weight: 500;
  color: #333;
}

.sync-status__time {
  color: #999;
}

.sync-status__error {
  flex: 1;
  color: #d03050;
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sync-status__actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
  font-size: 9px;
}
</style>
