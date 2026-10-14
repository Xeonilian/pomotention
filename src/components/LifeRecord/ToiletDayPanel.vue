<!--
  日视图上厕所：图/表尺寸走 LifeRecordDayFrame。
-->
<template>
  <LifeRecordDayFrame v-if="task" :view="view">
    <template #display>
      <div class="lr-chart">
        <button type="button" class="lr-chart__el lr-chart__icon" :title="`记一条${def.title}`" @click="append">
          <n-icon color="var(--color-text-secondary)" class="lr-chart__icon-glyph"><Door20Filled /></n-icon>
        </button>
        <span class="lr-chart__el lr-chart__times" aria-hidden="true">×</span>
        <span class="lr-chart__el lr-chart__count">{{ records.length }}</span>
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
            <th class="lr-day-table__col-last" title="做什么">
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
                placeholder="干什么"
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
import { Add20Regular, Delete20Regular, Door20Filled, Play20Regular, RecordStop20Regular, ShiftsActivity20Regular } from "@vicons/fluent";
import type { LifeRecord } from "@/core/types/Task";
import { useLifeRecordEditor } from "@/composables/lifeRecord/useLifeRecordEditor";
import LifeRecordDayFrame from "@/components/LifeRecord/LifeRecordDayFrame.vue";
const props = withDefaults(defineProps<{ taskId: number; embedded?: boolean; view?: "chart" | "table" }>(), {
  view: "chart",
});
const { task, records, def, hasOpenSpan, append, appendRow, stampStart, stampEnd, pickerTs, changeTime, changeDescription, remove } =
  useLifeRecordEditor(() => props.taskId, "toilet", { embedded: () => props.embedded });
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
.toilet-day-table__th-stamp {
  cursor: pointer;
  user-select: none;
}
</style>
