<!-- LifeRecordForm.vue -->
<!-- 生活记录 task 的专用表单：点事件（喝/吃/厕）为时刻列表，sleep 为 入睡→醒来 段列表 -->
<template>
  <div v-if="task" class="life-record-form">
    <div class="lr-header">
      <span class="lr-title">{{ def.emoji }} {{ def.title }}</span>
      <span v-if="kind !== 'sleep'" class="lr-count">×{{ records.length }}</span>
      <n-button size="small" tertiary class="lr-append" @click="onAppend">{{ appendLabel }}</n-button>
      <n-button size="small" tertiary class="lr-done" title="完成，取消选中" @click="onDeselect">
        <template #icon>
          <n-icon><Checkmark20Regular /></n-icon>
        </template>
      </n-button>
    </div>

    <div v-if="records.length === 0" class="lr-empty">还没有记录，点「{{ appendLabel }}」记一条</div>

    <div v-for="record in records" :key="record.id" class="lr-row">
      <n-time-picker
        class="lr-time"
        :value="record.recordedAt"
        format="HH:mm"
        size="small"
        :placeholder="kind === 'sleep' ? '睡了' : ''"
        @update:value="(ts: number | null) => onChangeTime(record, 'recordedAt', ts)"
      />
      <template v-if="kind === 'sleep'">
        <span class="lr-sep">→</span>
        <n-time-picker
          class="lr-time"
          :value="record.endAt ?? null"
          format="HH:mm"
          size="small"
          placeholder="还没醒"
          clearable
          @update:value="(ts: number | null) => onChangeTime(record, 'endAt', ts)"
        />
        <span v-if="record.endAt != null" class="lr-duration">{{ formatDuration(record) }}</span>
      </template>
      <n-input
        v-if="kind === 'eat'"
        class="lr-desc"
        :value="record.description ?? ''"
        size="small"
        placeholder="吃了什么（可选）"
        @update:value="(v: string) => onChangeDescription(record, v)"
      />
      <n-button text size="small" class="lr-delete" title="删除这条" @click="onRemove(record)">
        <template #icon>
          <n-icon><Delete20Regular /></n-icon>
        </template>
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NButton, NIcon, NInput, NTimePicker } from "naive-ui";
import { Delete20Regular, Checkmark20Regular } from "@vicons/fluent";
import type { LifeRecord } from "@/core/types/Task";
import { getLifeRecordDef, type LifeRecordKind } from "@/core/lifeRecord";
import { appendLifeRecord, updateLifeRecord } from "@/services/lifeRecord/lifeRecordService";
import { useDataStore } from "@/stores/useDataStore";
import { useDisplayedTaskStore } from "@/stores/useDisplayedTaskStore";

const props = defineProps<{ taskId: number; kind: LifeRecordKind }>();

const dataStore = useDataStore();
const displayStore = useDisplayedTaskStore();
const def = computed(() => getLifeRecordDef(props.kind));

const task = computed(() => dataStore.taskList.find((t) => t.id === props.taskId) ?? null);
const records = computed<LifeRecord[]>(() => [...(task.value?.lifeRecords ?? [])].sort((a, b) => a.recordedAt - b.recordedAt));

const hasOpenSleep = computed(() => props.kind === "sleep" && records.value.some((r) => r.endAt == null));
const appendLabel = computed(() => (props.kind === "sleep" ? (hasOpenSleep.value ? "醒了" : "睡了") : "+1"));

// 行归属日锚点：todo.id 落在当天；补记旧日时默认时刻 = 旧日 + 当前时分
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

/** 用 time 的时分替换 date 的时分（编辑只动时刻、不动日期） */
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
  writeRecords(appendLifeRecord(task.value?.lifeRecords, props.kind, at).next);
}

/** 打钩：退出当前生活记录 task，回到非选中空位 */
function onDeselect() {
  dataStore.cleanSelection();
  displayStore.snapToEmptySlot();
}

function onChangeTime(record: LifeRecord, field: "recordedAt" | "endAt", ts: number | null) {
  if (ts == null) {
    // 仅醒来时刻允许清空（回到「还没醒」）
    if (field === "endAt") writeRecords(updateLifeRecord(records.value, record.id, { endAt: undefined }));
    return;
  }
  if (field === "endAt") {
    const base = record.endAt ?? record.recordedAt;
    let nextTs = withTimePart(base, ts);
    // 醒来早于入睡：视为次日凌晨（跨夜睡眠）
    if (nextTs <= record.recordedAt) nextTs += 86400000;
    writeRecords(updateLifeRecord(records.value, record.id, { endAt: nextTs }));
    return;
  }
  writeRecords(updateLifeRecord(records.value, record.id, { recordedAt: withTimePart(record.recordedAt, ts) }));
}

function onChangeDescription(record: LifeRecord, v: string) {
  writeRecords(updateLifeRecord(records.value, record.id, { description: v }));
}

function onRemove(record: LifeRecord) {
  // 删空最后一条时 store 会级联软删整行（activity/todo/task）
  dataStore.removeLifeRecordAt(props.taskId, record.id);
}

function formatDuration(record: LifeRecord): string {
  if (record.endAt == null) return "";
  const mins = Math.max(0, Math.round((record.endAt - record.recordedAt) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m}m` : ""}` : `${m}m`;
}
</script>

<style scoped>
.life-record-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0;
}
.lr-header {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lr-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-primary);
}
.lr-count {
  color: var(--color-text-secondary);
  font-size: 13px;
}
.lr-append {
  margin-left: auto;
}
.lr-done {
  flex-shrink: 0;
}
.lr-empty {
  color: var(--color-text-secondary);
  font-size: 13px;
  padding: 8px 0;
}
.lr-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.lr-time {
  width: 96px;
}
.lr-sep {
  color: var(--color-text-secondary);
}
.lr-duration {
  color: var(--color-text-secondary);
  font-size: 12px;
  white-space: nowrap;
}
.lr-desc {
  flex: 1;
  min-width: 120px;
}
.lr-delete {
  margin-left: auto;
}
</style>
