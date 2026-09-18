<!--
  日视图喝水大面板：左圆水位 + 右三线表
  表固定高度、表内纵滚；杯量在表头末列；窄槽见 DrinkCompact
-->
<template>
  <div v-if="task" class="drink-day-panel" :class="{ 'drink-day-panel--mobile': isMobile }">
    <div class="drink-day-panel__toolbar">
      <n-button v-if="records.length === 0" text size="small" class="drink-day-panel__icon-btn" title="删除空记录" @click="onDiscard">
        <template #icon>
          <n-icon :size="18"><Delete20Regular /></n-icon>
        </template>
      </n-button>
      <n-button text size="small" class="drink-day-panel__icon-btn" title="关闭" @click="onDeselect">
        <template #icon>
          <n-icon :size="18"><Dismiss20Regular /></n-icon>
        </template>
      </n-button>
    </div>

    <div class="drink-day-panel__body">
      <!-- 左：圆水位；六元钉在 a/c/d/f 交点，调下方 CSS 变量即可 -->
      <div class="drink-day-gauge" :title="`${drunkMl} / ${dayGoalMl || '—'} ml`">
        <DrinkDayWaterFill class="drink-day-gauge__fill" :ratio="progressRatio" :met="goalMet" />
        <!-- 上：o @ a∩d · × @ b∩d · N @ c∩d -->
        <button type="button" class="drink-day-gauge__el drink-day-gauge__drop" title="记一杯" @click="onAppend">
          <n-icon class="drink-day-gauge__drop-icon" color="var(--color-blue-drop)">
            <Drop20Filled />
          </n-icon>
        </button>
        <span class="drink-day-gauge__el drink-day-gauge__times" aria-hidden="true">×</span>
        <span class="drink-day-gauge__el drink-day-gauge__count">{{ records.length }}</span>
        <!-- 下：合计 @ a∩f · / @ b∩f · 目标 @ c∩f -->
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

      <!-- 右：固定高三线表（无顶线）；杯量在表头末列 -->
      <div class="drink-day-table-wrap">
        <div class="drink-day-table-scroll">
          <table class="drink-day-table">
            <colgroup>
              <col class="drink-day-table__col-action" />
              <col class="drink-day-table__col-time" />
              <col class="drink-day-table__col-volume" />
            </colgroup>
            <thead>
              <tr>
                <th class="drink-day-table__col-action">
                  <button type="button" class="drink-day-table__cell-btn" title="记一杯" @click="onAppend">
                    <n-icon :size="14"><Add20Regular /></n-icon>
                  </button>
                </th>
                <th class="drink-day-table__col-time">time</th>
                <th class="drink-day-table__col-volume">
                  <div class="drink-day-table__cup-head" title="杯量（之后每次 +1）">
                    <n-icon class="drink-day-table__cup-head-icon" :size="14">
                      <DrinkToGo24Regular />
                    </n-icon>
                    <span class="drink-day-table__cup-head-eq">=</span>
                    <n-input-number
                      class="drink-day-table__cup-head-ml"
                      size="tiny"
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
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id">
                <td class="drink-day-table__col-action">
                  <button
                    type="button"
                    class="drink-day-table__cell-btn drink-day-table__cell-btn--danger"
                    title="删除这条"
                    @click="onRemove(record)"
                  >
                    <n-icon :size="14"><Delete20Regular /></n-icon>
                  </button>
                </td>
                <td class="drink-day-table__col-time">
                  <n-time-picker
                    class="drink-day-table__time"
                    :value="record.recordedAt"
                    format="HH:mm"
                    size="small"
                    :show-icon="false"
                    :bordered="false"
                    @update:value="(ts: number | null) => onChangeTime(record, ts)"
                  />
                </td>
                <td class="drink-day-table__col-volume">
                  <n-input-number
                    class="drink-day-table__ml"
                    size="tiny"
                    :value="record.amountMl ?? null"
                    :min="10"
                    :max="2000"
                    :step="10"
                    :precision="0"
                    :show-button="false"
                    @update:value="(v: number | null) => onChangeAmount(record, v)"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NButton, NIcon, NInputNumber, NTimePicker } from "naive-ui";
import { Add20Regular, Delete20Regular, Dismiss20Regular, DrinkToGo24Regular, Drop20Filled } from "@vicons/fluent";
import type { LifeRecord } from "@/core/types/Task";
import { appendLifeRecord, isDrinkGoalMet, sumLifeRecordAmountMl, updateLifeRecord } from "@/services/lifeRecord/lifeRecordService";
import { useDataStore } from "@/stores/useDataStore";
import { useDisplayedTaskStore } from "@/stores/useDisplayedTaskStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDevice } from "@/composables/platform/useDevice";
import DrinkDayWaterFill from "@/components/MonthPlanner/DrinkDayWaterFill.vue";

const props = defineProps<{ taskId: number }>();

const dataStore = useDataStore();
const displayStore = useDisplayedTaskStore();
const settingStore = useSettingStore();
const { isMobile } = useDevice();

const task = computed(() => dataStore.taskList.find((t) => t.id === props.taskId) ?? null);
const records = computed<LifeRecord[]>(() => [...(task.value?.lifeRecords ?? [])].sort((a, b) => a.recordedAt - b.recordedAt));

const drunkMl = computed(() => sumLifeRecordAmountMl(records.value));
const dayGoalMl = computed(() => task.value?.drinkGoalMl ?? settingStore.settings.drinkDailyGoalMl);
const goalMet = computed(() => isDrinkGoalMet(drunkMl.value, dayGoalMl.value));
const progressRatio = computed(() => {
  const goal = Number(dayGoalMl.value);
  if (!Number.isFinite(goal) || goal <= 0) return 0;
  return Math.min(1, drunkMl.value / goal);
});

const rowDayAnchor = computed(() => {
  const t = task.value;
  if (!t) return Date.now();
  return dataStore.todoByActivityId.get(t.sourceId)?.id ?? Date.now();
});

function isToday(ts: number): boolean {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return ts >= d.getTime() && ts < d.getTime() + 86400000;
}

function withTimePart(dateTs: number, timeTs: number): number {
  const d = new Date(dateTs);
  const t = new Date(timeTs);
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d.getTime();
}

function writeRecords(next: LifeRecord[] | null) {
  if (!next) return;
  dataStore.updateTaskById(props.taskId, { lifeRecords: next });
}

function onAppend() {
  const anchor = rowDayAnchor.value;
  const at = isToday(anchor) ? Date.now() : withTimePart(anchor, Date.now());
  writeRecords(
    appendLifeRecord(task.value?.lifeRecords, "drink", at, {
      amountMl: settingStore.settings.drinkCupMl,
    }).next,
  );
}

function onChangeCupMl(v: number | null) {
  if (v == null || !Number.isFinite(v) || v <= 0) return;
  settingStore.settings.drinkCupMl = Math.min(1000, Math.max(50, Math.round(v)));
}

function onChangeDayGoal(v: number | null) {
  if (v == null || !Number.isFinite(v) || v <= 0) return;
  dataStore.updateTaskById(props.taskId, { drinkGoalMl: Math.round(v) });
}

function onDeselect() {
  dataStore.cleanSelection();
  displayStore.snapToEmptySlot();
}

function onDiscard() {
  dataStore.discardLifeRecordTask(props.taskId);
}

function onChangeTime(record: LifeRecord, ts: number | null) {
  if (ts == null) return;
  writeRecords(updateLifeRecord(records.value, record.id, { recordedAt: withTimePart(record.recordedAt, ts) }));
}

function onChangeAmount(record: LifeRecord, v: number | null) {
  if (v == null || !Number.isFinite(v) || v <= 0) return;
  writeRecords(updateLifeRecord(records.value, record.id, { amountMl: Math.round(v) }));
}

function onRemove(record: LifeRecord) {
  dataStore.removeLifeRecordAt(props.taskId, record.id);
}
</script>

<style scoped>
/* 圆主导；表固定高内滚；宽区整组居中 */
.drink-day-panel {
  --drink-gauge-size: 300px;
  --drink-table-w: 200px;
  /* 表头 1 行 + 正文最多 8 行；再多表内滚 */
  --drink-head-h: 28px;
  --drink-row-h: 28px;
  --drink-table-h: calc(var(--drink-head-h) + 8 * var(--drink-row-h));
  --drink-line: var(--color-background-dark);
  --drink-line-mid: var(--color-text-secondary-transparent);

  display: flex;
  flex-direction: column;
  gap: 0px;
  padding: 2px 0 0;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  box-sizing: border-box;
  container-type: inline-size;
  container-name: drink-day;
}

/* 手机：圆 / 表宽跟屏；表仍固定高、内滚 */
.drink-day-panel--mobile {
  --drink-gauge-size: 78vw;
  --drink-table-w: 90vw;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.drink-day-panel--mobile .drink-day-panel__body {
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

.drink-day-panel--mobile .drink-day-table-wrap {
  width: var(--drink-table-w);
  max-width: 90vw;
}

.drink-day-panel__toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.drink-day-panel__icon-btn {
  width: 28px;
  min-width: 28px;
  height: 28px;
  padding: 0 !important;
}

.drink-day-panel__icon-btn--sm {
  width: 20px;
  min-width: 20px;
  height: 20px;
}

.drink-day-panel__icon-btn :deep(.n-button__icon) {
  margin: 0;
}

.drink-day-panel__body {
  flex: 1 1 0%;
  min-height: 0;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  align-content: center;
  gap: 24px 40px;
  overflow-x: hidden;
  overflow-y: hidden;
}

/* —— 左圆 ——
 * 旋钮（相对红线 b=竖直中线、e=水平中线，占圆宽/高 %）：
 *   --a --c 左右偏移；--d --f 上下偏移
 *   --*-size 六个元素大小
 */
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
  width: var(--drink-gauge-size);
  height: var(--drink-gauge-size);
  flex: 0 0 var(--drink-gauge-size);
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

/* 默认：元素中心钉在交点 */
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

/* o @ a∩d */
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

/* × @ b∩d（钉在竖直中线） */
.drink-day-gauge__times {
  left: 50%;
  top: calc(50% - var(--d));
  font-size: var(--times-size);
  font-weight: 400;
  color: var(--color-text-secondary);
}

/* N @ c∩d */
.drink-day-gauge__count {
  left: calc(50% + var(--c));
  top: calc(50% - var(--d));
  font-size: var(--count-size);
  font-weight: 500;
  color: var(--color-text-primary);
}

/* 合计 @ a∩f */
.drink-day-gauge__sum {
  left: calc(50% - var(--a));
  top: calc(50% + var(--f));
  font-size: var(--sum-size);
  font-weight: 500;
  color: var(--color-blue);
}

/* / @ b∩f */
.drink-day-gauge__slash {
  left: 50%;
  top: calc(50% + var(--f));
  font-size: var(--slash-size);
  color: var(--color-text-secondary);
}

/* 目标 @ c∩f */
.drink-day-gauge__goal {
  left: calc(50% + var(--c));
  top: calc(50% + var(--f));
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

/* —— 右表：高 = 表头 + 8 行，超出内滚 —— */
.drink-day-table-wrap {
  flex: 0 0 auto;
  width: var(--drink-table-w);
  max-width: 100%;
  height: var(--drink-table-h);
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@container drink-day (max-width: 460px) {
  .drink-day-panel__body {
    flex-wrap: nowrap;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    align-content: flex-start;
  }
  .drink-day-gauge {
    flex: 0 0 var(--drink-gauge-size);
  }
}

.drink-day-table-scroll {
  flex: 1 1 0%;
  min-height: 0;
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  /* 预留纵条槽，避免弹出时挤窄表格 */
  scrollbar-gutter: stable;
}

.drink-day-table {
  border-collapse: collapse;
  font-size: 12px;
  width: 100%;
  table-layout: fixed;
  border-top: none;
  border-bottom: none;
}

.drink-day-table th,
.drink-day-table td {
  padding: 0 4px;
  border: none;
  vertical-align: middle;
  overflow: hidden;
  box-sizing: border-box;
}

.drink-day-table thead th {
  height: var(--drink-head-h);
  border-bottom: 1px solid var(--drink-line-mid);
  color: var(--color-text-secondary);
  font-weight: 500;
  position: sticky;
  top: 0;
  background: var(--color-background);
  z-index: 1;
}

.drink-day-table tbody td {
  height: var(--drink-row-h);
}

.drink-day-table__col-action {
  width: 28px;
  padding-left: 0;
  padding-right: 0;
  text-align: center;
}

.drink-day-table__col-time {
  width: 56px;
  text-align: left;
}

.drink-day-table__col-volume {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.drink-day-table th.drink-day-table__col-volume,
.drink-day-table td.drink-day-table__col-volume {
  text-align: right;
  padding-right: 6px;
}

/* + / 删：同尺寸同中心 */
.drink-day-table__cell-btn {
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
.drink-day-table__cell-btn :deep(.n-icon) {
  display: flex;
  line-height: 0;
}
.drink-day-table__cell-btn--danger {
  color: var(--color-red-dark);
}
.drink-day-table__cell-btn:hover {
  opacity: 0.85;
}

.drink-day-table__cup-head {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  width: max-content;
  max-width: 100%;
  margin-left: auto;
  line-height: 1;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.drink-day-table__cup-head-icon {
  color: var(--color-blue);
  flex: 0 0 auto;
  display: inline-flex;
  line-height: 0;
}

.drink-day-table__cup-head-eq,
.drink-day-table__cup-head-unit {
  flex: 0 0 auto;
  line-height: 1;
}

.drink-day-table__cup-head-ml {
  width: 2.5em !important;
  min-width: 0 !important;
  max-width: 2.5em;
  flex: 0 0 2.5em;
}
.drink-day-table__cup-head-ml :deep(.n-input) {
  width: 100% !important;
  min-width: 0 !important;
  --n-height: 16px !important;
  --n-padding-left: 0 !important;
  --n-padding-right: 0 !important;
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
  --n-color: transparent !important;
  background: transparent !important;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  line-height: 1 !important;
}
.drink-day-table__cup-head-ml :deep(.n-input__input-el) {
  text-align: left;
  line-height: 1;
  height: 16px;
  padding: 0;
}

.drink-day-table__time {
  width: 44px;
  max-width: 100%;
  vertical-align: middle;
}
.drink-day-table__time :deep(.n-input) {
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
.drink-day-table__time :deep(.n-base-suffix),
.drink-day-table__time :deep(.n-input__suffix) {
  display: none !important;
  width: 0 !important;
}

.drink-day-table__ml {
  width: 3em;
  max-width: 100%;
  display: inline-block;
  vertical-align: middle;
}
.drink-day-table__ml :deep(.n-input) {
  --n-height: 16px !important;
  --n-padding-left: 0 !important;
  --n-padding-right: 0 !important;
  --n-border: none !important;
  --n-border-hover: none !important;
  --n-border-focus: none !important;
  --n-box-shadow-focus: none !important;
  --n-color: transparent !important;
  background: transparent !important;
  text-align: right;
  font-size: 12px;
  line-height: 1 !important;
}
.drink-day-table__ml :deep(.n-input__input-el) {
  text-align: right;
  line-height: 1;
  height: 16px;
  padding: 0;
}
</style>
