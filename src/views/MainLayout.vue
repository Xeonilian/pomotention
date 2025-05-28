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
            {{ control.icon }}
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
import { ref, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { NMenu, NButton } from "naive-ui";

const router = useRouter();
const route = useRoute();

const menuOptions = [
  { label: "首页", key: "/" },
  { label: "统计", key: "/statistics" },
  { label: "设置", key: "/settings" },
];

const current = ref(route.path);

type ViewKey = "pomodoro" | "schedule" | "today" | "task" | "activity";

interface ViewControl {
  key: ViewKey;
  icon: string;
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
  { key: "pomodoro", icon: "⏰", title: "切换番茄钟视图", show: true },
  { key: "schedule", icon: "🗓️", title: "切换日程视图", show: true },
  { key: "today", icon: "📅", title: "切换今日视图", show: true },
  { key: "task", icon: "🖊️", title: "切换执行视图", show: true },
  { key: "activity", icon: "📋", title: "切换活动视图", show: true },
];

// 按钮样式函数
function buttonStyle(show: boolean, key: ViewKey) {
  return {
    filter: show ? "none" : "grayscale(100%)",
    opacity: show ? 1 : 0.6,
    backgroundColor: buttonStates.value[key] ? "#e6f4ff" : "#f5f5f5",
    borderRadius: "4px",
    transition: "background-color 0.3s ease",
  };
}

// 处理视图切换
function handleViewToggle(key: ViewKey) {
  buttonStates.value[key] = !buttonStates.value[key]; // 切换按钮状态
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
  background: #fff;
  color: #000;
  border-bottom: 1px solid #eee;
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
