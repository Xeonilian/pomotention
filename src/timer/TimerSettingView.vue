<template>
  <div class="timer-settings-page">
    <div class="timer-settings-header">
      <n-button text title="返回计时器" @click="goBack">
        <template #icon>
          <n-icon :component="ArrowLeft24Regular" />
        </template>
      </n-button>
      <span class="timer-settings-title">番茄时钟设置</span>
    </div>
    <SettingPomoTab />
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
.timer-settings-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 12px 16px 24px;
  height: 100%;
  overflow: auto;
  box-sizing: border-box;
}
.timer-settings-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.timer-settings-title {
  font-weight: 600;
}
</style>
