<!--
  日视图吃饭：图=加一条 + 最后一条（时间/正餐甜点水果/刀叉记吃什么）；表保持完整编辑。
-->
<template>
  <LifeRecordDayFrame v-if="task" :view="view" compact :note-open="chartFoodOpen">
    <template #display>
      <div class="lr-chart">
        <button type="button" class="lr-chart__el lr-chart__icon" title="吃饭" @click="onAppleClick">
          <n-icon class="lr-chart__icon-glyph" color="var(--color-red)"><FoodApple20Filled /></n-icon>
        </button>
        <span class="lr-chart__el lr-chart__times" aria-hidden="true">×</span>
        <span class="lr-chart__el lr-chart__count">{{ records.length }}</span>
        <span class="lr-chart__el eat-day-chart__start" :title="lastRecord ? '时间 ' + lastStartLabel : ''">{{ lastStartLabel }}</span>
        <button
          type="button"
          class="lr-chart__el eat-day-chart__course"
          :title="eatCourseTitle(lastRecord?.eatCourse)"
          @click="lastRecord && toggleEatCourse(lastRecord)"
        >
          <n-icon class="eat-day-chart__ctrl-icon">
            <component :is="eatCourseIcon(lastRecord?.eatCourse)" />
          </n-icon>
        </button>
        <button
          type="button"
          class="lr-chart__el eat-day-chart__food"
          title="吃什么"
          @pointerdown="chartFoodOpen && $event.preventDefault()"
          @click="onFoodClick"
        >
          <n-icon class="eat-day-chart__ctrl-icon"><Food20Regular /></n-icon>
        </button>
        <input
          v-if="chartFoodOpen && lastRecord"
          ref="chartFoodRef"
          class="lr-chart__el eat-day-chart__input"
          :value="chartFoodDraft"
          placeholder="吃什么"
          @input="onChartFoodInput"
          @blur="onChartFoodBlur"
        />
      </div>
    </template>
    <template #table>
      <table class="lr-day-table lr-day-table--cols-4">
        <colgroup>
          <col class="lr-day-table__col-action" />
          <col class="lr-day-table__col-time" />
          <col class="lr-day-table__col-time" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th class="lr-day-table__col-action">
              <button type="button" class="lr-day-table__cell-btn" :title="`记一条${def.title}`" @click="append">
                <n-icon :size="18"><Add20Regular /></n-icon>
              </button>
            </th>
            <th class="lr-day-table__col-time" title="时间">
              <n-icon :size="18" class="lr-day-table__th-icon"><Clock20Regular /></n-icon>
            </th>
            <th class="lr-day-table__col-time" title="正餐 / 甜点 / 水果">
              <n-icon :size="18" class="lr-day-table__th-icon"><Food20Regular /></n-icon>
            </th>
            <th class="lr-day-table__col-last" title="吃了什么">
              <n-icon :size="18" color="var(--color-red)" class="lr-day-table__th-icon"><FoodApple20Filled /></n-icon>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in records" :key="record.id">
            <td class="lr-day-table__col-action">
              <button type="button" class="lr-day-table__cell-btn lr-day-table__cell-btn--danger" title="删除这条" @click="remove(record)">
                <n-icon :size="14"><Delete20Regular /></n-icon>
              </button>
            </td>
            <td class="lr-day-table__col-time">
              <n-time-picker
                class="lr-day-table__time"
                :value="pickerTs(record.recordedAt)"
                format="HH:mm"
                size="small"
                :show-icon="false"
                :bordered="false"
                @update:value="(ts: number | null) => changeRecordedAt(record, ts)"
              />
            </td>
            <td class="lr-day-table__col-time">
              <button
                type="button"
                class="lr-day-table__cell-btn"
                :title="eatCourseTitle(record.eatCourse)"
                @click="toggleEatCourse(record)"
              >
                <n-icon :size="18">
                  <component :is="eatCourseIcon(record.eatCourse)" />
                </n-icon>
              </button>
            </td>
            <td class="lr-day-table__col-last">
              <n-input
                class="lr-day-table__note"
                size="tiny"
                :bordered="false"
                :value="record.description ?? ''"
                placeholder="吃什么"
                @update:value="(v: string) => changeDescription(record, v)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </template>
  </LifeRecordDayFrame>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, watch, type Component } from "vue";
import { NIcon, NInput, NTimePicker } from "naive-ui";
import {
  Add20Regular,
  Clock20Regular,
  Delete20Regular,
  Food20Regular,
  FoodApple20Filled,
  FoodApple20Regular,
  FoodCake20Regular,
  FoodPizza20Regular,
} from "@vicons/fluent";
import type { EatCourse } from "@/core/types/Task";
import { timestampToTimeString } from "@/core/utils";
import { useLifeRecordEditor } from "@/composables/lifeRecord/useLifeRecordEditor";
import LifeRecordDayFrame from "@/components/LifeRecord/LifeRecordDayFrame.vue";
const props = withDefaults(defineProps<{ taskId: number; embedded?: boolean; view?: "chart" | "table" }>(), {
  view: "chart",
});
const { task, records, def, append, pickerTs, toggleEatCourse, changeRecordedAt, changeDescription, remove } = useLifeRecordEditor(
  () => props.taskId,
  "eat",
  { embedded: () => props.embedded },
);
const lastRecord = computed(() => records.value[records.value.length - 1] ?? null);
const lastStartLabel = computed(() => (lastRecord.value ? timestampToTimeString(lastRecord.value.recordedAt) : "—"));
function eatCourseTitle(course?: EatCourse): string {
  if (course === "dessert") return "甜点";
  if (course === "apple") return "水果";
  return "正餐";
}
function eatCourseIcon(course?: EatCourse): Component {
  if (course === "dessert") return FoodCake20Regular;
  if (course === "apple") return FoodApple20Regular;
  return FoodPizza20Regular;
}
const chartFoodOpen = ref(false);
const chartFoodDraft = ref("");
const chartFoodRef = ref<HTMLInputElement | null>(null);
watch(
  () => lastRecord.value?.id,
  () => {
    chartFoodOpen.value = false;
  },
);
watch(chartFoodOpen, async (open) => {
  if (!open) return;
  await nextTick();
  chartFoodRef.value?.focus();
});
function commitChartFood() {
  const last = lastRecord.value;
  if (!last) return;
  changeDescription(last, chartFoodDraft.value);
}
function onAppleClick() {
  if (chartFoodOpen.value) {
    commitChartFood();
    chartFoodOpen.value = false;
  }
  append();
}
function onFoodClick() {
  const last = lastRecord.value;
  if (!last) return;
  if (chartFoodOpen.value) {
    commitChartFood();
    chartFoodOpen.value = false;
    return;
  }
  chartFoodDraft.value = last.description ?? "";
  chartFoodOpen.value = true;
}
function onChartFoodInput(e: Event) {
  chartFoodDraft.value = (e.target as HTMLInputElement).value;
}
function onChartFoodBlur() {
  commitChartFood();
  chartFoodOpen.value = false;
}
</script>
<style src="./lifeRecordChart.css"></style>
<style src="./lifeRecordTable.css"></style>
<style scoped>
/* 下排锚点跟睡觉图 */
.eat-day-chart__start {
  left: calc(50% - var(--a) - 30px);
  top: calc(50% + var(--f) - 20px);
  font-size: 22px;
  font-weight: 500;
  font-family: Consolas, "Courier New", Courier, monospace;
  color: var(--color-text-primary);
  white-space: nowrap;
}
.eat-day-chart__course {
  left: 50%;
  top: calc(50% + var(--f) - 20px);
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary);
  cursor: pointer;
}
.eat-day-chart__food {
  left: calc(50% + var(--c) + 15px);
  top: calc(50% + var(--f) - 20px);
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary);
  cursor: pointer;
}
.eat-day-chart__course:hover,
.eat-day-chart__food:hover {
  opacity: 0.85;
}
.eat-day-chart__ctrl-icon {
  display: block;
  width: 28px;
  height: 28px;
  font-size: 28px;
  line-height: 0;
  color: inherit;
}
.eat-day-chart__ctrl-icon :deep(svg) {
  width: 1em;
  height: 1em;
  display: block;
}
.eat-day-chart__input {
  left: 50%;
  top: calc(50% + var(--f) + 22px);
  width: calc(var(--a) + var(--c) + var(--icon-size));
  transform: translate(-50%, 0);
  padding: 2px 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: var(--color-text-primary);
  font-size: 16px;
  line-height: 1.4;
  text-align: center;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
}
</style>
