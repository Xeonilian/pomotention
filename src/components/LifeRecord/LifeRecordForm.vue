<!-- LifeRecordForm.vue -->
<!-- 生活记录 task 表单壳：drink 日视图 → DrinkDayPanel；其它/窄槽 → compact；eat/sleep 行表单 -->
<template>
  <!-- 变体 B：日视图喝水大面板 -->
  <DrinkDayPanel v-if="task && kind === 'drink' && isDayView" :task-id="taskId" />

  <!-- 变体 A：compact（周/月等窄槽）+ 非 drink 行表单 -->
  <div v-else-if="task" class="life-record-form">
    <div class="lr-header" :class="{ 'lr-header--drink': kind === 'drink' }">
      <!-- drink：水滴本身即 +1；其它 kind：图标即追加 -->
      <n-button
        text
        size="small"
        class="lr-icon-btn lr-append-icon"
        :title="appendTitle"
        @click="onAppend"
      >
        <template #icon>
          <n-icon :size="18" :color="kind === 'drink' ? 'var(--color-blue)' : undefined">
            <component :is="kindIcon" />
          </n-icon>
        </template>
      </n-button>
      <span v-if="kind !== 'sleep' && records.length > 0" class="lr-count">×{{ records.length }}</span>

      <template v-if="kind === 'drink'">
        <div class="lr-drink-cup" title="杯量（之后每次 +1）">
          <n-icon class="lr-drink-cup__icon" :size="16">
            <DrinkToGo24Regular />
          </n-icon>
          <span class="lr-drink-cup__eq">=</span>
          <n-input-number
            class="lr-drink-cup__ml"
            size="tiny"
            :value="settingStore.settings.drinkCupMl"
            :min="50"
            :max="1000"
            :step="50"
            :precision="0"
            :show-button="false"
            @update:value="onChangeCupMl"
          />
          <span class="lr-drink-unit">ml</span>
        </div>
        <div class="lr-drink-totals" title="今日目标（仅本天）">
          <span class="lr-drink-sum">{{ drunkMl }}</span>
          <span class="lr-drink-sep">/</span>
          <n-input-number
            class="lr-drink-goal"
            size="tiny"
            :value="dayGoalMl"
            :min="100"
            :max="20000"
            :step="100"
            :precision="0"
            :show-button="false"
            @update:value="onChangeDayGoal"
          />
          <span class="lr-drink-unit">ml</span>
        </div>
      </template>

      <div class="lr-actions">
        <n-button
          v-if="records.length === 0"
          text
          size="small"
          class="lr-icon-btn"
          title="删除空记录"
          @click="onDiscard"
        >
          <template #icon>
            <n-icon :size="18"><Delete20Regular /></n-icon>
          </template>
        </n-button>
        <n-button text size="small" class="lr-icon-btn" title="关闭" @click="onDeselect">
          <template #icon>
            <n-icon :size="18"><Dismiss20Regular /></n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <div v-if="kind === 'drink'" class="lr-drink-bar" :title="`${drunkMl} / ${dayGoalMl || '—'} ml`">
      <div class="lr-drink-bar__fill" :class="{ 'lr-drink-bar__fill--met': goalMet }" :style="{ width: progressPct + '%' }" />
    </div>

    <div v-if="kind === 'drink' && records.length > 0" class="lr-drink-list">
      <DrinkSipTag
        v-for="record in records"
        :key="record.id"
        :recorded-at="record.recordedAt"
        :amount-ml="record.amountMl"
        @update:recorded-at="(ts) => onChangeTime(record, 'recordedAt', ts)"
        @remove="onRemove(record)"
      />
    </div>

    <template v-else-if="kind !== 'drink'">
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
        <n-button text size="small" class="lr-icon-btn lr-delete" title="删除这条" @click="onRemove(record)">
          <template #icon>
            <n-icon :size="16"><Delete20Regular /></n-icon>
          </template>
        </n-button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, type Component } from "vue";
import { NButton, NIcon, NInput, NInputNumber, NTimePicker } from "naive-ui";
import {
  Delete20Regular,
  Dismiss20Regular,
  DrinkToGo24Regular,
  Drop20Filled,
  Drop20Regular,
  Door20Regular,
  FoodApple20Regular,
  WeatherMoon20Filled,
  WeatherMoon20Regular,
} from "@vicons/fluent";
import type { LifeRecord } from "@/core/types/Task";
import { getLifeRecordDef, type LifeRecordKind } from "@/core/lifeRecord";
import { appendLifeRecord, isDrinkGoalMet, sumLifeRecordAmountMl, updateLifeRecord } from "@/services/lifeRecord/lifeRecordService";
import { useDataStore } from "@/stores/useDataStore";
import { useDisplayedTaskStore } from "@/stores/useDisplayedTaskStore";
import { useSettingStore } from "@/stores/useSettingStore";
import DrinkSipTag from "@/components/LifeRecord/DrinkSipTag.vue";
import DrinkDayPanel from "@/components/LifeRecord/DrinkDayPanel.vue";

const props = defineProps<{ taskId: number; kind: LifeRecordKind }>();

const KIND_ICONS: Record<LifeRecordKind, { idle: Component; active: Component }> = {
  drink: { idle: Drop20Regular, active: Drop20Filled },
  eat: { idle: FoodApple20Regular, active: FoodApple20Regular },
  toilet: { idle: Door20Regular, active: Door20Regular },
  sleep: { idle: WeatherMoon20Regular, active: WeatherMoon20Filled },
};

const dataStore = useDataStore();
const displayStore = useDisplayedTaskStore();
const settingStore = useSettingStore();
const def = computed(() => getLifeRecordDef(props.kind));
const isDayView = computed(() => settingStore.settings.viewSet === "day");

const task = computed(() => dataStore.taskList.find((t) => t.id === props.taskId) ?? null);
const records = computed<LifeRecord[]>(() => [...(task.value?.lifeRecords ?? [])].sort((a, b) => a.recordedAt - b.recordedAt));

const hasOpenSleep = computed(() => props.kind === "sleep" && records.value.some((r) => r.endAt == null));
const kindIcon = computed(() => {
  const pair = KIND_ICONS[props.kind];
  if (props.kind === "sleep") return hasOpenSleep.value ? pair.active : pair.idle;
  return records.value.length > 0 ? pair.active : pair.idle;
});
const appendTitle = computed(() => {
  if (props.kind === "sleep") return hasOpenSleep.value ? "醒了" : "睡了";
  if (props.kind === "drink") return "记一杯";
  return `记一条${def.value.title}`;
});

const drunkMl = computed(() => sumLifeRecordAmountMl(records.value));
const dayGoalMl = computed(() => task.value?.drinkGoalMl ?? settingStore.settings.drinkDailyGoalMl);
const goalMet = computed(() => isDrinkGoalMet(drunkMl.value, dayGoalMl.value));
const progressPct = computed(() => {
  const goal = Number(dayGoalMl.value);
  if (!Number.isFinite(goal) || goal <= 0) return 0;
  return Math.min(100, Math.round((drunkMl.value / goal) * 100));
});

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
  const amountMl = props.kind === "drink" ? settingStore.settings.drinkCupMl : undefined;
  writeRecords(appendLifeRecord(task.value?.lifeRecords, props.kind, at, { amountMl }).next);
}

function onChangeCupMl(v: number | null) {
  if (v == null || !Number.isFinite(v) || v <= 0) return;
  settingStore.settings.drinkCupMl = Math.min(1000, Math.max(50, Math.round(v)));
}

function onChangeDayGoal(v: number | null) {
  if (v == null || !Number.isFinite(v) || v <= 0) return;
  dataStore.updateTaskById(props.taskId, { drinkGoalMl: Math.round(v) });
}

/** ×：退出当前生活记录 task，回到非选中空位 */
function onDeselect() {
  dataStore.cleanSelection();
  displayStore.snapToEmptySlot();
}

/** 空态丢掉日桶（无幽灵行） */
function onDiscard() {
  dataStore.discardLifeRecordTask(props.taskId);
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
  flex-wrap: wrap;
  min-width: 0;
}
.lr-header--drink {
  gap: 6px 10px;
}
.lr-count {
  color: var(--color-text-secondary);
  font-size: 13px;
  flex-shrink: 0;
}
.lr-icon-btn {
  width: 28px;
  min-width: 28px;
  height: 28px;
  padding: 0 !important;
  flex-shrink: 0;
}
.lr-icon-btn :deep(.n-button__icon) {
  margin: 0;
}
.lr-append-icon {
  margin-right: 0;
}
.lr-actions {
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
}
.lr-drink-cup,
.lr-drink-totals {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  min-width: 0;
}
.lr-drink-cup__icon {
  color: var(--color-blue);
  flex-shrink: 0;
}
.lr-drink-cup__eq,
.lr-drink-sep,
.lr-drink-unit {
  color: var(--color-text-secondary);
  font-size: 13px;
}
.lr-drink-cup__ml {
  width: 52px;
}
.lr-drink-goal {
  width: 60px;
}
.lr-drink-sum {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-blue);
}
.lr-drink-bar {
  height: 6px;
  border-radius: 3px;
  background: var(--color-primary-light-transparent);
  overflow: hidden;
}
.lr-drink-bar__fill {
  height: 100%;
  border-radius: 3px;
  background: var(--color-blue);
  transition: width 0.15s ease;
}
.lr-drink-bar__fill--met {
  background: var(--color-green);
}
.lr-drink-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  justify-content: flex-start;
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
