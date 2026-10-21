// 生活记录日表/窄槽共用：打点时刻、追加行、段事件开闭、时间列编辑
import { computed, onUnmounted, ref, toValue, type MaybeRefOrGetter } from "vue";
import type { DrinkKind, LifeRecord } from "@/core/types/Task";
import { drinkKindOf, getLifeRecordDef, nextDrinkKind, nextEatCourse, type LifeRecordKind } from "@/core/lifeRecord";
import { debounce, getDayStartTimestamp } from "@/core/utils";
import { appendLifeRecord, resolveLifeSpanEndAt, updateLifeRecord, withTimePart } from "@/services/lifeRecord/lifeRecordService";
import {
  clampLifeScore,
  dropDayEnergyFromLife,
  lifeEnergyAt,
  lifeEnergyDayStart,
  upsertDayEnergyFromLife,
} from "@/services/lifeRecord/lifeEnergySync";
import { findDayEnergyTask } from "@/services/task/dayEnergyService";
import { useDataStore } from "@/stores/useDataStore";
import { useDisplayedTaskStore } from "@/stores/useDisplayedTaskStore";
import { useSettingStore } from "@/stores/useSettingStore";

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
  /** 备注草稿：画面马上跟上，停笔后再写库 */
  const descDrafts = new Map<number, { taskId: number; text: string; dayStart: number }>();
  const descDraftTick = ref(0);
  const records = computed<LifeRecord[]>(() => {
    descDraftTick.value;
    const list = [...(task.value?.lifeRecords ?? [])].sort((a, b) => a.recordedAt - b.recordedAt);
    if (descDrafts.size === 0) return list;
    const taskId = id.value;
    return list.map((r) => {
      const d = descDrafts.get(r.id);
      return d != null && d.taskId === taskId ? { ...r, description: d.text } : r;
    });
  });
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
  function persistDescDrafts() {
    if (descDrafts.size === 0) return;
    const pending = [...descDrafts.entries()];
    descDrafts.clear();
    descDraftTick.value++;
    for (const [recordId, { taskId, text }] of pending) {
      const list = dataStore.taskList.find((t) => t.id === taskId)?.lifeRecords ?? [];
      const next = updateLifeRecord(list, recordId, { description: text });
      if (!next) continue;
      dataStore.updateTaskById(taskId, { lifeRecords: next });
      const rec = next.find((r) => r.id === recordId);
      if (rec?.energyRecordId != null) {
        syncLinkedEnergy({ ...rec, description: text }, rec.energy);
      }
    }
  }
  const flushDescDrafts = debounce(persistDescDrafts, 400);
  function writeRecords(next: LifeRecord[] | null) {
    if (!next) return;
    let merged = next;
    if (descDrafts.size > 0) {
      const taskId = id.value;
      for (const [recordId, d] of [...descDrafts]) {
        if (d.taskId !== taskId) continue;
        merged = updateLifeRecord(merged, recordId, { description: d.text }) ?? merged;
        descDrafts.delete(recordId);
      }
      if (descDrafts.size === 0) flushDescDrafts.cancel();
      descDraftTick.value++;
    }
    dataStore.updateTaskById(id.value, { lifeRecords: merged });
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
    const recordedAt = withTimePart(base, ts);
    const patch: { recordedAt: number; endAt?: number } = { recordedAt };
    if (record.endAt != null) patch.endAt = resolveLifeSpanEndAt(recordedAt, record.endAt);
    writeRecords(updateLifeRecord(records.value, record.id, patch));
    if (record.energyRecordId != null) {
      syncLinkedEnergy({ ...record, ...patch }, record.energy);
    }
  }
  function changeEndAt(record: LifeRecord, ts: number | null) {
    // 时间选择器偶发 null：不当成清空，否则会丢掉已有结束、表上没有 duration
    if (ts == null) return;
    const nextTs = resolveLifeSpanEndAt(record.recordedAt, ts);
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
    descDrafts.set(record.id, { taskId: id.value, text, dayStart: displayDayStart.value });
    descDraftTick.value++;
    flushDescDrafts();
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
  function dropEnergyFromDay(dayStart: number, energyRecordId: number | undefined) {
    const host = findDayEnergyTask(dayStart, dataStore.taskList);
    if (!host) return;
    const next = dropDayEnergyFromLife(host.energyRecords, energyRecordId);
    if (next) dataStore.updateTaskById(host.id, { energyRecords: next });
  }
  function hostEnergyTask(record: Pick<LifeRecord, "recordedAt" | "endAt">) {
    return dataStore.ensureDayEnergyTask(lifeEnergyDayStart(record));
  }
  function syncLinkedEnergy(record: LifeRecord, value: number | undefined) {
    if (value == null || record.energyRecordId == null) return;
    const targetDay = lifeEnergyDayStart(record);
    if (displayDayStart.value !== targetDay) dropEnergyFromDay(displayDayStart.value, record.energyRecordId);
    const host = dataStore.ensureDayEnergyTask(targetDay);
    const { next, energyRecord } = upsertDayEnergyFromLife(host.energyRecords, record, value, lifeEnergyAt(record));
    dataStore.updateTaskById(host.id, { energyRecords: next });
    if (energyRecord.id !== record.energyRecordId) {
      writeRecords(updateLifeRecord(records.value, record.id, { energyRecordId: energyRecord.id }));
    }
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
    const targetDay = lifeEnergyDayStart(record);
    if (displayDayStart.value !== targetDay) dropEnergyFromDay(displayDayStart.value, record.energyRecordId);
    const host = hostEnergyTask(record);
    const { next, energyRecord } = upsertDayEnergyFromLife(host.energyRecords, record, v, lifeEnergyAt(record));
    dataStore.updateTaskById(host.id, { energyRecords: next });
    writeRecords(updateLifeRecord(records.value, record.id, { energy: v, energyRecordId: energyRecord.id }));
  }
  function unlinkEnergy(record: LifeRecord) {
    const days = new Set([displayDayStart.value, lifeEnergyDayStart(record)]);
    for (const day of days) dropEnergyFromDay(day, record.energyRecordId);
  }
  function remove(record: LifeRecord) {
    descDrafts.delete(record.id);
    unlinkEnergy(record);
    dataStore.removeLifeRecordAt(id.value, record.id, { keepEmptyBucket: embedded.value });
  }
  function discard() {
    descDrafts.clear();
    flushDescDrafts.cancel();
    dataStore.discardLifeRecordTask(id.value);
  }
  function deselect() {
    dataStore.cleanSelection();
    displayStore.snapToEmptySlot();
  }
  onUnmounted(() => {
    flushDescDrafts.flush();
  });
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
    /** 退出输入时立刻把备注草稿写入，不等停笔防抖 */
    flushDescriptions: () => flushDescDrafts.flush(),
    changeHunger,
    changeSatiety,
    changeEnergy,
    remove,
    discard,
    deselect,
    pickerTs,
  };
}
