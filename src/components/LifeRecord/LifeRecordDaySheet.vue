<!--
  LifeRecordDaySheet.vue
  day 集中生活 sheet：4 类日面板 2×2 同框，作为一个整体。
  无标题/无格边框/无内部 × 与单独删除；顶栏仅「图/表」切换与一个退出 ×。
  各面板按 kind 自己的当天桶 taskId 渲染，互不依赖全局选中。
-->
<template>
  <div class="life-day-sheet">
    <div class="life-day-sheet__bar">
      <n-button
        text
        size="small"
        class="life-day-sheet__icon"
        :class="{ 'life-day-sheet__toggle--table': view === 'table' }"
        :title="view === 'table' ? '显示图' : '显示表格'"
        @click="toggleView"
      >
        <template #icon>
          <n-icon :size="18"><TableEdit20Regular /></n-icon>
        </template>
      </n-button>
      <n-button text size="small" class="life-day-sheet__icon" title="关闭" @click="emit('close')">
        <template #icon>
          <n-icon :size="18"><Dismiss20Regular /></n-icon>
        </template>
      </n-button>
    </div>
    <div class="life-day-sheet__grid">
      <div class="life-day-sheet__cell">
        <DrinkDayPanel v-if="taskIds.drink != null" :task-id="taskIds.drink" :view="view" embedded />
      </div>
      <div class="life-day-sheet__cell">
        <EatDayPanel v-if="taskIds.eat != null" :task-id="taskIds.eat" :view="view" embedded />
      </div>
      <div class="life-day-sheet__cell">
        <ToiletDayPanel v-if="taskIds.toilet != null" :task-id="taskIds.toilet" :view="view" embedded />
      </div>
      <div class="life-day-sheet__cell">
        <SleepDayPanel v-if="taskIds.sleep != null" :task-id="taskIds.sleep" :view="view" embedded />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { NButton, NIcon } from "naive-ui";
import { Dismiss20Regular, TableEdit20Regular } from "@vicons/fluent";
import DrinkDayPanel from "@/components/LifeRecord/DrinkDayPanel.vue";
import EatDayPanel from "@/components/LifeRecord/EatDayPanel.vue";
import ToiletDayPanel from "@/components/LifeRecord/ToiletDayPanel.vue";
import SleepDayPanel from "@/components/LifeRecord/SleepDayPanel.vue";
import type { LifeRecordKind } from "@/core/lifeRecord";

defineProps<{ taskIds: Record<LifeRecordKind, number | null> }>();
const emit = defineEmits<{ close: [] }>();

const view = ref<"chart" | "table">("chart");

function toggleView() {
  view.value = view.value === "chart" ? "table" : "chart";
}
</script>

<style scoped>
.life-day-sheet {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 2px;
}

/* 图/表切换在关闭 × 左边，无标题 */
.life-day-sheet__bar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  height: 22px;
  gap: 2px;
}

.life-day-sheet__icon {
  width: 24px;
  min-width: 24px;
  height: 24px;
  padding: 0 !important;
}
.life-day-sheet__icon :deep(.n-button__icon) {
  margin: 0;
}

/* 表格态：按钮着色，便于看出当前在表 */
.life-day-sheet__toggle--table {
  color: var(--color-blue);
}

.life-day-sheet__grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
}

/* 整体一格：无边框、无自身滚动；内部面板自管布局 */
.life-day-sheet__cell {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

@media (max-width: 480px) {
  .life-day-sheet__grid {
    gap: 1px;
  }
}
</style>
