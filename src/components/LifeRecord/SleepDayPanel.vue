<!--
  日视图睡觉：图=月亮开段 + 最后一条（开始时间/停/云朵记梦）；表保持完整编辑。
-->
<template>
  <LifeRecordDayFrame v-if="task" :view="view" compact :note-open="chartDreamOpen">
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
              <button type="button" class="sleep-day-chart__moon" title="睡觉" @click="onMoonClick">
                <n-icon class="lr-chart__icon-glyph" color="var(--color-yellow-dark)">
                  <WeatherMoon20Filled />
                </n-icon>
              </button>
            </template>
            上次睡觉结束了吗？
          </n-popconfirm>
        </div>
        <span class="lr-chart__el lr-chart__times" aria-hidden="true">×</span>
        <span class="lr-chart__el lr-chart__count">{{ records.length }}</span>
        <n-time-picker
          v-if="lastRecord"
          class="lr-chart__el lr-chart__time sleep-day-chart__start"
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
          class="lr-chart__el sleep-day-chart__stop"
          title="醒了（当前时间）"
          @click="stampEnd"
        >
          <n-icon class="sleep-day-chart__ctrl-icon"><RecordStop20Regular /></n-icon>
        </button>
        <n-time-picker
          v-else-if="lastRecord"
          class="lr-chart__el lr-chart__time sleep-day-chart__end"
          :value="pickerTs(lastRecord.endAt)"
          format="HH:mm"
          size="small"
          :show-icon="false"
          :bordered="false"
          :clearable="false"
          to="body"
          :z-index="10000"
          title="醒了"
          @update:value="(ts: number | null) => changeTime(lastRecord, 'endAt', ts)"
        />
        <div v-if="lastRecord" class="lr-chart__el lr-chart__score sleep-day-chart__energy">
          <LifeRecordScorePop
            :model-value="lastRecord.energy"
            title="精力值"
            :icon="BatterySaver20Regular"
            @update:model-value="(v) => changeEnergy(lastRecord, v)"
          />
        </div>
        <LifeRecordChartNoteBar
          v-if="lastRecord"
          tone="sleep"
          expandable
          :model-value="lastRecord.description ?? ''"
          placeholder="dream..."
          @update:model-value="onNoteBarInput"
          @expand="chartDreamOpen = true"
          @collapse="chartDreamOpen = false"
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
            <th class="lr-day-table__col-score" title="精力值">
              <n-icon :size="18" class="lr-day-table__th-icon"><BatterySaver20Regular /></n-icon>
            </th>
            <th class="lr-day-table__col-last" title="梦">
              <n-icon :size="18" color="var(--color-yellow-dark)" class="lr-day-table__th-icon"><WeatherMoon20Filled /></n-icon>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="record in records" :key="record.id" :class="{ 'sleep-day-table__row--dream-active': dreamRecordId === record.id }">
            <td class="lr-day-table__col-action">
              <button
                type="button"
                class="lr-day-table__cell-btn lr-day-table__cell-btn--danger"
                title="删除这条"
                @click="onRemove(record)"
              >
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
            <td class="lr-day-table__col-score">
              <LifeRecordScorePop
                :model-value="record.energy"
                title="精力值"
                placement="bottom"
                @update:model-value="(v) => changeEnergy(record, v)"
              />
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
import { NIcon, NPopconfirm, NTimePicker } from "naive-ui";
import {
  Add20Regular,
  BatterySaver20Regular,
  Delete20Regular,
  Play20Regular,
  RecordStop20Regular,
  ShiftsActivity20Regular,
  WeatherMoon20Filled,
} from "@vicons/fluent";
import type { LifeRecord } from "@/core/types/Task";
import { useLifeRecordEditor } from "@/composables/lifeRecord/useLifeRecordEditor";
import LifeRecordChartNoteBar from "@/components/LifeRecord/LifeRecordChartNoteBar.vue";
import LifeRecordScorePop from "@/components/LifeRecord/LifeRecordScorePop.vue";
import LifeRecordDayFrame from "@/components/LifeRecord/LifeRecordDayFrame.vue";
const props = withDefaults(defineProps<{ taskId: number; embedded?: boolean; view?: "chart" | "table" }>(), {
  view: "chart",
});
const {
  task,
  records,
  hasOpenSleep,
  appendRow,
  stampStart,
  stampEnd,
  pickerTs,
  changeTime,
  changeDescription,
  changeEnergy,
  remove: removeRecord,
} = useLifeRecordEditor(() => props.taskId, "sleep", { embedded: () => props.embedded });
const lastRecord = computed(() => records.value[records.value.length - 1] ?? null);
const askEndOpen = ref(false);
const chartDreamOpen = ref(false);
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
  ta.focus({ preventScroll: true });
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
function onMoonClick() {
  if (hasOpenSleep.value) {
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
function onActivateDream(record: LifeRecord) {
  if (dreamRecordId.value === record.id) {
    dreamRecordId.value = null;
    return;
  }
  dreamRecordId.value = record.id;
}
function onDreamInput(e: Event) {
  const rec = dreamRecord.value;
  if (!rec) return;
  changeDescription(rec, (e.target as HTMLTextAreaElement).value);
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
.sleep-day-chart__moon {
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
/* 下排与喝水 sum / slash / goal 同锚：a、中、c × f */
.sleep-day-chart__start {
  left: calc(50% - var(--a) - 30px);
  top: calc(50% + var(--f) - var(--row2-shift));
}
.sleep-day-chart__stop,
.sleep-day-chart__end {
  left: 50%;
  top: calc(50% + var(--f) - var(--row2-shift));
  color: var(--color-text-primary);
}
.sleep-day-chart__stop {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.sleep-day-chart__end {
  width: 72px;
}
.sleep-day-chart__energy {
  left: calc(50% + var(--c) + 25px);
}
.sleep-day-chart__stop:hover {
  opacity: 0.85;
}
.sleep-day-chart__ctrl-icon {
  display: block;
  width: 28px;
  height: 28px;
  font-size: 28px;
  line-height: 0;
  color: inherit;
}
.sleep-day-chart__ctrl-icon :deep(svg) {
  width: 1em;
  height: 1em;
  display: block;
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
