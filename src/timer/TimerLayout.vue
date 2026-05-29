<template>
  <div class="pomodoro-mini-view-wrapper" ref="PomotentionTimerContainerRef">
    <n-layout class="app-layout" :class="{ 'app-layout--use-vv-height': isMobile }">
      <n-layout-header class="app-layout__header" :class="{ 'app-layout__header--hidden': isMiniMode }">
        <div class="app-layout__header-content app-layout__header-content--timer">
          <div class="app-layout__view-controls">
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
            <n-button text type="default" title="标签管理" class="header-button" @click="showTagManager = true">
              <template #icon>
                <n-icon :component="Tag16Regular" />
              </template>
            </n-button>
          </div>
        </div>
      </n-layout-header>

      <n-layout-content class="app-layout__content" :class="{ 'app-layout__content--full-height': isMiniMode }">
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

    <Teleport to="#timer-portal">
      <TagManager v-model="tagManagerScratchIds" v-model:show="showTagManager" modal-to="#timer-portal" />
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { NLayout, NLayoutHeader, NLayoutContent, NButton, NIcon } from "naive-ui";
import { isTauri } from "@tauri-apps/api/core";
import { DataArea24Regular, Pin24Regular, QuestionCircle24Regular, Settings24Regular, Tag16Regular } from "@vicons/fluent";
import PomotentionTimer from "@/components/PomotentionTimer/PomotentionTimer.vue";
import TagManager from "@/components/TagSystem/TagManager.vue";
import { useAppWindow } from "@/composables/layout/useAppWindow";
import { useDevice } from "@/composables/platform/useDevice";

const router = useRouter();
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

const showTagManager = ref(false);
const tagManagerScratchIds = ref<number[]>([]);

function handlePinClick() {
  void handleToggleOntopMode(reportedPomodoroWidth.value, reportedPomodoroHeight.value);
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
.app-layout {
  overflow: hidden;
  height: 100vh;
  height: 100dvh;
  user-select: none;
  background-color: var(--color-background, #ffffff);
}
.app-layout__header {
  flex-shrink: 0;
  height: 40px;
  min-height: 30px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  transition: all 0.3s ease-in-out;
  box-sizing: border-box;
  z-index: 150;
  background-color: var(--color-background-light);
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
  height: calc(100% - 30px);
  width: 100%;
  overflow: hidden;
}
.app-layout__content--full-height {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
}
/* 抵消顶部 header，避免垂直居中后整体显得偏下 */
.timer-timer-center {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  transform: translateY(-15px);
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
  background-color: var(--color-background-light);
}
</style>
