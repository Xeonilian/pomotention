<!--
  日视图吃饭：左展示 + 右表。展示内容先占位，尺寸走 LifeRecordDayFrame。
-->
<template>
  <LifeRecordDayFrame v-if="task">
    <template #toolbar>
      <n-button v-if="records.length === 0" text size="small" class="lr-icon-btn" title="删除空记录" @click="discard">
        <template #icon>
          <n-icon :size="18"><Delete20Regular /></n-icon>
        </template>
      </n-button>
      <n-button text size="small" class="lr-icon-btn" title="关闭" @click="deselect">
        <template #icon>
          <n-icon :size="18"><Dismiss20Regular /></n-icon>
        </template>
      </n-button>
    </template>

    <template #display>
      <button type="button" class="eat-day-display__append" :title="`记一条${def.title}`" @click="append">
        <n-icon :size="48"><FoodApple20Regular /></n-icon>
      </button>
      <span class="eat-day-display__count">×{{ records.length }}</span>
    </template>

    <template #table>
      <table class="eat-day-table">
        <colgroup>
          <col class="eat-day-table__col-action" />
          <col class="eat-day-table__col-time" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th class="eat-day-table__col-action">
              <button type="button" class="eat-day-table__cell-btn" :title="`记一条${def.title}`" @click="append">
                <n-icon :size="14"><Add20Regular /></n-icon>
              </button>
            </th>
            <th class="eat-day-table__col-time">time</th>
            <th>吃了什么</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in records" :key="record.id">
            <td class="eat-day-table__col-action">
              <button type="button" class="eat-day-table__cell-btn eat-day-table__cell-btn--danger" title="删除这条" @click="remove(record)">
                <n-icon :size="14"><Delete20Regular /></n-icon>
              </button>
            </td>
            <td class="eat-day-table__col-time">
              <n-time-picker
                class="eat-day-table__time"
                :value="record.recordedAt"
                format="HH:mm"
                size="small"
                :show-icon="false"
                :bordered="false"
                @update:value="(ts: number | null) => changeRecordedAt(record, ts)"
              />
            </td>
            <td>
              <n-input
                class="eat-day-table__desc"
                size="tiny"
                :value="record.description ?? ''"
                placeholder="可选"
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
import { NButton, NIcon, NInput, NTimePicker } from "naive-ui";
import { Add20Regular, Delete20Regular, Dismiss20Regular, FoodApple20Regular } from "@vicons/fluent";
import { useLifeRecordEditor } from "@/composables/lifeRecord/useLifeRecordEditor";
import LifeRecordDayFrame from "@/components/LifeRecord/LifeRecordDayFrame.vue";

const props = defineProps<{ taskId: number }>();
const { task, records, def, append, changeRecordedAt, changeDescription, remove, discard, deselect } = useLifeRecordEditor(
  () => props.taskId,
  "eat",
);
</script>

<style scoped>
.lr-icon-btn {
  width: 28px;
  min-width: 28px;
  height: 28px;
  padding: 0 !important;
}
.lr-icon-btn :deep(.n-button__icon) {
  margin: 0;
}
.eat-day-display__append {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  color: inherit;
}
.eat-day-display__count {
  font-size: 30px;
  font-weight: 500;
  line-height: 1;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}
.eat-day-table {
  border-collapse: collapse;
  font-size: 12px;
  width: 100%;
  table-layout: fixed;
}
.eat-day-table th,
.eat-day-table td {
  padding: 0 4px;
  border: none;
  vertical-align: middle;
  overflow: hidden;
  box-sizing: border-box;
  height: 28px;
}
.eat-day-table thead th {
  border-bottom: 1px solid var(--color-text-secondary-transparent);
  color: var(--color-text-secondary);
  font-weight: 500;
  position: sticky;
  top: 0;
  background: var(--color-background);
  z-index: 1;
}
.eat-day-table__col-action {
  width: 28px;
  padding-left: 0;
  padding-right: 0;
  text-align: center;
}
.eat-day-table__col-time {
  width: 56px;
  text-align: left;
}
.eat-day-table__cell-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  line-height: 0;
  vertical-align: middle;
}
.eat-day-table__cell-btn--danger {
  color: var(--color-red-dark);
}
.eat-day-table__time {
  width: 44px;
  max-width: 100%;
}
.eat-day-table__time :deep(.n-input) {
  --n-height: 22px !important;
  --n-padding-left: 0 !important;
  --n-padding-right: 0 !important;
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
  background: transparent !important;
  font-weight: 600;
  font-size: 12px;
}
.eat-day-table__time :deep(.n-base-suffix),
.eat-day-table__time :deep(.n-input__suffix) {
  display: none !important;
  width: 0 !important;
}
.eat-day-table__desc :deep(.n-input) {
  --n-height: 22px !important;
  --n-padding-left: 0 !important;
  --n-padding-right: 0 !important;
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
  background: transparent !important;
  font-size: 12px;
}
.eat-day-table__desc :deep(.n-input__input-el) {
  padding: 0;
}
</style>
