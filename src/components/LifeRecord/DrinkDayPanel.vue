<!--
  日视图喝水：圆水位 + 表（时间 / 毫升 / 喝了什么）。尺寸走 LifeRecordDayFrame。
-->
<template>
  <LifeRecordDayFrame v-if="task" :view="view">
    <template #display>
      <!-- 圆水位；六元钉在 a/c/d/f 交点 -->
      <div class="drink-day-gauge" :title="`${drunkMl} / ${dayGoalMl || '—'} ml`">
        <DrinkDayWaterFill class="drink-day-gauge__fill" :ratio="progressRatio" :met="goalMet" />
        <button type="button" class="drink-day-gauge__el drink-day-gauge__drop" title="喝水" @click="append">
          <n-icon class="drink-day-gauge__drop-icon" color="var(--color-blue-drop)">
            <Drop20Filled />
          </n-icon>
        </button>
        <span class="drink-day-gauge__el drink-day-gauge__times" aria-hidden="true">×</span>
        <span class="drink-day-gauge__el drink-day-gauge__count">{{ records.length }}</span>
        <span class="drink-day-gauge__el drink-day-gauge__sum">{{ drunkMl }}</span>
        <span class="drink-day-gauge__el drink-day-gauge__slash" aria-hidden="true">/</span>
        <n-input-number
          class="drink-day-gauge__el drink-day-gauge__goal"
          size="tiny"
          :value="dayGoalMl"
          :min="100"
          :max="5000"
          :step="100"
          :precision="0"
          :show-button="false"
          title="今日目标（仅本天）"
          @update:value="onChangeDayGoal"
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
              <button type="button" class="lr-day-table__cell-btn" title="记一杯" @click="append">
                <n-icon :size="18"><Add20Regular /></n-icon>
              </button>
            </th>
            <th class="lr-day-table__col-time" title="时间">
              <n-icon :size="18" class="lr-day-table__th-icon"><Clock20Regular /></n-icon>
            </th>
            <th class="lr-day-table__col-time">
              <div class="drink-day-table__cup-head" title="杯量（之后每次 +1）">
                <n-input-number
                  class="drink-day-table__cup-head-ml"
                  size="tiny"
                  :bordered="false"
                  :value="settingStore.settings.drinkCupMl"
                  :min="50"
                  :max="1000"
                  :step="50"
                  :precision="0"
                  :show-button="false"
                  @update:value="onChangeCupMl"
                />
                <span class="drink-day-table__cup-head-unit">ml</span>
              </div>
            </th>
            <th class="lr-day-table__col-last" title="喝什么">
              <n-icon :size="18" color="var(--color-blue)" class="lr-day-table__th-icon"><Drop20Filled /></n-icon>
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
              <n-input-number
                class="drink-day-table__ml"
                size="tiny"
                :bordered="false"
                :value="record.amountMl ?? null"
                :min="10"
                :max="2000"
                :step="10"
                :precision="0"
                :show-button="false"
                @update:value="(v: number | null) => onChangeAmount(record, v)"
              />
            </td>
            <td class="lr-day-table__col-last">
              <n-input
                class="lr-day-table__note"
                size="tiny"
                :bordered="false"
                :value="record.description ?? ''"
                placeholder="喝什么"
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
import { computed } from "vue";
import { NIcon, NInput, NInputNumber, NTimePicker } from "naive-ui";
import { Add20Regular, Clock20Regular, Delete20Regular, Drop20Filled } from "@vicons/fluent";
import type { LifeRecord } from "@/core/types/Task";
import { isDrinkGoalMet, sumLifeRecordAmountMl, updateLifeRecord } from "@/services/lifeRecord/lifeRecordService";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useLifeRecordEditor } from "@/composables/lifeRecord/useLifeRecordEditor";
import DrinkDayWaterFill from "@/components/MonthPlanner/DrinkDayWaterFill.vue";
import LifeRecordDayFrame from "@/components/LifeRecord/LifeRecordDayFrame.vue";
const props = withDefaults(defineProps<{ taskId: number; embedded?: boolean; view?: "chart" | "table" }>(), {
  view: "chart",
});
const dataStore = useDataStore();
const settingStore = useSettingStore();
const { task, records, append, pickerTs, changeRecordedAt, changeDescription, remove } = useLifeRecordEditor(
  () => props.taskId,
  "drink",
  { embedded: () => props.embedded },
);
const drunkMl = computed(() => sumLifeRecordAmountMl(records.value));
const dayGoalMl = computed(() => task.value?.drinkGoalMl ?? settingStore.settings.drinkDailyGoalMl);
const goalMet = computed(() => isDrinkGoalMet(drunkMl.value, dayGoalMl.value));
const progressRatio = computed(() => {
  const goal = Number(dayGoalMl.value);
  if (!Number.isFinite(goal) || goal <= 0) return 0;
  return Math.min(1, drunkMl.value / goal);
});
function writeRecords(next: LifeRecord[] | null) {
  if (!next) return;
  dataStore.updateTaskById(props.taskId, { lifeRecords: next });
}
function onChangeCupMl(v: number | null) {
  if (v == null || !Number.isFinite(v) || v <= 0) return;
  settingStore.settings.drinkCupMl = Math.min(1000, Math.max(50, Math.round(v)));
}
function onChangeDayGoal(v: number | null) {
  if (v == null || !Number.isFinite(v) || v <= 0) return;
  dataStore.updateTaskById(props.taskId, { drinkGoalMl: Math.round(v) });
}
function onChangeAmount(record: LifeRecord, v: number | null) {
  if (v == null || !Number.isFinite(v) || v <= 0) return;
  writeRecords(updateLifeRecord(records.value, record.id, { amountMl: Math.round(v) }));
}
</script>
<style src="./lifeRecordTable.css"></style>
<style scoped>
.drink-day-gauge {
  --a: 16%;
  --c: 16%;
  --d: 10%;
  --f: 22%;
  --drop-size: 50px;
  --times-size: 35px;
  --count-size: 30px;
  --sum-size: 20px;
  --slash-size: 25px;
  --goal-size: 20px;
  position: relative;
  width: 100%;
  height: 100%;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 0px solid var(--color-background-light);
  box-shadow: 1px 0 -2px -2px var(--color-blue-light);
  background: transparent;
  box-sizing: border-box;
}
.drink-day-gauge__fill {
  z-index: 0;
}
.drink-day-gauge :deep(.drink-water-fill__body--a),
.drink-day-gauge :deep(.drink-water-fill__wash--a) {
  fill: rgba(61, 162, 224, 0.1);
  background: rgba(24, 157, 239, 0.05);
}
.drink-day-gauge :deep(.drink-water-fill__body--b),
.drink-day-gauge :deep(.drink-water-fill__wash--b) {
  fill: rgba(80, 210, 255, 0.1);
  background: rgba(80, 210, 255, 0.05);
}
.drink-day-gauge :deep(.drink-water-fill__body--c),
.drink-day-gauge :deep(.drink-water-fill__wash--c) {
  fill: rgba(140, 170, 230, 0.1);
  background: rgba(140, 170, 230, 0.05);
}
.drink-day-gauge :deep(.drink-water-fill__crest--a) {
  stroke: rgba(54, 161, 207, 0);
  stroke-width: 1.2px;
}
.drink-day-gauge :deep(.drink-water-fill__crest--b) {
  stroke: rgba(90, 210, 245, 0);
  stroke-width: 1px;
}
.drink-day-gauge :deep(.drink-water-fill__crest--c) {
  stroke: rgba(120, 140, 200, 0);
  stroke-width: 0.85px;
}
.drink-day-gauge__el {
  position: absolute;
  z-index: 1;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  line-height: 1;
  transform: translate(-50%, -50%);
  box-sizing: border-box;
  font-variant-numeric: tabular-nums;
}
.drink-day-gauge__drop {
  left: calc(50% - var(--a));
  top: calc(50% - var(--d));
  width: var(--drop-size);
  height: var(--drop-size);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: inherit;
}
.drink-day-gauge__drop:hover {
  opacity: 0.85;
}
.drink-day-gauge__drop-icon {
  display: block;
  width: var(--drop-size);
  height: var(--drop-size);
  font-size: var(--drop-size);
  line-height: 0;
}
.drink-day-gauge__drop-icon :deep(svg) {
  width: 1em;
  height: 1em;
  display: block;
}
.drink-day-gauge__times {
  left: 50%;
  top: calc(50% - var(--d));
  font-size: var(--times-size);
  font-weight: 400;
  color: var(--color-text-secondary);
}
.drink-day-gauge__count {
  left: calc(50% + var(--c));
  top: calc(50% - var(--d));
  font-size: var(--count-size);
  font-weight: 500;
  color: var(--color-text-primary);
}
.drink-day-gauge__sum {
  left: calc(50% - var(--a));
  top: calc(50% + var(--f) - 20px);
  font-size: var(--sum-size);
  font-weight: 500;
  color: var(--color-blue);
}
.drink-day-gauge__slash {
  left: 50%;
  top: calc(50% + var(--f) - 20px);
  font-size: var(--slash-size);
  color: var(--color-text-secondary);
}
.drink-day-gauge__goal {
  left: calc(50% + var(--c));
  top: calc(50% + var(--f) - 20px);
  width: 4.2em;
}
.drink-day-gauge__goal :deep(.n-input) {
  --n-height: var(--goal-size) !important;
  --n-padding-left: 0 !important;
  --n-padding-right: 0 !important;
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
  --n-color: transparent !important;
  background: transparent !important;
  font-weight: 500;
  font-size: var(--goal-size);
  line-height: 1 !important;
}
.drink-day-gauge__goal :deep(.n-input__input-el) {
  text-align: center;
  padding: 0;
  line-height: 1;
  height: var(--goal-size);
  color: var(--color-text-primary);
}
.drink-day-table__cup-head {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  max-width: 100%;
  line-height: 1;
  color: var(--color-text-primary);
  font-weight: 400;
}
.drink-day-table__cup-head-unit {
  flex: 0 0 auto;
  line-height: 1;
  font-family: Consolas, "Courier New", Courier, monospace;
  font-size: 12px;
}
.drink-day-table__cup-head-ml {
  width: 4ch !important;
  min-width: 0 !important;
  max-width: 4ch;
  flex: 0 0 4ch;
}
.drink-day-table__cup-head-ml :deep(.n-input) {
  width: 100% !important;
  min-width: 0 !important;
  --n-height: 22px !important;
  --n-padding-left: 0 !important;
  --n-padding-right: 0 !important;
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
  --n-color: transparent !important;
  background: transparent !important;
  font-size: 12px;
  font-weight: 600;
  font-family: Consolas, "Courier New", Courier, monospace;
  color: var(--color-text-primary);
  line-height: 1 !important;
}
.drink-day-table__cup-head-ml :deep(.n-input__input-el) {
  text-align: right;
  line-height: 1;
  height: 22px;
  padding: 0;
}
.drink-day-table__ml {
  width: 100%;
  max-width: 100%;
  display: inline-block;
  vertical-align: middle;
}
.drink-day-table__ml :deep(.n-input) {
  --n-height: 22px !important;
  --n-padding-left: 0 !important;
  --n-padding-right: 0 !important;
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
  --n-color: transparent !important;
  background: transparent !important;
  font-size: 12px;
  font-weight: 600;
  font-family: Consolas, "Courier New", Courier, monospace;
  line-height: 1 !important;
}
.drink-day-table__ml :deep(.n-input__input-el) {
  text-align: center;
  line-height: 1;
  height: 22px;
  padding: 0;
}
</style>
