<!--
  日视图吃饭：图/表尺寸走 LifeRecordDayFrame。
-->
<template>
  <LifeRecordDayFrame v-if="task" :view="view">
    <template #display>
      <div class="lr-chart">
        <button type="button" class="lr-chart__el lr-chart__icon" :title="`记一条${def.title}`" @click="append">
          <n-icon class="lr-chart__icon-glyph" color="var(--color-red)"><FoodApple20Filled /></n-icon>
        </button>
        <span class="lr-chart__el lr-chart__times" aria-hidden="true">×</span>
        <span class="lr-chart__el lr-chart__count">{{ records.length }}</span>
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
            <th class="lr-day-table__col-time" title="正餐或甜点">
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
                :title="record.eatCourse === 'dessert' ? '甜点' : '正餐'"
                @click="toggleEatCourse(record)"
              >
                <n-icon :size="18">
                  <FoodCake20Regular v-if="record.eatCourse === 'dessert'" />
                  <FoodPizza20Regular v-else />
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
import { NIcon, NInput, NTimePicker } from "naive-ui";
import {
  Add20Regular,
  Clock20Regular,
  Delete20Regular,
  Food20Regular,
  FoodCake20Regular,
  FoodPizza20Regular,
  FoodApple20Filled,
} from "@vicons/fluent";
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
</script>
<style src="./lifeRecordChart.css"></style>
<style src="./lifeRecordTable.css"></style>
