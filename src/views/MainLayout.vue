<template>
  <n-layout class="layout">
    <n-layout-header class="header">
      <div class="header-content">
        <n-menu
          :options="menuOptions"
          mode="horizontal"
          :value="current"
          @update:value="handleMenuSelect"
        />
        <div class="view-controls">
          <n-button
            v-for="(control, index) in viewControls"
            :key="index"
            size="tiny"
            tertiary
            strong
            type="default"
            :style="buttonStyle(control.show, control.key)"
            :title="control.title"
            @click="handleViewToggle(control.key)"
            class="header-button"
          >
          <template #icon>
            <n-icon :component="control.icon" />
            </template>
          </n-button>
        </div>
      </div>
    </n-layout-header>
    <n-layout-content class="content">
      <router-view />
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, watch, Component } from "vue";
import { useRouter, useRoute } from "vue-router";
import { NMenu, NButton } from "naive-ui";
import { useTimerStore } from "@/stores/useTimerStore";
import { ArrowLeft24Filled, ArrowUp24Filled, ArrowDown24Filled, ArrowRight24Filled,Timer24Regular } from '@vicons/fluent';

const router = useRouter();
const route = useRoute();
const timerStore = useTimerStore();

const menuOptions = [
  { label: "首页", key: "/" },
  { label: "统计", key: "/statistics" },
  { label: "设置", key: "/settings" },
];

const current = ref(route.path);

type ViewKey = "pomodoro" | "schedule" | "today" | "task" | "activity";

interface ViewControl {
  key: ViewKey;
  icon: Component;
  title: string;
  show: boolean;
}

const buttonStates = ref<Record<ViewKey, boolean>>({
  pomodoro: false,
  schedule: false,
  today: false,
  task: false,
  activity: false,
});

watch(route, (newVal) => {
  current.value = newVal.path;
});

function handleMenuSelect(key: string) {
  if (key !== route.path) {
    router.push(key);
  }
}

const viewControls: ViewControl[] = [
  { key: "pomodoro", icon: Timer24Regular, title: "切换番茄钟视图", show: true },
  { key: "schedule", icon: ArrowLeft24Filled, title: "切换日程视图", show: true },
  { key: "today", icon: ArrowUp24Filled, title: "切换今日视图", show: true },
  { key: "task", icon: ArrowDown24Filled, title: "切换执行视图", show: true },
  { key: "activity", icon: ArrowRight24Filled, title: "切换活动视图", show: true },
];

// 按钮样式函数
function buttonStyle(show: boolean, key: ViewKey) {
  const isDisabled = key === "pomodoro" && timerStore.isActive;
  return {
    filter: show ? (isDisabled ? "grayscale(50%)" : "none") : "grayscale(100%)",
    opacity: show ? (isDisabled ? 0.4 : 1) : 0.6,
    backgroundColor: buttonStates.value[key]
      ? "var(--color-blue-light)"
      : "var(--color-background-light)",
    borderRadius: "4px",
    transition: "all 0.3s ease",
    cursor: isDisabled ? "not-allowed" : "pointer",
    transform: isDisabled ? "scale(0.95)" : "scale(1)",
  };
}

// 处理视图切换
function handleViewToggle(key: string) {
  // 如果是pomodoro视图且计时器正在运行，不允许切换
  if (key === "pomodoro" && timerStore.isActive) {
    return;
  }
  // 更新按钮状态
  buttonStates.value[key as ViewKey] = !buttonStates.value[key as ViewKey];
  // 发送自定义事件到window
  window.dispatchEvent(new CustomEvent("view-toggle", { detail: { key } }));
}
</script>

<style scoped>
.header {
  height: 5%;
  /* display: none; */
  display: flex;
  align-items: center;
  padding: 0 16px;
  background: var(--color-background);

  border-bottom: 1px solid var(--color-background-light);
  font-weight: bold;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.view-controls {
  display: flex;
  gap: 2px;
  align-items: center;
}

.content {
  overflow: auto;
  height: 95%;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
}

.layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
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
</style>
