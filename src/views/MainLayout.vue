<template>
  <!-- 绑定 Ref 到 composable 返回的变量 -->
  <div class="pomodoro-mini-view-wrapper" ref="PomotentionTimerContainerRef">
    <n-layout class="app-layout">
      <!-- Header -->
      <n-layout-header class="app-layout__header" :class="{ 'app-layout__header--hidden': isMiniMode }">
        <div class="app-layout__header-content">
          <n-menu :options="menuOptions" mode="horizontal" :value="currentRoutePath" @update:value="handleMenuSelect" />
          <div class="app-layout__view-controls">
            <n-button
              v-for="(control, index) in viewControls"
              :key="index"
              size="tiny"
              tertiary
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
            <n-popconfirm placement="top-end" positive-text="确认退出" negative-text="取消" @positive-click="handleLogout">
              <template #trigger>
                <n-button size="tiny" type="info" secondary :loading="loggingOut" title="退出登录" class="header-button">
                  <template #icon>
                    <n-icon>
                      <PersonAccounts24Filled />
                    </n-icon>
                  </template>
                </n-button>
              </template>

              需备份数据后退出，确定要退出登录吗？
            </n-popconfirm>
          </div>
        </div>
      </n-layout-header>

      <!-- Content -->
      <n-layout-content class="app-layout__content" :class="{ 'app-layout__content--full-height': isMiniMode }">
        <router-view v-if="!isMiniMode" />

        <!-- 悬浮番茄钟容器 (正常模式) -->
        <!-- ✅ 修正：使用 Pointer Event，且加上 touch-action: none -->
        <div
          class="draggable-container"
          ref="draggableContainer"
          v-if="!isMiniMode && settingStore.settings.showPomodoro"
          style="touch-action: none"
          @pointerdown="handleDragStart"
        >
          <PomotentionTimer
            :showPomoSeq="showPomoSeq"
            :isMiniMode="isMiniMode"
            @toggle-pomo-seq="showPomoSeq = !showPomoSeq"
            @report-size="handlePomotentionTimerSizeReport"
          />
        </div>

        <!-- 独立番茄钟 (Mini模式) -->
        <PomotentionTimer
          v-if="isMiniMode"
          :showPomoSeq="showPomoSeq"
          :isMiniMode="isMiniMode"
          @toggle-pomo-seq="showPomoSeq = !showPomoSeq"
          @report-size="handlePomotentionTimerSizeReport"
          @exit-mini-mode="handleToggleOntopMode(reportedPomodoroWidth, reportedPomodoroHeight, onExitMiniMode)"
          @exit-mini-mode-web="handleWebToggle(onExitMiniMode)"
        />
      </n-layout-content>

      <!-- Sync Footer -->
      <n-layout-footer v-if="!isMiniMode && syncStore.isSyncing" class="sync-footer" bordered>
        <div class="sync-status">
          <div class="sync-status__icon" :class="`sync-status__icon--${syncStore.syncStatus}`">
            {{ syncIcon }}
          </div>
          <div class="sync-status__info">
            <span class="sync-status__message">{{ syncStore.syncMessage }}</span>
            <span v-if="syncStore.lastSyncTimestamp" class="sync-status__time">{{ relativeTime }}</span>
          </div>
          <div v-if="syncStore.syncError" class="sync-status__error">{{ syncStore.syncError }}</div>
        </div>
      </n-layout-footer>
    </n-layout>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { NMenu, NButton, NIcon } from "naive-ui";

// Stores
import { useSettingStore } from "@/stores/useSettingStore";

// Composables
import { useButtonStyle } from "@/composables/useButtonStyle";
import { useDraggable } from "@/composables/useDraggable";
import { useAppWindow } from "@/composables/useAppWindow";
import { useSyncWidget } from "@/composables/useSyncWidget";

// Icons & Components
import {
  PersonAccounts24Filled,
  ArrowLeft24Filled,
  ArrowUp24Filled,
  ArrowDown24Filled,
  ArrowRight24Filled,
  Timer24Regular,
  Pin24Regular,
  BrainCircuit24Regular,
} from "@vicons/fluent";
import PomotentionTimer from "@/components/PomotentionTimer/PomotentionTimer.vue";

const router = useRouter();
const route = useRoute();
const settingStore = useSettingStore();

// === 1. 初始化 Composables ===
const { buttonStyle, updateButtonStates } = useButtonStyle();
const { draggableContainer, setInitialPosition, lastPosition, handleDragStart } = useDraggable(5);

const {
  isMiniMode,
  showPomoSeq,
  PomotentionTimerContainerRef, // 绑定到外层 div
  reportedPomodoroWidth,
  reportedPomodoroHeight,
  handleToggleOntopMode,
  handleWebToggle,
  handlePomotentionTimerSizeReport,
} = useAppWindow();

const { syncStore, syncIcon, relativeTime } = useSyncWidget();

// === 2. 菜单与路由逻辑 ===
const currentRoutePath = ref(route.path);
const menuOptions = [
  { label: "首页", key: "/" },
  { label: "数据", key: "/search" },
  { label: "仪表盘", key: "/chart" },
  { label: "帮助", key: "/help" },
];

function handleMenuSelect(key: string) {
  if (key !== route.path) router.push(key);
}

watch(route, (newVal) => {
  currentRoutePath.value = newVal.path;
});

// 为了不报错增加的使用 PomotentionTimerContainerRef
if (!settingStore.settings.showPomodoro) {
  console.log("PomotentionTimerContainerRef", PomotentionTimerContainerRef.value);
}

onMounted(async () => {
  // 如果初始设置是开启的，需要手动触发一次显示逻辑，把 visibility 改为 visible
  if (settingStore.settings.showPomodoro) {
    // 必须等待 nextTick，确保 v-if 已经把 DOM 渲染出来了
    await nextTick();
    await updateDraggableContainerVisibility(true);
  }
});

// === 3. 视图控制按钮===

const viewControls = computed(() => [
  { key: "ontop", icon: Pin24Regular, title: "番茄时钟置顶", show: true },
  { key: "pomodoro", icon: Timer24Regular, title: "切换番茄钟视图", show: settingStore.settings.showPomodoro },
  { key: "schedule", icon: ArrowLeft24Filled, title: "切换日程视图", show: settingStore.settings.showSchedule },
  { key: "planner", icon: ArrowUp24Filled, title: "切换计划视图", show: settingStore.settings.showPlanner },
  { key: "task", icon: ArrowDown24Filled, title: "切换执行视图", show: settingStore.settings.showTask },
  { key: "activity", icon: ArrowRight24Filled, title: "切换活动视图", show: settingStore.settings.showActivity },
  { key: "ai", icon: BrainCircuit24Regular, title: "切换AI助手", show: settingStore.settings.showAi },
]);

function handleMainLayoutViewToggle(key: string) {
  if (key === "ontop") {
    // 进入 Mini 模式
    handleToggleOntopMode(reportedPomodoroWidth.value, reportedPomodoroHeight.value);
    return;
  }
  // 切换其他面板逻辑
  toggleSettingPanel(key as any);
}

// 辅助：切换 Store 中的面板显示状态
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

// === 4. 拖拽容器可见性控制 ===

// 当退出 Mini 模式时的回调
async function onExitMiniMode() {
  lastPosition.value = { x: -1, y: -1 };
  await updateDraggableContainerVisibility(true);
}

// 控制 Draggable 容器的位置和显示
async function updateDraggableContainerVisibility(show: boolean) {
  await nextTick();
  if (draggableContainer.value) {
    if (show) {
      setInitialPosition();
      draggableContainer.value.style.visibility = "visible";
    } else {
      // 记录位置以便恢复
      lastPosition.value = {
        x: draggableContainer.value.offsetLeft,
        y: draggableContainer.value.offsetTop,
      };
      draggableContainer.value.style.visibility = "hidden";
    }
  }
}

// 监听番茄钟显示开关
watch(
  () => settingStore.settings.showPomodoro,
  async (newVal) => {
    await updateDraggableContainerVisibility(newVal);
  }
);

// === 5. 退出逻辑 ===
import { signOut } from "@/core/services/authService";

const loggingOut = ref(false);

async function handleLogout() {
  loggingOut.value = true;

  // 检查是否从本地模式切换过来的
  const wasLocalMode = settingStore.settings.wasLocalModeBeforeLogin;

  if (wasLocalMode) {
    // 从本地模式切换过来的，不清除本地数据
    console.log("👋 退出登录（从本地模式切换），保留本地数据");

    // App上数据备份提示（可选）
    if (isTauri()) {
      const confirmExport = confirm("退出登录将保留您的本地数据。是否继续？");
      if (!confirmExport) {
        loggingOut.value = false;
        return;
      }
    }

    // 只清除认证相关的 localStorage 项
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes("supabase") || key.includes("auth"))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (err) {
      console.error("清除认证数据时出错:", err);
    }
  } else {
    // 正常退出，清除所有数据
    // App上数据备份
    // 警告用户: 退出之前请导出数据
    if (isTauri()) {
      const confirmExport = confirm("在退出之前，您必须导出数据。是否继续导出？");
      if (confirmExport) {
        const exportSuccessful = await handleExport(); // 调用导出方法
        if (!exportSuccessful) {
          // 如果导出失败，停止注销
          loggingOut.value = false;
          return;
        }
      }
    }
    localStorage.clear();
  }

  await signOut();
  loggingOut.value = false;
  router.push({ name: "Login" });
}
import { collectLocalData } from "@/services/localStorageService";
import { open } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { isTauri } from "@tauri-apps/api/core";
const debugInfo = ref("");
async function handleExport() {
  try {
    const localdata = collectLocalData();

    // 选择目录
    const dirPath = await open({
      directory: true,
      multiple: false,
    });

    if (!dirPath || typeof dirPath !== "string") {
      debugInfo.value = "⚠️导出失败: 指定目录无效";
      return false; // 返回失败
    }

    // 分别保存每个数据类型
    const savePromises = Object.entries(localdata).map(async ([key, value]) => {
      const fileName = `${key}.json`;
      const filePath = `${dirPath}/${fileName}`;
      const jsonData = JSON.stringify(value, null, 2);
      await writeTextFile(filePath, jsonData);
      return fileName;
    });

    await Promise.all(savePromises);

    debugInfo.value = "✔️所有数据文件导出成功: " + dirPath;
    return true; // 返回成功
  } catch (error) {
    debugInfo.value = "⚠️导出失败: " + error;
    return false; // 返回失败
  }
}
</script>

<style scoped>
/* 保持你原来的 Style 不变 */
/* 重点检查 .draggable-container 是否有 touch-action: none */
.app-layout {
  overflow: hidden;
  height: 100vh;
  user-select: none;
}
.app-layout__header {
  flex-shrink: 0;
  height: 30px;
  min-height: 30px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-background-light);
  font-weight: bold;
  transition: all 0.3s ease-in-out;
  overflow: hidden;
  box-sizing: border-box;
}
.app-layout__header--hidden {
  height: 0px !important;
  min-height: 0px !important;
  padding: 0 !important;
  border-bottom: none !important;
  opacity: 0;
  pointer-events: none;
}
.app-layout__header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.app-layout__view-controls {
  display: flex;
  gap: 2px;
  align-items: center;
}
.app-layout__content {
  position: relative;
  height: calc(100% - 30px);
  overflow: hidden;
}
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
  position: absolute;
  visibility: hidden;
  cursor: grab;
  z-index: 100;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  user-select: none;
  background-color: transparent;
  touch-action: none; /* ✅ 关键：防止滚动 */
}
.n-layout {
  background-color: white;
}
.sync-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  height: 30px;
  padding: 0px 10px;
  z-index: 1000;
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
