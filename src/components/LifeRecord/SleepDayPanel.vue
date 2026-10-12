<!--
  日视图睡觉大面板：左大月亮 + 右记录表；点「梦」后输入框贴在最后一行下面
  布局对齐 DrinkDayPanel；窄槽已并入整合 sheet（见 LifeRecordDaySheet）
-->
<template>
  <div
    v-if="task"
    class="sleep-day-panel"
    :class="{ 'sleep-day-panel--mobile': isMobile }"
  >
    <div v-if="!embedded" class="sleep-day-panel__toolbar">
      <n-button v-if="records.length === 0" text size="small" class="sleep-day-panel__icon-btn" title="删除空记录" @click="onDiscard">
        <template #icon>
          <n-icon :size="18"><Delete20Regular /></n-icon>
        </template>
      </n-button>
      <n-button text size="small" class="sleep-day-panel__icon-btn" title="关闭" @click="onDeselect">
        <template #icon>
          <n-icon :size="18"><Dismiss20Regular /></n-icon>
        </template>
      </n-button>
    </div>

    <div class="sleep-day-panel__body">
      <!-- 左：与喝水同一方框。上排月亮 × 次数；合计只有一个数，水平居中、高度同喝水统计行 -->
      <div v-if="view === 'chart'" class="lr-chart" :title="hasOpenSleep ? '醒了（当前时间）' : '睡了（当前时间）'">
        <button
          type="button"
          class="lr-chart__el lr-chart__icon"
          :title="hasOpenSleep ? '醒了（当前时间）' : '睡了（当前时间）'"
          @click="onAppend"
        >
          <n-icon class="lr-chart__icon-glyph" color="var(--color-yellow-dark)">
            <component :is="hasOpenSleep ? WeatherMoon20Filled : WeatherMoon20Regular" />
          </n-icon>
        </button>
        <span class="lr-chart__el lr-chart__times" aria-hidden="true">×</span>
        <span class="lr-chart__el lr-chart__count">{{ records.length }}</span>
        <span class="lr-chart__el lr-chart__stat sleep-day-chart__sum" :title="'合计 ' + totalDurationLabel">{{ totalDurationLabel }}</span>
      </div>

      <!-- 右：表头 icon 对齐 DaySchedule（Play / Stop / 时长 / Thinking） -->
      <div v-if="view === 'table'" class="sleep-day-table-wrap">
        <div class="sleep-day-table-scroll">
          <table class="sleep-day-table">
            <colgroup>
              <col class="sleep-day-table__col-action" />
              <col class="sleep-day-table__col-time" />
              <col class="sleep-day-table__col-time" />
              <col class="sleep-day-table__col-dur" />
              <col class="sleep-day-table__col-dream" />
            </colgroup>
            <thead>
              <tr>
                <th class="sleep-day-table__col-action">
                  <button
                    type="button"
                    class="sleep-day-table__cell-btn"
                    :title="hasOpenSleep ? '醒了（当前时间）' : '睡了（当前时间）'"
                    @click="onAppend"
                  >
                    <n-icon :size="18"><Add20Regular /></n-icon>
                  </button>
                </th>
                <th
                  class="sleep-day-table__col-time sleep-day-table__th-stamp"
                  :class="{ 'sleep-day-table__th-stamp--active': !hasOpenSleep }"
                  title="睡了：填入当前时间"
                  @click="onStampSleep"
                >
                  <n-icon :size="18" class="sleep-day-table__th-icon"><Play20Regular /></n-icon>
                </th>
                <th
                  class="sleep-day-table__col-time sleep-day-table__th-stamp"
                  :class="{ 'sleep-day-table__th-stamp--active': hasOpenSleep }"
                  title="醒了：填入当前时间"
                  @click="onStampWake"
                >
                  <n-icon :size="18" class="sleep-day-table__th-icon"><RecordStop20Regular /></n-icon>
                </th>
                <th class="sleep-day-table__col-dur" title="时长">
                  <n-icon :size="18" class="sleep-day-table__th-icon"><ShiftsActivity20Regular /></n-icon>
                </th>
                <th class="sleep-day-table__col-dream" title="梦">
                  <n-icon :size="18" class="sleep-day-table__th-icon"><Thinking20Regular /></n-icon>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in records" :key="record.id" :class="{ 'sleep-day-table__row--dream-active': dreamRecordId === record.id }">
                <td class="sleep-day-table__col-action">
                  <button
                    type="button"
                    class="sleep-day-table__cell-btn sleep-day-table__cell-btn--danger"
                    title="删除这条"
                    @click="onRemove(record)"
                  >
                    <n-icon :size="14"><Delete20Regular /></n-icon>
                  </button>
                </td>
                <td class="sleep-day-table__col-time">
                  <n-time-picker
                    class="sleep-day-table__time"
                    :value="record.recordedAt"
                    format="HH:mm"
                    size="small"
                    :show-icon="false"
                    :bordered="false"
                    @update:value="(ts: number | null) => onChangeTime(record, 'recordedAt', ts)"
                  />
                </td>
                <td class="sleep-day-table__col-time">
                  <n-time-picker
                    class="sleep-day-table__time"
                    :value="record.endAt ?? null"
                    format="HH:mm"
                    size="small"
                    placeholder="—"
                    :show-icon="false"
                    :bordered="false"
                    @update:value="(ts: number | null) => onChangeTime(record, 'endAt', ts)"
                  />
                </td>
                <td class="sleep-day-table__col-dur">
                  <span class="sleep-day-table__dur">{{ formatDuration(record) }}</span>
                </td>
                <td class="sleep-day-table__col-dream">
                  <button
                    type="button"
                    class="sleep-day-table__dream-chip"
                    :class="{ 'sleep-day-table__dream-chip--active': dreamRecordId === record.id }"
                    :title="record.description?.trim() ? record.description : '写梦'"
                    @click="onActivateDream(record)"
                  >
                    {{ dreamChipLabel(record) }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <textarea
          v-if="dreamRecord"
          ref="dreamTextareaRef"
          class="sleep-day-dream__editor"
          :value="dreamRecord.description ?? ''"
          placeholder="写下梦的内容…"
          rows="6"
          @input="onDreamInput"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { NButton, NIcon, NTimePicker } from "naive-ui";
import {
  Add20Regular,
  Delete20Regular,
  Dismiss20Regular,
  Play20Regular,
  RecordStop20Regular,
  ShiftsActivity20Regular,
  Thinking20Regular,
  WeatherMoon20Filled,
  WeatherMoon20Regular,
} from "@vicons/fluent";
import type { LifeRecord } from "@/core/types/Task";
import { appendLifeRecord, updateLifeRecord } from "@/services/lifeRecord/lifeRecordService";
import { useDataStore } from "@/stores/useDataStore";
import { useDisplayedTaskStore } from "@/stores/useDisplayedTaskStore";
import { useDevice } from "@/composables/platform/useDevice";

const props = withDefaults(defineProps<{ taskId: number; embedded?: boolean; view?: "chart" | "table" }>(), {
  view: "chart",
});

const dataStore = useDataStore();
const displayStore = useDisplayedTaskStore();
const { isMobile } = useDevice();

const task = computed(() => dataStore.taskList.find((t) => t.id === props.taskId) ?? null);
const records = computed<LifeRecord[]>(() => [...(task.value?.lifeRecords ?? [])].sort((a, b) => a.recordedAt - b.recordedAt));
const hasOpenSleep = computed(() => records.value.some((r) => r.endAt == null));

const dreamRecordId = ref<number | null>(null);
const dreamTextareaRef = ref<HTMLTextAreaElement | null>(null);
const dreamRecord = computed(() => {
  const id = dreamRecordId.value;
  if (id == null) return null;
  return records.value.find((r) => r.id === id) ?? null;
});

watch(dreamRecordId, async (id) => {
  if (id == null) return;
  await nextTick();
  const ta = dreamTextareaRef.value;
  if (!ta) return;
  ta.focus();
  const len = ta.value.length;
  try {
    ta.setSelectionRange(len, len);
  } catch {
    /* ignore */
  }
});

watch(records, (list) => {
  const id = dreamRecordId.value;
  if (id != null && !list.some((r) => r.id === id)) dreamRecordId.value = null;
});

const totalDurationLabel = computed(() => {
  let mins = 0;
  for (const r of records.value) {
    if (r.endAt == null) continue;
    mins += Math.max(0, Math.round((r.endAt - r.recordedAt) / 60000));
  }
  if (mins <= 0) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m}m` : ""}` : `${m}m`;
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

/** 睡着/醒来：一律打「此刻」；补记旧日则把当前时分落到该日 */
function stampNow(): number {
  const anchor = rowDayAnchor.value;
  return isToday(anchor) ? Date.now() : withTimePart(anchor, Date.now());
}

function writeRecords(next: LifeRecord[] | null) {
  if (!next) return;
  dataStore.updateTaskById(props.taskId, { lifeRecords: next });
}

/** 月亮 / +：未醒则醒了，否则睡了（均当前时间） */
function onAppend() {
  writeRecords(appendLifeRecord(task.value?.lifeRecords, "sleep", stampNow()).next);
}

/** 表头 Play：只开睡（已有未醒则忽略） */
function onStampSleep() {
  if (hasOpenSleep.value) return;
  writeRecords(appendLifeRecord(task.value?.lifeRecords, "sleep", stampNow()).next);
}

/** 表头 Stop：只醒（无未醒则忽略） */
function onStampWake() {
  if (!hasOpenSleep.value) return;
  writeRecords(appendLifeRecord(task.value?.lifeRecords, "sleep", stampNow()).next);
}

function onDeselect() {
  dreamRecordId.value = null;
  dataStore.cleanSelection();
  displayStore.snapToEmptySlot();
}

function onDiscard() {
  dreamRecordId.value = null;
  dataStore.discardLifeRecordTask(props.taskId);
}

function onChangeTime(record: LifeRecord, field: "recordedAt" | "endAt", ts: number | null) {
  if (ts == null) {
    if (field === "endAt") writeRecords(updateLifeRecord(records.value, record.id, { endAt: undefined }));
    return;
  }
  if (field === "endAt") {
    const base = record.endAt ?? record.recordedAt;
    let nextTs = withTimePart(base, ts);
    if (nextTs <= record.recordedAt) nextTs += 86400000;
    writeRecords(updateLifeRecord(records.value, record.id, { endAt: nextTs }));
    return;
  }
  writeRecords(updateLifeRecord(records.value, record.id, { recordedAt: withTimePart(record.recordedAt, ts) }));
}

function onActivateDream(record: LifeRecord) {
  if (dreamRecordId.value === record.id) {
    closeDream();
    return;
  }
  dreamRecordId.value = record.id;
}

function closeDream() {
  dreamRecordId.value = null;
}

function onDreamInput(e: Event) {
  const id = dreamRecordId.value;
  if (id == null) return;
  const v = (e.target as HTMLTextAreaElement).value;
  writeRecords(updateLifeRecord(records.value, id, { description: v }));
}

function onRemove(record: LifeRecord) {
  if (dreamRecordId.value === record.id) dreamRecordId.value = null;
  dataStore.removeLifeRecordAt(props.taskId, record.id);
}

function formatDuration(record: LifeRecord): string {
  if (record.endAt == null) return "—";
  const mins = Math.max(0, Math.round((record.endAt - record.recordedAt) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m}m` : ""}` : `${m}m`;
}

function dreamChipLabel(record: LifeRecord): string {
  const t = (record.description ?? "").trim().replace(/\s+/g, " ");
  if (!t) return "…";
  return t.length > 12 ? `${t.slice(0, 12)}…` : t;
}
</script>

<style src="./lifeRecordChart.css"></style>
<style scoped>
.sleep-day-panel {
  --lr-chart-size: 300px;
  --sleep-table-w: 360px;
  --sleep-head-h: 28px;
  --sleep-row-h: 28px;
  --sleep-table-h: calc(var(--sleep-head-h) + 8 * var(--sleep-row-h));
  --sleep-line-mid: var(--color-text-secondary-transparent);

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
  container-name: sleep-day;
}

.sleep-day-panel--mobile {
  --lr-chart-size: 78vw;
  --sleep-table-w: 90vw;
  height: auto;
  overflow: visible;
}

.sleep-day-panel--mobile .sleep-day-panel__body {
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

.sleep-day-panel--mobile .sleep-day-table-wrap {
  width: var(--sleep-table-w);
  max-width: 90vw;
  height: auto;
  max-height: none;
  min-height: calc(var(--sleep-head-h) + 2 * var(--sleep-row-h));
  overflow: visible;
}

.sleep-day-panel--mobile .sleep-day-table-scroll {
  flex: 0 0 auto;
  max-height: none;
  overflow: visible;
}

/* 写梦：输入框跟在最后一行后面，不另占一块高度 */

.sleep-day-panel__toolbar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}

.sleep-day-panel__icon-btn {
  width: 28px;
  min-width: 28px;
  height: 28px;
  padding: 0 !important;
}

.sleep-day-panel__icon-btn :deep(.n-button__icon) {
  margin: 0;
}

.sleep-day-panel__body {
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

.sleep-day-chart__sum {
  color: var(--color-yellow-dark);
}

.sleep-day-table-wrap {
  flex: 0 0 auto;
  width: var(--sleep-table-w);
  max-width: 100%;
  height: auto;
  max-height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

@container sleep-day (max-width: 560px) {
  .sleep-day-panel__body {
    flex-wrap: nowrap;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    align-content: flex-start;
  }
}

.sleep-day-table-scroll {
  flex: 0 1 auto;
  min-height: 0;
  max-height: var(--sleep-table-h);
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
}

.sleep-day-table {
  border-collapse: collapse;
  font-size: 12px;
  width: 100%;
  table-layout: fixed;
  border-top: none;
  border-bottom: none;
}

.sleep-day-table th,
.sleep-day-table td {
  padding: 0 2px;
  border: none;
  vertical-align: middle;
  overflow: hidden;
  box-sizing: border-box;
  white-space: nowrap;
}

.sleep-day-table thead th {
  height: var(--sleep-head-h);
  border-bottom: 1px solid var(--color-background-dark);
  color: var(--color-text-primary);
  font-weight: 400;
  position: sticky;
  top: 0;
  background: var(--color-background);
  z-index: 1;
  text-align: center;
  line-height: 1;
}

.sleep-day-table__th-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  color: var(--color-text-primary);
  opacity: 1;
}
.sleep-day-table__th-icon :deep(svg) {
  display: block;
}

.sleep-day-table__th-stamp {
  cursor: pointer;
  user-select: none;
}
.sleep-day-table__th-stamp:hover .sleep-day-table__th-icon,
.sleep-day-table__th-stamp--active .sleep-day-table__th-icon {
  color: var(--color-text-primary);
}

.sleep-day-table tbody td {
  height: var(--sleep-row-h);
}

.sleep-day-table__row--dream-active {
  background: var(--color-yellow-light-transparent);
}

.sleep-day-table__col-action {
  width: 28px;
  padding-left: 0;
  padding-right: 0;
  text-align: center;
}

.sleep-day-table__col-time {
  width: 56px;
  text-align: center;
}

.sleep-day-table__col-dur {
  width: 44px;
  text-align: center;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
}

.sleep-day-table__col-dream {
  text-align: left;
  min-width: 0;
}

.sleep-day-table thead th.sleep-day-table__col-dream {
  text-align: center;
}

.sleep-day-table__cell-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
  line-height: 0;
  vertical-align: middle;
}
.sleep-day-table__cell-btn :deep(.n-icon) {
  display: flex;
  line-height: 0;
}
.sleep-day-table__cell-btn--danger {
  color: var(--color-red-dark);
}
.sleep-day-table__cell-btn:hover {
  opacity: 0.85;
}

.sleep-day-table__time {
  width: 100%;
  max-width: 100%;
  vertical-align: middle;
}
.sleep-day-table__time :deep(.n-input) {
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
  font-family: Consolas, "Courier New", Courier, monospace;
}
.sleep-day-table__time :deep(.n-input__input-el) {
  text-align: center;
  padding: 0;
}
.sleep-day-table__time :deep(.n-base-suffix),
.sleep-day-table__time :deep(.n-input__suffix),
.sleep-day-table__time :deep(.n-base-clear) {
  display: none !important;
  width: 0 !important;
}

.sleep-day-table__dur {
  display: inline-block;
  width: 100%;
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
  font-family: Consolas, "Courier New", Courier, monospace;
}

.sleep-day-table__dream-chip {
  display: block;
  width: 100%;
  max-width: 100%;
  margin: 0;
  padding: 0 2px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 22px;
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}
.sleep-day-table__dream-chip--active {
  color: var(--color-text-primary);
  font-weight: 600;
}

.sleep-day-dream__editor {
  display: block;
  width: 100%;
  margin: 0;
  padding: 4px 8px;
  border: none;
  border-radius: 0;
  background: var(--color-background-light-transparent);
  color: var(--color-text-primary);
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  box-sizing: border-box;
  outline: none;
  font-family: inherit;
}
.sleep-day-dream__editor:focus {
  background: var(--color-background-light-transparent);
  box-shadow: none;
}
</style>
