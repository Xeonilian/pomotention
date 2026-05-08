<!-- 四象限壳：可编辑标题 + data-quadrant + 列表 slot -->
<template>
  <div class="activity-quadrant" :data-quadrant="quadrantKey" :style="{ gridArea }">
    <div class="activity-quadrant__title">
      <n-input
        size="small"
        :bordered="false"
        :value="settingStore.settings.kanbanQuadrantUi[quadrantKey]"
        :placeholder="DEFAULT_KANBAN_QUADRANT_UI_LABELS[quadrantKey]"
        class="activity-quadrant__title-input"
        @update:value="onTitleUpdate"
      />
    </div>
    <div class="activity-quadrant__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NInput } from "naive-ui";
import type { ActivityQuadrantKey } from "@/core/activityQuadrant";
import { DEFAULT_KANBAN_QUADRANT_UI_LABELS } from "@/core/activityQuadrant";
import { useSettingStore } from "@/stores/useSettingStore";

const props = defineProps<{
  quadrantKey: ActivityQuadrantKey;
  gridArea: string;
}>();

const settingStore = useSettingStore();

function onTitleUpdate(val: string) {
  settingStore.settings.kanbanQuadrantUi[props.quadrantKey] = val;
}
</script>

<style scoped>
.activity-quadrant {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background: var(--color-background);
  border-radius: 8px;
  border: 1px solid var(--color-background-dark);
  box-shadow: none;
}

.activity-quadrant__title {
  flex-shrink: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2px 0px;
  width: 100%;
}

.activity-quadrant__title-input {
  width: 100%;
  max-width: 100%;
  height: 24px;
}

.activity-quadrant__title-input :deep(.n-input__input-el) {
  font-size: 12px;
  font-weight: 500;
  text-align: left;
  --n-text-color: var(--color-text-secondary);
  --n-font-size: 12px;
}

.activity-quadrant__title-input :deep(.n-input-wrapper) {
  border: none !important;
  box-shadow: none !important;
  background: transparent !important;
}

.activity-quadrant__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  /* 与标题区左右 padding 对齐，避免列表行视觉窄一截 */
  padding: 0 6px;
  box-sizing: border-box;
  min-width: 0;
}
</style>
