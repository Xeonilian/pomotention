<template>
  <div class="settings-entry-page">
    <n-tabs v-model:value="tab" type="line" animated size="small" class="settings-tabs">
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
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { NTabs, NTabPane } from "naive-ui";
import SettingGeneralTab from "@/components/setting/SettingGeneralTab.vue";
import SettingPomoTab from "@/components/setting/SettingPomoTab.vue";
import SettingShortcutTab from "@/components/setting/SettingShortcutTab.vue";
import SettingDebugTab from "@/components/setting/SettingDebugTab.vue";

const tab = ref("general");
</script>

<style scoped>
.settings-entry-page {
  box-sizing: border-box;
  max-width: 900px;
  width: 92%;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  padding: 8px 10px 20px;
  display: flex;
  flex-direction: column;
}
.settings-tabs {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.settings-tabs :deep(.n-tabs-nav) {
  flex-shrink: 0;
}
.settings-tabs :deep(.n-tabs-pane-wrapper) {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
</style>
