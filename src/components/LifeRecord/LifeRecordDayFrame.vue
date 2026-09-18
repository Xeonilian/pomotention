<!--
  日面板骨架：展示区与表并排，窄屏或手机改为上下。喝水/睡觉日面板未接入。
-->
<template>
  <div class="lr-day" :class="{ 'lr-day--mobile': isMobile }">
    <div class="lr-day__toolbar">
      <slot name="toolbar" />
    </div>
    <div class="lr-day__body">
      <div class="lr-day__display">
        <slot name="display" />
      </div>
      <div class="lr-day__table">
        <slot name="table" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDevice } from "@/composables/platform/useDevice";

const { isMobile } = useDevice();
</script>

<style scoped>
.lr-day {
  --lr-day-display: 300px;
  --lr-day-table-w: 200px;
  --lr-day-head-h: 28px;
  --lr-day-row-h: 28px;
  --lr-day-table-h: calc(var(--lr-day-head-h) + 8 * var(--lr-day-row-h));

  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 2px 0 0;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
  container-type: inline-size;
  container-name: lr-day;
}

.lr-day--mobile {
  --lr-day-display: 78vw;
  --lr-day-table-w: 90vw;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.lr-day__toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.lr-day__body {
  flex: 1 1 0%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  align-content: center;
  gap: 24px 40px;
  overflow: hidden;
}

.lr-day--mobile .lr-day__body {
  flex: 0 0 auto;
  min-height: auto;
  overflow: visible;
  flex-wrap: nowrap;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  align-content: flex-start;
  gap: 16px;
}

.lr-day__display {
  width: var(--lr-day-display);
  height: var(--lr-day-display);
  flex: 0 0 var(--lr-day-display);
  border-radius: 50%;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 0;
}

.lr-day__table {
  flex: 0 0 auto;
  width: var(--lr-day-table-w);
  max-width: 100%;
  height: var(--lr-day-table-h);
  min-height: 0;
  overflow: auto;
  scrollbar-gutter: stable;
}

.lr-day--mobile .lr-day__table {
  width: var(--lr-day-table-w);
  max-width: 90vw;
}

@container lr-day (max-width: 460px) {
  .lr-day__body {
    flex-wrap: nowrap;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    align-content: flex-start;
  }
}
</style>
