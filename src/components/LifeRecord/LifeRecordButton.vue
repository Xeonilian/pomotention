<!-- LifeRecordButton.vue -->
<!-- 单按钮：日=AppsAddIn/ChannelAdd（无记录/有记录）→进入集中 sheet；非日=Apps20Regular/Filled→生活可视化开关 -->
<template>
  <!-- 日：进入集中生活 sheet，只换 task 区（今日图 / 过往表） -->
  <n-button
    v-if="isDayView"
    size="small"
    text
    class="life-record-button"
    :class="{ 'life-record-button--active': layerStore.daySheetOpen }"
    title="生活记录"
    @click.stop="onOpenDaySheet"
  >
    <template #icon>
      <n-icon :size="18"><component :is="layerStore.currentDayHasLifeRecord ? ChannelAdd20Regular : AppsAddIn20Regular" /></n-icon>
    </template>
  </n-button>

  <!-- 非日：切到生活可视化；再按关 -->
  <n-button
    v-else
    size="small"
    text
    class="life-record-button"
    :class="{ 'life-record-button--active': layerStore.lifeView }"
    title="生活可视化"
    @click.stop="onAggregateAll"
  >
    <template #icon>
      <n-icon :size="18"><component :is="layerStore.lifeView ? Apps20Filled : Apps20Regular" /></n-icon>
    </template>
  </n-button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NButton, NIcon } from "naive-ui";
import { AppsAddIn20Regular, Apps20Regular, Apps20Filled, ChannelAdd20Regular } from "@vicons/fluent";
import type { LifeRecordKind } from "@/core/lifeRecord";
import { useSettingStore } from "@/stores/useSettingStore";
import { useLifePlannerLayerStore } from "@/stores/useLifePlannerLayerStore";

const settingStore = useSettingStore();
const layerStore = useLifePlannerLayerStore();

const isDayView = computed(() => settingStore.settings.viewSet === "day");

const emit = defineEmits<{ recorded: [kind: LifeRecordKind] }>();

/** 日：进入集中生活 sheet——一次性建/取 4 类当天桶 */
function onOpenDaySheet() {
  // 集中 sheet 即 task 区内容，确保 task 区可见
  settingStore.settings.showTask = true;
  layerStore.openDaySheet();
  emit("recorded", "drink");
}

/** 非日：开/关生活可视化 */
function onAggregateAll() {
  layerStore.toggleLifeView();
  emit("recorded", "drink");
}
</script>

<style scoped>
.life-record-button {
  width: 18px;
  min-width: 18px;
  height: 18px;
  padding: 0 !important;
}

.life-record-button :deep(.n-button__icon) {
  margin: 0;
}

/* 开态强调 */
.life-record-button--active {
  color: var(--color-blue);
}
</style>
