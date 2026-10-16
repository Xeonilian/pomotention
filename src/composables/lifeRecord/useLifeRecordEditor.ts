// 生活记录日表/窄槽共用：打点时刻、追加行、段事件开闭、时间列编辑
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import type { DrinkKind, LifeRecord } from "@/core/types/Task";
import { drinkKindOf, getLifeRecordDef, nextDrinkKind, nextEatCourse, type LifeRecordKind } from "@/core/lifeRecord";
import { getDayStartTimestamp } from "@/core/utils";
import { appendLifeRecord, updateLifeRecord } from "@/services/lifeRecord/lifeRecordService";
import { clampLifeScore, dropDayEnergyFromLife, lifeEnergyAt, upsertDayEnergyFromLife } from "@/services/lifeRecord/lifeEnergySync";
import { findDayEnergyTask } from "@/services/task/dayEnergyService";
import { useDataStore } from "@/stores/useDataStore";
import { useDisplayedTaskStore } from "@/stores/useDisplayedTaskStore";
import { useSettingStore } from "@/stores/useSettingStore";

/** 用 time 的时分替换 date 的时分（编辑只动时刻、不动日期） */
function withTimePart(dateTs: number, timeTs: number): number {
  const d = new Date(dateTs);
  const t = new Date(timeTs);
  d.setHours(t.getHours(), t.getMinutes(), 0, 0);
  return d.getTime();
}

export function useLifeRecordEditor(
  taskId: MaybeRefOrGetter<number>,
  kind: MaybeRefOrGetter<LifeRecordKind>,
  options?: { embedded?: MaybeRefOrGetter<boolean> },
) {
  const dataStore = useDataStore();
  const displayStore = useDisplayedTaskStore();
  const settingStore = useSettingStore();
  const id = computed(() => toValue(taskId));
  const recordKind = computed(() => toValue(kind));
  const embedded = computed(() => toValue(options?.embedded ?? false));
  const task = computed(() => dataStore.taskList.find((t) => t.id === id.value) ?? null);
  const records = computed<LifeRecord[]>(() =>
    [...(task.value?.lifeRecords ?? [])].sort((a, b) => a.recordedAt - b.recordedAt),
  );
  const def = computed(() => getLifeRecordDef(recordKind.value));
  const hasOpenSpan = computed(
    () => (recordKind.value === "sleep" || recordKind.value === "toilet") && records.value.some((r) => r.endAt == null),
  );
  function plannerDayStart(): number {
    const raw = dataStore.dateService.appDateTimestamp as number | { value: number };
    const dayStart = typeof raw === "number" ? raw : raw?.value;
    return Number.isFinite(dayStart) ? dayStart : getDayStartTimestamp(Date.now());
  }
  /** 显示日锚点：todo.id；缺 todo 时落到当前 planner 日 + 此刻时分 */
  const rowDayAnchor = computed(() => {
    const t = task.value;
    const dayStart = plannerDayStart();
    const fallback = () => dataStore.dateService.combineDateAndTime(dayStart, Date.now());
    if (!t) return fallback();
    return dataStore.todoByActivityId.get(t.sourceId)?.id ?? fallback();
  });
  const displayDayStart = computed(() => getDayStartTimestamp(rowDayAnchor.value));
  function writeRecords(next: LifeRecord[] | null) {
    if (!next) return;
    dataStore.updateTaskById(id.value, { lifeRecords: next });
  }
  /** + / 表头打点：当前时分落在显示日（四表一致） */
  function stampNow(): number {
    const at = dataStore.dateService.combineDateAndTime(displayDayStart.value, Date.now());
    return Number.isFinite(at) ? at : Date.now();
  }
  function writeAppend(alwaysNew = false) {
    const amountMl = recordKind.value === "drink" ? settingStore.settings.drinkCupMl : undefined;
    const eatCourse = recordKind.value === "eat" ? ("meal" as const) : undefined;
    writeRecords(
      appendLifeRecord(task.value?.lifeRecords, recordKind.value, stampNow(), {
        amountMl,
        eatCourse,
        alwaysNew,
      }).next,
    );
  }
  function append() {
    writeAppend(false);
  }
  /** 表格 +：新开一行并写开始时间，不把未闭合段写成结束 */
  function appendRow() {
    writeAppend(true);
  }
  function toggleEatCourse(record: LifeRecord) {
    writeRecords(updateLifeRecord(records.value, record.id, { eatCourse: nextEatCourse(record.eatCourse) }));
  }
  function changeDrinkKind(record: LifeRecord, kind: DrinkKind) {
    writeRecords(updateLifeRecord(records.value, record.id, { drinkKind: kind }));
  }
  function toggleDrinkKind(record: LifeRecord) {
    writeRecords(updateLifeRecord(records.value, record.id, { drinkKind: nextDrinkKind(drinkKindOf(record)) }));
  }
  function stampStart() {
    if (hasOpenSpan.value) return;
    append();
  }
  function stampEnd() {
    if (!hasOpenSpan.value) return;
    append();
  }
  /** n-time-picker :value：时刻对齐显示日，避免补记日空白 */
  function pickerTs(ts: number | null | undefined): number | null {
    if (ts == null || !Number.isFinite(ts)) return null;
    const v = dataStore.dateService.combineDateAndTime(displayDayStart.value, ts);
    return Number.isFinite(v) ? v : null;
  }
  function changeRecordedAt(record: LifeRecord, ts: number | null) {
    if (ts == null) return;
    const base = Number.isFinite(record.recordedAt) ? record.recordedAt : displayDayStart.value;
    writeRecords(updateLifeRecord(records.value, record.id, { recordedAt: withTimePart(base, ts) }));
  }
  function changeEndAt(record: LifeRecord, ts: number | null) {
    if (ts == null) {
      writeRecords(updateLifeRecord(records.value, record.id, { endAt: undefined }));
      return;
    }
    const base = record.endAt ?? record.recordedAt;
    let nextTs = withTimePart(base, ts);
    if (nextTs <= record.recordedAt) nextTs += 86400000;
    writeRecords(updateLifeRecord(records.value, record.id, { endAt: nextTs }));
    if (record.energyRecordId != null) {
      syncLinkedEnergy({ ...record, endAt: nextTs }, record.energy);
    }
  }
  function changeTime(record: LifeRecord, field: "recordedAt" | "endAt", ts: number | null) {
    if (field === "endAt") changeEndAt(record, ts);
    else changeRecordedAt(record, ts);
  }
  function changeDescription(record: LifeRecord, text: string) {
    writeRecords(updateLifeRecord(records.value, record.id, { description: text }));
    if (record.energyRecordId != null) {
      syncLinkedEnergy({ ...record, description: text }, record.energy);
    }
  }
  function changeEatFeel(record: LifeRecord, field: "hunger" | "satiety", value: number | null) {
    if (value == null) {
      writeRecords(
        records.value.map((r) => {
          if (r.id !== record.id) return r;
          const next = { ...r };
          delete next[field];
          return next;
        }),
      );
      return;
    }
    writeRecords(updateLifeRecord(records.value, record.id, { [field]: clampLifeScore(value) }));
  }
  function changeHunger(record: LifeRecord, value: number | null) {
    changeEatFeel(record, "hunger", value);
  }
  function changeSatiety(record: LifeRecord, value: number | null) {
    changeEatFeel(record, "satiety", value);
  }
  function hostEnergyTask() {
    return dataStore.ensureDayEnergyTask(displayDayStart.value);
  }
  function syncLinkedEnergy(record: LifeRecord, value: number | undefined) {
    if (value == null || record.energyRecordId == null) return;
    const host = findDayEnergyTask(displayDayStart.value, dataStore.taskList);
    if (!host) return;
    const { next } = upsertDayEnergyFromLife(host.energyRecords, record, value, lifeEnergyAt(record));
    dataStore.updateTaskById(host.id, { energyRecords: next });
  }
  function changeEnergy(record: LifeRecord, value: number | null) {
    if (value == null) {
      unlinkEnergy(record);
      writeRecords(
        records.value.map((r) => {
          if (r.id !== record.id) return r;
          const next = { ...r };
          delete next.energy;
          delete next.energyRecordId;
          return next;
        }),
      );
      return;
    }
    const v = clampLifeScore(value);
    const host = hostEnergyTask();
    const { next, energyRecord } = upsertDayEnergyFromLife(host.energyRecords, record, v, lifeEnergyAt(record));
    dataStore.updateTaskById(host.id, { energyRecords: next });
    writeRecords(updateLifeRecord(records.value, record.id, { energy: v, energyRecordId: energyRecord.id }));
  }
  function unlinkEnergy(record: LifeRecord) {
    const host = findDayEnergyTask(displayDayStart.value, dataStore.taskList);
    if (!host) return;
    const next = dropDayEnergyFromLife(host.energyRecords, record.energyRecordId);
    if (next) dataStore.updateTaskById(host.id, { energyRecords: next });
  }
  function remove(record: LifeRecord) {
    unlinkEnergy(record);
    dataStore.removeLifeRecordAt(id.value, record.id, { keepEmptyBucket: embedded.value });
  }
  function discard() {
    dataStore.discardLifeRecordTask(id.value);
  }
  function deselect() {
    dataStore.cleanSelection();
    displayStore.snapToEmptySlot();
  }
  return {
    task,
    records,
    def,
    hasOpenSleep: hasOpenSpan,
    hasOpenSpan,
    append,
    appendRow,
    toggleEatCourse,
    changeDrinkKind,
    toggleDrinkKind,
    stampStart,
    stampEnd,
    changeRecordedAt,
    changeEndAt,
    changeTime,
    changeDescription,
    changeHunger,
    changeSatiety,
    changeEnergy,
    remove,
    discard,
    deselect,
    pickerTs,
  };
}
