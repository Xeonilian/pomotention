<!--
  日视图活动（开门去干嘛）：图=门开段 + 最后一条（开始时间/停/备注）；表保持完整编辑。
-->
<template>
  <LifeRecordDayFrame v-if="task" :view="view" compact :note-open="chartNoteOpen">
    <template #display>
      <div class="lr-chart">
        <div class="lr-chart__el lr-chart__icon">
          <n-popconfirm
            v-model:show="askEndOpen"
            trigger="manual"
            to="body"
            :z-index="10000"
            positive-text="是"
            negative-text="否"
            @positive-click="onConfirmLastEnded"
            @negative-click="askEndOpen = false"
          >
            <template #trigger>
              <button type="button" class="toilet-day-chart__door" title="活动" @click="onDoorClick">
                <n-icon color="var(--color-text-secondary)" class="lr-chart__icon-glyph"><Door20Filled /></n-icon>
              </button>
            </template>
            上次活动结束了吗？
          </n-popconfirm>
        </div>
        <span class="lr-chart__el lr-chart__times" aria-hidden="true">×</span>
        <span class="lr-chart__el lr-chart__count">{{ records.length }}</span>
        <span v-if="lastRecord" class="lr-chart__el toilet-day-chart__start" :title="'开始 ' + lastStartLabel">{{ lastStartLabel }}</span>
        <button
          v-if="lastRecord && lastRecord.endAt == null"
          type="button"
          class="lr-chart__el toilet-day-chart__stop"
          title="结束（当前时间）"
          @click="stampEnd"
        >
          <n-icon class="toilet-day-chart__ctrl-icon"><RecordStop20Regular /></n-icon>
        </button>
        <span v-else-if="lastRecord" class="lr-chart__el toilet-day-chart__end" :title="'结束 ' + lastEndLabel">{{ lastEndLabel }}</span>
        <button
          v-if="lastRecord"
          type="button"
          class="lr-chart__el toilet-day-chart__note"
          title="去干嘛"
          @pointerdown="chartNoteOpen && $event.preventDefault()"
          @click="onNoteClick"
        >
          <n-icon class="toilet-day-chart__ctrl-icon"><CommentNote20Regular /></n-icon>
        </button>
        <input
          v-if="chartNoteOpen && lastRecord"
          ref="chartNoteRef"
          class="lr-chart__el toilet-day-chart__input"
          :value="chartNoteDraft"
          placeholder="去干嘛"
          @input="onChartNoteInput"
          @blur="onChartNoteBlur"
        />
      </div>
    </template>
    <template #table>
      <table class="lr-day-table">
        <colgroup>
          <col class="lr-day-table__col-action" />
          <col class="lr-day-table__col-time" />
          <col class="lr-day-table__col-time" />
          <col class="lr-day-table__col-dur" />
          <col />
        </colgroup>
        <thead>
          <tr>
            <th class="lr-day-table__col-action">
              <button type="button" class="lr-day-table__cell-btn" title="加一行" @click="appendRow">
                <n-icon :size="18"><Add20Regular /></n-icon>
              </button>
            </th>
            <th
              class="lr-day-table__col-time toilet-day-table__th-stamp"
              :class="{ 'toilet-day-table__th-stamp--active': !hasOpenSpan }"
              title="开始：填入当前时间"
              @click="stampStart"
            >
              <n-icon :size="18" class="lr-day-table__th-icon"><Play20Regular /></n-icon>
            </th>
            <th
              class="lr-day-table__col-time toilet-day-table__th-stamp"
              :class="{ 'toilet-day-table__th-stamp--active': hasOpenSpan }"
              title="结束：填入当前时间"
              @click="stampEnd"
            >
              <n-icon :size="18" class="lr-day-table__th-icon"><RecordStop20Regular /></n-icon>
            </th>
            <th class="lr-day-table__col-dur" title="持续">
              <n-icon :size="18" class="lr-day-table__th-icon"><ShiftsActivity20Regular /></n-icon>
            </th>
            <th class="lr-day-table__col-last" title="去干嘛">
              <n-icon :size="18" color="var(--color-text-secondary)" class="lr-day-table__th-icon"><Door20Filled /></n-icon>
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
                @update:value="(ts: number | null) => changeTime(record, 'recordedAt', ts)"
              />
            </td>
            <td class="lr-day-table__col-time">
              <n-time-picker
                class="lr-day-table__time"
                :value="pickerTs(record.endAt)"
                format="HH:mm"
                size="small"
                placeholder="—"
                :show-icon="false"
                :bordered="false"
                @update:value="(ts: number | null) => changeTime(record, 'endAt', ts)"
              />
            </td>
            <td class="lr-day-table__col-dur">
              <span class="lr-day-table__dur">{{ formatDuration(record) }}</span>
            </td>
            <td class="lr-day-table__col-last">
              <n-input
                class="lr-day-table__note"
                size="tiny"
                :bordered="false"
                :value="record.description ?? ''"
                placeholder="去干嘛"
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
import { computed, nextTick, ref, watch } from "vue";
import { NIcon, NInput, NPopconfirm, NTimePicker } from "naive-ui";
import {
  Add20Regular,
  CommentNote20Regular,
  Delete20Regular,
  Door20Filled,
  Play20Regular,
  RecordStop20Regular,
  ShiftsActivity20Regular,
} from "@vicons/fluent";
import type { LifeRecord } from "@/core/types/Task";
import { timestampToTimeString } from "@/core/utils";
import { useLifeRecordEditor } from "@/composables/lifeRecord/useLifeRecordEditor";
import LifeRecordDayFrame from "@/components/LifeRecord/LifeRecordDayFrame.vue";
const props = withDefaults(defineProps<{ taskId: number; embedded?: boolean; view?: "chart" | "table" }>(), {
  view: "chart",
});
const { task, records, hasOpenSpan, appendRow, stampStart, stampEnd, pickerTs, changeTime, changeDescription, remove } =
  useLifeRecordEditor(() => props.taskId, "toilet", { embedded: () => props.embedded });
const lastRecord = computed(() => records.value[records.value.length - 1] ?? null);
const lastStartLabel = computed(() => (lastRecord.value ? timestampToTimeString(lastRecord.value.recordedAt) : ""));
const lastEndLabel = computed(() => (lastRecord.value?.endAt != null ? timestampToTimeString(lastRecord.value.endAt) : ""));
const askEndOpen = ref(false);
const chartNoteOpen = ref(false);
const chartNoteDraft = ref("");
const chartNoteRef = ref<HTMLInputElement | null>(null);
watch(
  () => lastRecord.value?.id,
  () => {
    chartNoteOpen.value = false;
  },
);
watch(chartNoteOpen, async (open) => {
  if (!open) return;
  await nextTick();
  chartNoteRef.value?.focus();
});
function onDoorClick() {
  if (chartNoteOpen.value) {
    commitChartNote();
    chartNoteOpen.value = false;
  }
  if (hasOpenSpan.value) {
    askEndOpen.value = true;
    return;
  }
  appendRow();
}
function onConfirmLastEnded() {
  askEndOpen.value = false;
  stampEnd();
  appendRow();
}
function commitChartNote() {
  const last = lastRecord.value;
  if (!last) return;
  changeDescription(last, chartNoteDraft.value);
}
function onNoteClick() {
  const last = lastRecord.value;
  if (!last) return;
  if (chartNoteOpen.value) {
    commitChartNote();
    chartNoteOpen.value = false;
    return;
  }
  chartNoteDraft.value = last.description ?? "";
  chartNoteOpen.value = true;
}
function onChartNoteInput(e: Event) {
  chartNoteDraft.value = (e.target as HTMLInputElement).value;
}
function onChartNoteBlur() {
  commitChartNote();
  chartNoteOpen.value = false;
}
function formatDuration(record: LifeRecord): string {
  if (record.endAt == null) return "—";
  const mins = Math.max(0, Math.round((record.endAt - record.recordedAt) / 60000));
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? `${m}m` : ""}` : `${m}m`;
}
</script>
<style src="./lifeRecordChart.css"></style>
<style src="./lifeRecordTable.css"></style>
<style scoped>
.toilet-day-chart__door {
  display: flex;
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  align-items: center;
  justify-content: center;
}
.lr-chart__icon :deep(.n-popover-trigger),
.lr-chart__icon :deep(.n-popconfirm) {
  display: block;
  width: 100%;
  height: 100%;
}
/* 下排锚点跟睡觉图（用户调过的值） */
.toilet-day-chart__start {
  left: calc(50% - var(--a) - 30px);
  top: calc(50% + var(--f) - 20px);
  font-size: 22px;
  font-weight: 500;
  font-family: Consolas, "Courier New", Courier, monospace;
  color: var(--color-text-primary);
  white-space: nowrap;
}
.toilet-day-chart__stop,
.toilet-day-chart__end {
  left: 50%;
  top: calc(50% + var(--f) - 20px);
  color: var(--color-text-primary);
}
.toilet-day-chart__stop {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.toilet-day-chart__end {
  font-size: 22px;
  font-weight: 500;
  font-family: Consolas, "Courier New", Courier, monospace;
  white-space: nowrap;
}
.toilet-day-chart__note {
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
.toilet-day-chart__stop:hover,
.toilet-day-chart__note:hover {
  opacity: 0.85;
}
.toilet-day-chart__ctrl-icon {
  display: block;
  width: 24px;
  height: 24px;
  font-size: 24px;
  line-height: 0;
  color: inherit;
}
.toilet-day-chart__ctrl-icon :deep(svg) {
  width: 1em;
  height: 1em;
  display: block;
}
.toilet-day-chart__input {
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
.toilet-day-table__th-stamp {
  cursor: pointer;
  user-select: none;
}
</style>
