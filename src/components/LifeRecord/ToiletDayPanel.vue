<!--
  日视图活动（开门去干嘛）：图=门开段 + 最后一条（开始时间/停/备注）；表保持完整编辑。
-->
<template>
  <LifeRecordDayFrame v-if="task" :view="view" compact>
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
        <span class="lr-chart__el lr-chart__count">{{ closedCount }}</span>
        <div v-if="lastRecord" class="lr-chart__merge">
          <div class="lr-chart__row2">
            <LifeRecordTimePicker
              class="lr-chart__el lr-chart__time toilet-day-chart__start"
              :value="pickerTs(lastRecord.recordedAt)"
              format="HH:mm"
              size="small"
              :show-icon="false"
              :bordered="false"
              :clearable="false"
              to="body"
              :z-index="10000"
              title="开始"
              @update:value="(ts: number | null) => changeTime(lastRecord, 'recordedAt', ts)"
            />
            <button
              v-if="lastRecord && lastRecord.endAt == null"
              type="button"
              class="lr-chart__el toilet-day-chart__stop"
              title="结束（当前时间）"
              @click="stampEnd"
            >
              <n-icon class="toilet-day-chart__ctrl-icon"><RecordStop20Regular /></n-icon>
            </button>
            <LifeRecordTimePicker
              v-else-if="lastRecord"
              class="lr-chart__el lr-chart__time toilet-day-chart__end"
              :value="pickerTs(lastRecord.endAt)"
              format="HH:mm"
              size="small"
              :show-icon="false"
              :bordered="false"
              :clearable="false"
              to="body"
              :z-index="10000"
              title="结束"
              @update:value="(ts: number | null) => changeTime(lastRecord, 'endAt', ts)"
            />
            <div v-if="lastRecord" class="lr-chart__el lr-chart__score toilet-day-chart__energy">
              <LifeRecordScorePop
                :model-value="lastRecord.energy"
                title="精力值"
                :icon="BatterySaver20Regular"
                @update:model-value="(v) => changeEnergy(lastRecord, v)"
              />
            </div>
          </div>
          <LifeRecordChartNoteBar
            v-if="lastRecord"
            tone="toilet"
            :model-value="lastRecord.description ?? ''"
            placeholder="activity..."
            @update:model-value="onNoteBarInput"
          />
        </div>
      </div>
    </template>
    <template #table>
      <table class="lr-day-table">
        <colgroup>
          <col class="lr-day-table__col-action" />
          <col class="lr-day-table__col-time" />
          <col class="lr-day-table__col-time" />
          <col class="lr-day-table__col-dur" />
          <col class="lr-day-table__col-score" />
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
            <th class="lr-day-table__col-score" title="精力值">
              <n-icon :size="18" class="lr-day-table__th-icon"><BatterySaver20Regular /></n-icon>
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
              <LifeRecordTimePicker
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
              <LifeRecordTimePicker
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
            <td class="lr-day-table__col-score">
              <LifeRecordScorePop
                :model-value="record.energy"
                title="精力值"
                placement="bottom"
                @update:model-value="(v) => changeEnergy(record, v)"
              />
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
import { computed, ref } from "vue";
import { NIcon, NInput, NPopconfirm } from "naive-ui";
import {
  Add20Regular,
  BatterySaver20Regular,
  Delete20Regular,
  Door20Filled,
  Play20Regular,
  RecordStop20Regular,
  ShiftsActivity20Regular,
} from "@vicons/fluent";
import { isClosedLifeSpan } from "@/core/lifeRecord";
import type { LifeRecord } from "@/core/types/Task";
import { useLifeRecordEditor } from "@/composables/lifeRecord/useLifeRecordEditor";
import LifeRecordChartNoteBar from "@/components/LifeRecord/LifeRecordChartNoteBar.vue";
import LifeRecordScorePop from "@/components/LifeRecord/LifeRecordScorePop.vue";
import LifeRecordDayFrame from "@/components/LifeRecord/LifeRecordDayFrame.vue";
import LifeRecordTimePicker from "@/components/LifeRecord/LifeRecordTimePicker.vue";
const props = withDefaults(defineProps<{ taskId: number; embedded?: boolean; view?: "chart" | "table" }>(), {
  view: "chart",
});
const { task, records, hasOpenSpan, appendRow, stampStart, stampEnd, pickerTs, changeTime, changeDescription, changeEnergy, remove } =
  useLifeRecordEditor(() => props.taskId, "toilet", { embedded: () => props.embedded });
const lastRecord = computed(() => records.value[records.value.length - 1] ?? null);
const closedCount = computed(() => records.value.filter(isClosedLifeSpan).length);
const askEndOpen = ref(false);
function onDoorClick() {
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
function onNoteBarInput(v: string) {
  const last = lastRecord.value;
  if (last) changeDescription(last, v);
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
  top: calc(50% + var(--f) - var(--row2-shift));
}
.lr-day--mobile .toilet-day-chart__start {
  left: calc(50% - var(--a) - 40px);
}
.toilet-day-chart__stop,
.toilet-day-chart__end {
  left: 50%;
  top: calc(50% + var(--f) - var(--row2-shift));
  color: var(--color-text-primary);
}
.toilet-day-chart__stop {
  width: 60px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.toilet-day-chart__end {
  width: 72px;
}
.toilet-day-chart__energy {
  left: calc(50% + var(--c) + 25px);
}
.lr-day--mobile .toilet-day-chart__energy {
  left: calc(50% + var(--c) + 33px);
}
.toilet-day-chart__stop:hover {
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
.toilet-day-table__th-stamp {
  cursor: pointer;
  user-select: none;
}
</style>
