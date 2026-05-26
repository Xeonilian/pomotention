<template>
  <div class="timer-settings-root">
    <header class="timer-settings-header">
      <n-button text title="返回计时器" @click="goBack">
        <template #icon>
          <n-icon :component="ArrowLeft24Regular" />
        </template>
      </n-button>
      <span class="timer-settings-title">番茄时钟设置</span>
    </header>
    <main class="timer-settings-body">
      <SettingPomoTab />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { NButton, NIcon } from "naive-ui";
import { ArrowLeft24Regular } from "@vicons/fluent";
import SettingPomoTab from "@/components/setting/SettingPomoTab.vue";

const router = useRouter();

function goBack() {
  if (router.currentRoute.value.path !== "/") {
    void router.push("/");
  }
}
</script>

<style scoped>
.timer-settings-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  background-color: var(--color-background, #ffffff);
}

.timer-settings-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--color-background-light, #efefef);
}

.timer-settings-title {
  font-weight: 600;
  font-size: 14px;
}

.timer-settings-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding: 0;
  box-sizing: border-box;
}

/* 取消完整版 settingShared 的内层滚动条，由 Timer 页单一容器铺满 */
.timer-settings-body :deep(.setting-tab-page) {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: none !important;
  padding: 0;
  overflow: visible !important;
}

.timer-settings-body :deep(.setting-tab-page--scroll) {
  max-height: none !important;
  overflow: visible !important;
}

.timer-settings-body :deep(.setting-tab-card) {
  flex: 1;
  min-height: 0;
  width: 100%;
  border-radius: 0;
  border: none;
  box-shadow: none;
  background-color: var(--color-background, #ffffff);
}

.timer-settings-body :deep(.setting-tab-card .n-card__content) {
  flex: 1;
  padding: 12px 12px 16px;
}
</style>
