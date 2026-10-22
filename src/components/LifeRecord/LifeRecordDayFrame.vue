<!--
  日面板骨架：sheet 单格。图/表互斥，尺寸由本组件统一。
-->
<template>
  <div class="lr-day" :class="{ 'lr-day--mobile': isMobile, 'lr-day--compact': compact, 'lr-day--note-open': noteOpen }">
    <div class="lr-day__body">
      <div v-if="view === 'chart'" class="lr-day__display">
        <slot name="display" />
      </div>
      <div v-if="view === 'chart'" class="lr-day__after-chart">
        <slot name="after-chart" />
      </div>
      <div v-if="view === 'table'" class="lr-day__table">
        <slot name="table" />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { useDevice } from "@/composables/platform/useDevice";
withDefaults(defineProps<{ view?: "chart" | "table"; compact?: boolean; noteOpen?: boolean }>(), {
  view: "chart",
  compact: false,
  noteOpen: false,
});
const { isMobile } = useDevice();
</script>
<style scoped>
.lr-day {
  --lr-day-display: 400px;
  --lr-day-table-w: 400px;
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 2px 0 0;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
}
.lr-day__body {
  flex: 1 1 0%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0;
  overflow: hidden;
  container-type: size;
}
.lr-day__display {
  /* 格内最大正方形，避免 2×2 压扁后百分比锚点散掉 */
  width: min(var(--lr-day-display), 100cqw, 100cqh);
  height: min(var(--lr-day-display), 100cqw, 100cqh);
  flex: 0 0 auto;
  box-sizing: border-box;
  display: flex;
}
.lr-day__table {
  width: var(--lr-day-table-w);
  max-width: 100%;
  align-self: center;
  flex: 1 1 0%;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
}
.lr-day--mobile {
  --lr-day-display: 60vw;
  height: auto;
  overflow: visible;
}
.lr-day--mobile .lr-day__body {
  flex: 0 0 auto;
  min-height: auto;
  overflow: visible;
  justify-content: flex-start;
  container-type: normal;
}
.lr-day--mobile .lr-day__display {
  width: var(--lr-day-display);
  height: var(--lr-day-display);
}
.lr-day__after-chart:empty {
  display: none;
}
.lr-day--mobile .lr-day__after-chart {
  align-self: stretch;
  width: 100%;
}
/* 手机裁掉上下空白；图标贴上沿、备注贴下沿，格距不再被正方形中心裁切开大 */
.lr-day--mobile.lr-day--compact {
  --lr-day-compact-h: calc(0.4 * var(--lr-day-display) + 40px);
}
.lr-day--mobile.lr-day--compact .lr-day__display {
  height: var(--lr-day-compact-h);
  /* 备注条常驻，超出高度往下露，不裁掉 */
  overflow: visible;
  position: relative;
}
.lr-day--mobile.lr-day--compact .lr-day__display :deep(.lr-chart) {
  position: absolute;
  left: 0;
  top: calc(25px - 0.28 * var(--lr-day-display));
  width: var(--lr-day-display);
  height: var(--lr-day-display);
  transform: none;
  flex: none;
}
.lr-day--mobile .lr-day__table {
  width: var(--lr-day-table-w);
  max-width: 100%;
  height: auto;
  min-height: calc(28px + 2 * 28px);
  overflow: visible;
}
</style>
