<template>
  <n-space vertical size="large" class="settings-entry-page">
    <n-tabs v-model:value="tab" type="line" animated size="small">
      <n-tab-pane name="general" tab="通用信息">
        <SettingGeneralTab />
      </n-tab-pane>
      <n-tab-pane name="pomo" tab="番茄时钟参数">
        <SettingPomoTab />
      </n-tab-pane>
      <n-tab-pane name="shortcuts" tab="快捷键映射">
        <SettingShortcutTab />
      </n-tab-pane>
      <n-tab-pane name="debug" tab="调试与诊断">
        <SettingDebugTab />
      </n-tab-pane>
    </n-tabs>
  </n-space>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { NSpace, NTabs, NTabPane } from "naive-ui";
import SettingGeneralTab from "@/components/setting/SettingGeneralTab.vue";
import SettingPomoTab from "@/components/setting/SettingPomoTab.vue";
import SettingShortcutTab from "@/components/setting/SettingShortcutTab.vue";
import SettingDebugTab from "@/components/setting/SettingDebugTab.vue";

const tab = ref("general");
</script>

<style scoped>
.settings-entry-page {
  max-width: 900px;
  width: 92%;
  height: 100%;
  margin: 10px auto;
  padding: 8px 10px 20px;
}
</style>
