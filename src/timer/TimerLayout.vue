<template>
  <div class="pomodoro-mini-view-wrapper" ref="PomotentionTimerContainerRef">
    <n-layout class="app-layout" :class="{ 'app-layout--use-vv-height': isMobile, 'app-layout--has-bg': hasActiveBackground, 'app-layout--mini-mode': isMiniMode }">
      <div v-if="!isMiniMode" class="timer-bg-layer" :class="layerClass" aria-hidden="true">
        <component :is="activeComponent" v-if="activeComponent" v-bind="activeComponentProps" />
      </div>
      <n-layout-header class="app-layout__header" :class="{ 'app-layout__header--hidden': isMiniMode }">
        <div class="app-layout__header-content app-layout__header-content--timer">
          <div class="app-layout__view-controls">
            <n-button
              text
              type="default"
              :title="settingStore.settings.darkMode ? '切换浅色模式' : '切换深色模式'"
              class="header-button"
              @click="toggleDarkMode"
            >
              <template #icon>
                <n-icon :component="settingStore.settings.darkMode ? WeatherSunny24Filled : WeatherSunny24Regular" />
              </template>
            </n-button>
            <n-button v-if="isTauriDesktop" text type="default" title="番茄时钟置顶" class="header-button" @click="handlePinClick">
              <template #icon>
                <n-icon :component="Pin24Regular" />
              </template>
            </n-button>
            <n-button text type="default" title="统计数据" class="header-button" @click="openStats">
              <template #icon>
                <n-icon :component="DataArea24Regular" />
              </template>
            </n-button>
            <n-button text type="default" title="帮助" class="header-button" @click="openHelp">
              <template #icon>
                <n-icon :component="QuestionCircle24Regular" />
              </template>
            </n-button>
            <n-button text type="default" title="设置" class="header-button" @click="openSettings">
              <template #icon>
                <n-icon :component="Settings24Regular" />
              </template>
            </n-button>
          </div>
        </div>
      </n-layout-header>

      <n-layout-content
        class="app-layout__content"
        :class="{ 'app-layout__content--full-height': isMiniMode }"
        @click="onContentClick"
        @dblclick="onContentDoubleClick"
        @touchend="onVoidTouchEnd"
        @touchcancel="onVoidTouchCancel"
      >
        <div v-if="!isMiniMode" class="timer-timer-center">
          <PomotentionTimer
            ref="pomotentionTimerRef"
            :showPomoSeq="showPomoSeq"
            :isMiniMode="isMiniMode"
            @toggle-pomo-seq="showPomoSeq = !showPomoSeq"
            @report-size="handlePomotentionTimerSizeReport"
            @enter-mini="() => handleToggleOntopMode(reportedPomodoroWidth, reportedPomodoroHeight)"
          />
        </div>

        <PomotentionTimer
          v-else
          ref="pomotentionTimerRef"
          :showPomoSeq="showPomoSeq"
          :isMiniMode="isMiniMode"
          :isMobile="isMobile"
          @toggle-pomo-seq="showPomoSeq = !showPomoSeq"
          @report-size="handlePomotentionTimerSizeReport"
          @exit-mini-mode="() => exitOntopMiniMode(onExitMiniMode)"
          @exit-mini-mode-web="handleWebToggle(onExitMiniMode)"
        />
      </n-layout-content>
    </n-layout>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { NLayout, NLayoutHeader, NLayoutContent, NButton, NIcon } from "naive-ui";
import { isTauri } from "@tauri-apps/api/core";
import {
  DataArea24Regular,
  Pin24Regular,
  QuestionCircle24Regular,
  Settings24Regular,
  WeatherSunny24Filled,
  WeatherSunny24Regular,
} from "@vicons/fluent";
import PomotentionTimer from "@/components/PomotentionTimer/PomotentionTimer.vue";
import { useSettingStore } from "@/stores/useSettingStore";
import { useAppWindow } from "@/composables/layout/useAppWindow";
import { useDevice } from "@/composables/platform/useDevice";
import { useTimerBackgroundAnimation } from "@/background";

const router = useRouter();
const settingStore = useSettingStore();
const { isMobile } = useDevice();
const isTauriDesktop = isTauri();

const {
  isMiniMode,
  showPomoSeq,
  PomotentionTimerContainerRef,
  reportedPomodoroWidth,
  reportedPomodoroHeight,
  handleToggleOntopMode,
  exitOntopMiniMode,
  handleWebToggle,
  handlePomotentionTimerSizeReport,
} = useAppWindow();

void PomotentionTimerContainerRef;

const pomotentionTimerRef = ref<InstanceType<typeof PomotentionTimer> | null>(null);
void pomotentionTimerRef;

const { currentId, layerClass, activeComponent, activeComponentProps, onVoidClick, onVoidDoubleClick, onVoidTouchEnd, onVoidTouchCancel } =
  useTimerBackgroundAnimation();

const hasActiveBackground = computed(() => currentId.value !== "none");

function isVoidBackgroundTarget(event: Event) {
  const target = event.target as HTMLElement | null;
  return !target?.closest(".pomodoro-view-wrapper");
}

function onContentClick(event: MouseEvent) {
  if (!isVoidBackgroundTarget(event)) return;
  onVoidClick();
}

function onContentDoubleClick(event: MouseEvent) {
  if (!isVoidBackgroundTarget(event)) return;
  onVoidDoubleClick();
}

function handlePinClick() {
  void handleToggleOntopMode(reportedPomodoroWidth.value, reportedPomodoroHeight.value);
}

function toggleDarkMode() {
  settingStore.settings.darkMode = !settingStore.settings.darkMode;
}

function openSettings() {
  void router.push({ name: "TimerSettings" });
}

function openHelp() {
  void router.push({ name: "TimerHelp" });
}

function openStats() {
  void router.push({ name: "TimerStats" });
}

function onExitMiniMode() {
  /* 退出置顶后保持首页布局 */
}
</script>

<style scoped>
.pomodoro-mini-view-wrapper {
  height: 100%;
  overflow: hidden;
}

.app-layout {
  position: relative;
  overflow: hidden;
  height: 100vh;
  height: 100dvh;
  user-select: none;
  background-color: var(--color-background, #ffffff);
}
.app-layout--has-bg {
  background-color: transparent;
}
.app-layout--mini-mode {
  height: 100%;
}
.app-layout--has-bg .app-layout__content,
.app-layout--has-bg .app-layout__content:deep(.n-layout-scroll-container) {
  background-color: transparent !important;
}
.app-layout__header {
  position: relative;
  flex-shrink: 0;
  height: 40px;
  min-height: 30px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  transition: all 0.3s ease-in-out;
  box-sizing: border-box;
  z-index: 150;
  background-color: transparent;
}
.app-layout__header--hidden {
  height: 0 !important;
  min-height: 0 !important;
  padding: 0 !important;
  border-bottom: none !important;
  opacity: 0;
  pointer-events: none;
}
.app-layout__header-content--timer {
  display: flex;
  justify-content: flex-end;
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
  z-index: 1;
  height: calc(100% - 30px);
  width: 100%;
  overflow: hidden;
}
.app-layout__content:deep(.n-layout-scroll-container) {
  position: relative;
  height: 100%;
  min-height: 100%;
}
.timer-timer-center {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  transform: translateY(-15px);
  pointer-events: none;
}
.timer-timer-center :deep(> *) {
  pointer-events: auto;
}
.app-layout__content--full-height {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}
.header-button {
  width: 30px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}
.pomodoro-mini-view-wrapper:deep(.n-layout .n-layout-scroll-container) {
  overflow: hidden !important;
}
</style>
