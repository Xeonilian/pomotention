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
            size="small"
            circle
            secondary
            strong
            type="info"
            :style="buttonStyle(control.show)"
            :title="control.title"
            @click="handleViewToggle(control.key)"
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
watch(route, (newVal) => {
  current.value = newVal.path;
});

function handleMenuSelect(key: string) {
  if (key !== route.path) {
    router.push(key);
  }
}

// 视图控制按钮配置
const viewControls = [
  { key: "pomodoro", icon: "⏰", title: "切换番茄钟视图", show: true },
  { key: "schedule", icon: "🗓️", title: "切换日程视图", show: true },
  { key: "activity", icon: "📋", title: "切换活动视图", show: true },
  { key: "task", icon: "🖊️", title: "切换执行视图", show: true },
  { key: "pomoSeq", icon: "📝", title: "切换番茄序列视图", show: true },
];

// 按钮样式函数
function buttonStyle(show: boolean) {
  return {
    filter: show ? "none" : "grayscale(100%)",
    opacity: show ? 1 : 0.6,
  };
}

// 处理视图切换
function handleViewToggle(key: string) {
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
  gap: 8px;
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
</style>
