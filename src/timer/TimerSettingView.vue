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
      <TimerSettingsForm />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import { NButton, NIcon } from "naive-ui";
import { ArrowLeft24Regular } from "@vicons/fluent";
import TimerSettingsForm from "./TimerSettingsForm.vue";

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
  overflow-y: auto;
  padding: 12px;
  box-sizing: border-box;
}
</style>
