<template>
  <!-- 绑定 Ref 到 composable 返回的变量 -->
  <div class="pomodoro-mini-view-wrapper" ref="PomotentionTimerContainerRef">
    <n-layout class="app-layout">
      <!-- Header -->
      <n-layout-header class="app-layout__header" :class="{ 'app-layout__header--hidden': isMiniMode }">
        <div class="app-layout__header-content">
          <!-- 桌面端显示完整菜单 -->
          <n-menu
            v-if="!isMobile"
            :options="menuOptions"
            mode="horizontal"
            :value="currentRoutePath"
            @update:value="handleMenuSelect"
            class="desktop-menu"
          />
          <!-- 移动端显示下拉菜单按钮 -->
          <n-dropdown
            v-else
            :options="dropdownMenuOptions"
            :value="currentRoutePath"
            @select="handleMenuSelect"
            trigger="click"
            placement="bottom-start"
          >
            <n-button size="tiny" text class="mobile-menu-button" title="菜单">
              <template #icon>
                <n-icon size="18" :component="List24Filled" />
              </template>
            </n-button>
          </n-dropdown>
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
            <!-- 未登录时显示登录按钮 -->
            <n-button
              v-if="!isLoggedIn"
              size="tiny"
              type="info"
              secondary
              title="登录/注册"
              class="header-button"
              @click="syncStore.handleLogin"
            >
              <template #icon>
                <n-icon>
                  <PersonAccounts24Filled />
                </n-icon>
              </template>
            </n-button>
            <!-- 已登录时显示退出登录按钮 -->
            <n-popconfirm
              v-else
              @positive-click="handleLogoutConfirm"
              @negative-click="handleLogoutCancel"
              negative-text="不保留"
              positive-text="保留"
            >
              <template #trigger>
                <n-button size="tiny" type="default" secondary :loading="syncStore.loggingOut" title="退出登录" class="header-button">
                  <template #icon>
                    <n-icon>
                      <PersonAccounts24Filled />
                    </n-icon>
                  </template>
                </n-button>
              </template>
              <span>退出登录时是否保留本地数据？</span>
            </n-popconfirm>
          </div>
        </div>
      </n-layout-header>

      <!-- Content -->
      <n-layout-content class="app-layout__content" :class="{ 'app-layout__content--full-height': isMiniMode }">
        <router-view v-if="!isMiniMode" />

        <!-- 悬浮番茄钟容器 (正常模式) -->
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
      <n-layout-footer v-if="!isMiniMode" class="sync-footer" bordered>
        <div class="footer-content">
          <!-- 左侧：同步状态信息 -->
          <div class="sync-status">
            <div class="sync-status__icon" :class="`sync-status__icon--${syncStore.syncStatus}`">
              {{ syncIcon }}
            </div>
            <div class="sync-status__info">
              <span class="sync-status__message">{{ syncStore.syncMessage }}</span>
              <span v-if="syncStore.lastSyncTimestamp" class="sync-status__time">{{ relativeTime }}</span>
              <n-tag
                v-if="dataStore.hasUnsyncedData"
                type="default"
                size="tiny"
                style="
                  font-size: 10px;
                  line-height: 16px;
                  display: flex;
                  align-items: center;
                  height: 16px;
                  justify-content: center;
                  margin-top: 1px;
                "
              >
                数据未同步
              </n-tag>
              <span v-if="syncStore.syncError" class="sync-status__error">{{ syncStore.syncError }}</span>
            </div>
          </div>

          <!-- 右侧：手动操作按钮（text 模式，不太明显） -->
          <div class="footer-actions">
            <n-button
              v-if="syncStore.isLoggedIn"
              text
              size="small"
              :loading="syncStore.isSyncing && syncStore.syncStatus === 'uploading'"
              :disabled="syncStore.isSyncing"
              @click="handleManualUpload"
              style="opacity: 0.6; font-size: 11px"
            >
              <template #icon>
                <n-icon :size="12"><ArrowUp24Filled /></n-icon>
              </template>
              上传
            </n-button>
            <n-button
              v-if="syncStore.isLoggedIn"
              text
              size="small"
              :loading="syncStore.isSyncing && syncStore.syncStatus === 'downloading'"
              :disabled="syncStore.isSyncing"
              @click="handleManualDownload"
              style="opacity: 0.6; font-size: 11px"
            >
              <template #icon>
                <n-icon :size="12"><ArrowDown24Filled /></n-icon>
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
import { ref, watch, nextTick, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { NMenu, NButton, NIcon, NLayoutFooter, NTag, NPopconfirm, NDropdown } from "naive-ui";
import { storeToRefs } from "pinia";

// Stores
import { useSettingStore } from "@/stores/useSettingStore";
import { useDataStore } from "@/stores/useDataStore";
import { useSyncStore } from "@/stores/useSyncStore";

// Composables
import { useButtonStyle } from "@/composables/useButtonStyle";
import { useDraggable } from "@/composables/useDraggable";
import { useAppWindow } from "@/composables/useAppWindow";
import { useSyncWidget } from "@/composables/useSyncWidget";
import { useDevice } from "@/composables/useDevice";

// Icons & Components
import { PersonAccounts24Filled, ArrowUp24Filled, ArrowDown24Filled, List24Filled } from "@vicons/fluent";
import PomotentionTimer from "@/components/PomotentionTimer/PomotentionTimer.vue";

const router = useRouter();
const route = useRoute();
const settingStore = useSettingStore();
const dataStore = useDataStore();

// === 1. 初始化 Composables ===
const { buttonStyle, viewControls, toggleSettingPanel } = useButtonStyle();
const { draggableContainer, handleDragStart, ensureWithinBounds, updateDraggableContainerVisibility, onExitMiniMode } = useDraggable(5);

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

// 为了不报错增加的使用 PomotentionTimerContainerRef
if (!settingStore.settings.showPomodoro) {
  console.log("Refs error prevent:", PomotentionTimerContainerRef.value, draggableContainer.value);
}
const syncStore = useSyncStore();
const { syncIcon, relativeTime, handleUpload, handleDownload } = useSyncWidget();
const { isLoggedIn } = storeToRefs(syncStore);
const { isMobile } = useDevice();

// 处理退出登录确认（保留数据）
async function handleLogoutConfirm() {
  // 用户点击"保留"，设置为保留本地数据
  settingStore.settings.keepLocalDataAfterSignOut = true;
  // 执行退出登录
  await syncStore.handleLogout();
}

// 处理退出登录取消（不保留数据）
async function handleLogoutCancel() {
  // 用户点击"不保留"，设置为不保留本地数据
  settingStore.settings.keepLocalDataAfterSignOut = false;
  // 执行退出登录
  await syncStore.handleLogout();
}

// === 2. 菜单与路由逻辑 ===
const currentRoutePath = ref(route.path);
const menuOptions = [
  { label: "首页", key: "/" },
  { label: "数据", key: "/search" },
  { label: "仪表盘", key: "/chart" },
  { label: "帮助", key: "/help" },
];

// 移动端下拉菜单选项
const dropdownMenuOptions = [
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

// 监听尺寸变化，只在超出边界时才重定位，否则保持当前位置
watch(
  [() => reportedPomodoroWidth.value, () => reportedPomodoroHeight.value],
  async () => {
    if (!isMiniMode.value && settingStore.settings.showPomodoro) {
      await nextTick();
      requestAnimationFrame(() => {
        // 只在超出边界时才重定位，否则保持当前位置
        ensureWithinBounds(reportedPomodoroWidth.value, reportedPomodoroHeight.value);
      });
    }
  }
);

// === 3. 视图控制按钮 ===
function handleMainLayoutViewToggle(key: string) {
  if (key === "ontop") {
    // 进入 Mini 模式
    handleToggleOntopMode(reportedPomodoroWidth.value, reportedPomodoroHeight.value);
    return;
  }
  // 切换其他面板逻辑
  toggleSettingPanel(key as any);
}

// === 4. 初始化 ===
onMounted(async () => {
  // 如果初始设置是开启的，需要手动触发一次显示逻辑，把 visibility 改为 visible
  if (settingStore.settings.showPomodoro) {
    // 必须等待 nextTick，确保 v-if 已经把 DOM 渲染出来了
    await nextTick();
    await updateDraggableContainerVisibility(true);
  }
});

// === 5. 手动同步操作 ===
async function handleManualUpload() {
  await handleUpload();
}

async function handleManualDownload() {
  await handleDownload();
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
  gap: 8px;
}
.desktop-menu {
  flex: 1;
}
.mobile-menu-button {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  --n-text-color-pressed: var(--color-blue) !important;
  --n-text-color-hover: var(--color-blue) !important;
}

.app-layout__view-controls {
  display: flex;
  gap: 2px;
  align-items: center;
}
.app-layout__content {
  position: relative;
  height: calc(100% - 50px);
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
  height: 20px;
  padding: 0px 10px;
  z-index: 1000;
  display: flex;
  align-items: center;
}

.footer-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.sync-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  flex: 1;
  color: var(--color-text-secondary);
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
  font-size: 11px;
}
.sync-status__message {
  font-weight: 300;
  font-size: 11px;
  color: var(--color-text-primary);
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
.footer-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-shrink: 0;
}
</style>
