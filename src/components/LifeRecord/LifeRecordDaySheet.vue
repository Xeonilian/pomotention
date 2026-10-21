<!--
  LifeRecordDaySheet.vue
  day 集中生活 sheet：4 类日面板 2×2 同框，作为一个整体。
  无标题/无格边框/无内部 × 与单独删除；顶栏「图/表」与退出 ×。无桶时只留 × 和新建提示。
  各面板按 kind 自己的当天桶 taskId 渲染，互不依赖全局选中。
-->
<template>
  <div ref="sheetRef" class="life-day-sheet" :class="{ 'life-day-sheet--mobile': isMobile, 'life-day-sheet--table': view === 'table' }">
    <div class="life-day-sheet__bar">
      <n-button v-if="!isEmpty" text size="small" class="life-day-sheet__icon" :title="view === 'table' ? '显示图' : '显示表格'" @click="toggleView">
        <template #icon>
          <n-icon :size="18">
            <component :is="view === 'table' ? DataPie20Regular : TableSimple20Regular" />
          </n-icon>
        </template>
      </n-button>
      <n-button text size="small" class="life-day-sheet__icon" title="关闭" @click="emit('close')">
        <template #icon>
          <n-icon :size="18"><Dismiss20Regular /></n-icon>
        </template>
      </n-button>
    </div>
    <div v-if="isEmpty" class="life-day-sheet__empty">
      <n-button text class="life-day-sheet__hint" title="新建生活记录" @click="emit('create')">
        <template #icon>
          <n-icon :size="20"><AppsAddIn20Regular /></n-icon>
        </template>
        新建生活记录
      </n-button>
    </div>
    <div v-else class="life-day-sheet__grid">
      <div v-if="taskIds.drink != null" class="life-day-sheet__cell">
        <DrinkDayPanel :task-id="taskIds.drink" :view="view" embedded />
      </div>
      <div v-if="taskIds.eat != null" class="life-day-sheet__cell">
        <EatDayPanel :task-id="taskIds.eat" :view="view" embedded />
      </div>
      <div v-if="taskIds.toilet != null" class="life-day-sheet__cell life-day-sheet__cell--gap">
        <ToiletDayPanel :task-id="taskIds.toilet" :view="view" embedded />
      </div>
      <div v-if="taskIds.sleep != null" class="life-day-sheet__cell life-day-sheet__cell--gap">
        <SleepDayPanel :task-id="taskIds.sleep" :view="view" embedded />
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NButton, NIcon } from "naive-ui";
import { AppsAddIn20Regular, DataPie20Regular, Dismiss20Regular, TableSimple20Regular } from "@vicons/fluent";
import DrinkDayPanel from "@/components/LifeRecord/DrinkDayPanel.vue";
import EatDayPanel from "@/components/LifeRecord/EatDayPanel.vue";
import ToiletDayPanel from "@/components/LifeRecord/ToiletDayPanel.vue";
import SleepDayPanel from "@/components/LifeRecord/SleepDayPanel.vue";
import { useDevice } from "@/composables/platform/useDevice";
import { useMobileInputScroll } from "@/composables/lifeRecord/useMobileInputScroll";
import type { LifeRecordKind } from "@/core/lifeRecord";
const props = withDefaults(
  defineProps<{
    taskIds: Record<LifeRecordKind, number | null>;
    /** 换天时用来把图/表定回当天规则，避免沿用上一天 */
    dayStart?: number;
    /** 当天图，其余表 */
    initialView?: "chart" | "table";
  }>(),
  { initialView: "chart" },
);
const emit = defineEmits<{ close: []; create: []; "view-change": [view: "chart" | "table"]; "input-active": [active: boolean] }>();
const isEmpty = computed(
  () => props.taskIds.drink == null && props.taskIds.eat == null && props.taskIds.toilet == null && props.taskIds.sleep == null,
);
const { isMobile } = useDevice();
const sheetRef = ref<HTMLElement | null>(null);
useMobileInputScroll(sheetRef, (active) => emit("input-active", active));
const view = ref<"chart" | "table">(props.initialView);
watch(view, (v) => emit("view-change", v), { immediate: true });
/** 换天才改模式：当天图、过去表，并回到顶部，避免手机上停在上一天的滚动位置 */
watch(
  () => props.dayStart,
  () => {
    view.value = props.initialView;
    const grid = sheetRef.value?.querySelector<HTMLElement>(".life-day-sheet__grid");
    if (!grid) return;
    grid.scrollTop = 0;
    grid.style.paddingBottom = "";
  },
);
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
.life-day-sheet__empty {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.life-day-sheet__hint {
  color: var(--color-text-secondary);
  gap: 6px;
}
/* 表格态：整体相对左侧多 6px（与左侧区域留白） */
.life-day-sheet--table:not(.life-day-sheet--mobile) {
  padding-left: 6px;
}
/* 桌面 2×2：两行等高，占满剩余高度 */
.life-day-sheet__grid {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  gap: 2px;
}
.life-day-sheet__cell {
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}
.life-day-sheet__cell > * {
  height: 100%;
  min-height: 0;
  min-width: 0;
}
.life-day-sheet--mobile .life-day-sheet__grid {
  --lr-sheet-compact-stack-gap: 20px;
  display: flex;
  flex-direction: column;
  grid-template-rows: none;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable both-edges;
  -webkit-overflow-scrolling: touch;
  gap: 4px;
}
.life-day-sheet--mobile .life-day-sheet__cell {
  flex: 0 0 auto;
  height: auto;
  max-height: none;
  overflow: visible;
}
/* 无圆圈的活动/睡：前面已有格子时才加距，缺类不留空档 */
.life-day-sheet--mobile .life-day-sheet__cell--gap:not(:first-child) {
  margin-top: var(--lr-sheet-compact-stack-gap);
}
</style>
