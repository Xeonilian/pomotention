<!-- 四象限壳：标题 + 边框 + data-quadrant 供拖拽投放命中 -->
<template>
  <div class="activity-quadrant" :data-quadrant="quadrantKey" :style="{ gridArea }">
    <div class="activity-quadrant__title">{{ title }}</div>
    <div class="activity-quadrant__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ActivityQuadrantKey } from "@/core/activityQuadrant";

defineProps<{
  title: string;
  quadrantKey: ActivityQuadrantKey;
  /** CSS grid-area 名称，由父级 grid-template-areas 定义 */
  gridArea: string;
}>();
</script>

<style scoped>
.activity-quadrant {
  display: flex;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
  border: 1px solid rgba(128, 128, 128, 0.35);
  border-radius: 8px;
  background: rgba(128, 128, 128, 0.06);
  overflow: hidden;
}

.activity-quadrant__title {
  flex-shrink: 0;
  padding: 6px 8px;
  font-size: 12px;
  font-weight: 600;
  border-bottom: 1px solid rgba(128, 128, 128, 0.22);
}

.activity-quadrant__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
