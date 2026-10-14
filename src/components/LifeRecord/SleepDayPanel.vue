<!--
  日视图睡觉：大月亮 + 记录表；点「梦」后输入框贴在表下面。尺寸走 LifeRecordDayFrame。
-->
<template>
  <LifeRecordDayFrame v-if="task" :view="view">
    <template #display>
      <div class="lr-chart" :title="hasOpenSleep ? '醒了（当前时间）' : '睡了（当前时间）'">
        <button
          type="button"
          class="lr-chart__el lr-chart__icon"
          :title="hasOpenSleep ? '醒了（当前时间）' : '睡了（当前时间）'"
          @click="append"
        >
          <n-icon class="lr-chart__icon-glyph" color="var(--color-yellow-dark)">
            <WeatherMoon20Filled />
          </n-icon>
        </button>
        <span class="lr-chart__el lr-chart__times" aria-hidden="true">×</span>
        <span class="lr-chart__el lr-chart__count">{{ records.length }}</span>
        <span class="lr-chart__el lr-chart__stat sleep-day-chart__sum" :title="'合计 ' + totalDurationLabel">{{ totalDurationLabel }}</span>
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
              class="lr-day-table__col-time sleep-day-table__th-stamp"
              :class="{ 'sleep-day-table__th-stamp--active': !hasOpenSleep }"
              title="睡了：填入当前时间"
              @click="stampStart"
            >
              <n-icon :size="18" class="lr-day-table__th-icon"><Play20Regular /></n-icon>
            </th>
            <th
              class="lr-day-table__col-time sleep-day-table__th-stamp"
              :class="{ 'sleep-day-table__th-stamp--active': hasOpenSleep }"
              title="醒了：填入当前时间"
              @click="stampEnd"
            >
              <n-icon :size="18" class="lr-day-table__th-icon"><RecordStop20Regular /></n-icon>
            </th>
            <th class="lr-day-table__col-dur" title="时长">
              <n-icon :size="18" class="lr-day-table__th-icon"><ShiftsActivity20Regular /></n-icon>
            </th>
            <th class="lr-day-table__col-last" title="梦">
              <n-icon :size="18" color="var(--color-yellow-dark)" class="lr-day-table__th-icon"><WeatherMoon20Filled /></n-icon>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in records" :key="record.id" :class="{ 'sleep-day-table__row--dream-active': dreamRecordId === record.id }">
            <td class="lr-day-table__col-action">
              <button type="button" class="lr-day-table__cell-btn lr-day-table__cell-btn--danger" title="删除这条" @click="onRemove(record)">
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
              <button
                type="button"
                class="sleep-day-table__dream-chip"
                :class="{ 'sleep-day-table__dream-chip--active': dreamRecordId === record.id }"
                :title="record.description?.trim() ? record.description : '记录梦'"
                @click="onActivateDream(record)"
              >
                {{ dreamChipLabel(record) }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      <textarea
        v-if="dreamRecord"
        ref="dreamTextareaRef"
        class="sleep-day-dream__editor"
        :value="dreamRecord.description ?? ''"
        placeholder="梦什么"
        rows="6"
        @input="onDreamInput"
      />
    </template>
  </LifeRecordDayFrame>
</template>
<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { NIcon, NTimePicker } from "naive-ui";
import {
  Add20Regular,
  Delete20Regular,
  Play20Regular,
  RecordStop20Regular,
  ShiftsActivity20Regular,
  WeatherMoon20Filled,
} from "@vicons/fluent";
import type { LifeRecord } from "@/core/types/Task";
import { updateLifeRecord } from "@/services/lifeRecord/lifeRecordService";
import { useDataStore } from "@/stores/useDataStore";
import { useLifeRecordEditor } from "@/composables/lifeRecord/useLifeRecordEditor";
import LifeRecordDayFrame from "@/components/LifeRecord/LifeRecordDayFrame.vue";
const props = withDefaults(defineProps<{ taskId: number; embedded?: boolean; view?: "chart" | "table" }>(), {
  view: "chart",
});
const dataStore = useDataStore();
const { task, records, hasOpenSleep, append, appendRow, stampStart, stampEnd, pickerTs, changeTime, remove: removeRecord } =
  useLifeRecordEditor(() => props.taskId, "sleep", { embedded: () => props.embedded });
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
function writeRecords(next: LifeRecord[] | null) {
  if (!next) return;
  dataStore.updateTaskById(props.taskId, { lifeRecords: next });
}
function onActivateDream(record: LifeRecord) {
  if (dreamRecordId.value === record.id) {
    dreamRecordId.value = null;
    return;
  }
  dreamRecordId.value = record.id;
}
function onDreamInput(e: Event) {
  const id = dreamRecordId.value;
  if (id == null) return;
  const v = (e.target as HTMLTextAreaElement).value;
  writeRecords(updateLifeRecord(records.value, id, { description: v }));
}
function onRemove(record: LifeRecord) {
  if (dreamRecordId.value === record.id) dreamRecordId.value = null;
  removeRecord(record);
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
  if (!t) return "梦什么";
  return t.length > 12 ? `${t.slice(0, 12)}…` : t;
}
</script>
<style src="./lifeRecordChart.css"></style>
<style src="./lifeRecordTable.css"></style>
<style scoped>
.sleep-day-chart__sum {
  color: var(--color-yellow-dark);
}
.sleep-day-table__th-stamp {
  cursor: pointer;
  user-select: none;
}
.sleep-day-table__row--dream-active {
  background: var(--color-yellow-light-transparent);
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
