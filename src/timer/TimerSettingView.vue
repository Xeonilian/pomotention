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
  overflow: auto;
  padding: 12px;
  box-sizing: border-box;
}

/* 完整版设置 tab 的 max-height 是为大窗设计的，Timer 小窗改为铺满可滚动区 */
.timer-settings-body :deep(.setting-tab-page) {
  max-height: none;
  height: 100%;
  padding-right: 0;
}

.timer-settings-body :deep(.setting-tab-page--scroll) {
  overflow-y: auto;
}

.timer-settings-body :deep(.setting-tab-card) {
  background-color: var(--color-background, #ffffff);
}
</style>
