// 生活记录日表/窄槽共用：打点时刻、追加行、段事件开闭、时间列编辑
import { computed, onUnmounted, ref, toValue, type MaybeRefOrGetter } from "vue";
import type { DrinkKind, LifeRecord } from "@/core/types/Task";
import { drinkKindOf, getLifeRecordDef, nextDrinkKind, nextEatCourse, parseLifeRecordPlaceholder, type LifeRecordKind } from "@/core/lifeRecord";
import { debounce, getDayStartTimestamp } from "@/core/utils";
import {
  appendLifeRecord,
  findLifeRecordTasksForDay,
  lifeRecordOwnerTaskId,
  mergeBucketLifeRecords,
  resolveLifeSpanEndAt,
  updateLifeRecord,
  withTimePart,
} from "@/services/lifeRecord/lifeRecordService";
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
  /** 同一天同一类的全部日桶。绑定的是列表里第一只，其余是别的设备建的。 */
  const bucketTasks = computed(() => {
    const bound = task.value;
    if (!bound) return [];
    const activity = dataStore.activityById.get(bound.sourceId);
    const titledDay = parseLifeRecordPlaceholder(bound.activityTitle ?? activity?.title)?.dayStart;
    const dayStart = titledDay ?? plannerDayStart();
    const all = findLifeRecordTasksForDay(dataStore.taskList, recordKind.value, dayStart, dataStore.activityById);
    return all.length > 0 ? all : [bound];
  });
  /** 备注草稿：画面马上跟上，停笔后再写库。taskId 是这条记录所在的桶，不是面板绑定的那只。 */
  const descDrafts = new Map<number, { taskId: number; text: string; dayStart: number }>();
  const descDraftTick = ref(0);
  const records = computed<LifeRecord[]>(() => {
    descDraftTick.value;
    const list = mergeBucketLifeRecords(bucketTasks.value);
    if (descDrafts.size === 0) return list;
    return list.map((r) => {
      const d = descDrafts.get(r.id);
      const ownerId = lifeRecordOwnerTaskId(bucketTasks.value, r.id, id.value);
      return d != null && d.taskId === ownerId ? { ...r, description: d.text } : r;
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
  function ownerTaskId(recordId: number): number {
    return lifeRecordOwnerTaskId(bucketTasks.value, recordId, id.value);
  }
  /** 只改这一只桶自己的数组。合并结果不能写回去，否则另一只桶还在，图层会算两遍。 */
  function replaceTaskRecords(taskId: number, next: LifeRecord[]) {
    let merged = next;
    if (descDrafts.size > 0) {
      for (const [recordId, d] of [...descDrafts]) {
        if (d.taskId !== taskId) continue;
        merged = updateLifeRecord(merged, recordId, { description: d.text }) ?? merged;
        descDrafts.delete(recordId);
      }
      if (descDrafts.size === 0) flushDescDrafts.cancel();
      descDraftTick.value++;
    }
    dataStore.updateTaskById(taskId, { lifeRecords: merged });
  }
  function patchOnOwner(recordId: number, produce: (list: LifeRecord[]) => LifeRecord[] | null) {
    const taskId = ownerTaskId(recordId);
    const list = dataStore.taskList.find((t) => t.id === taskId)?.lifeRecords ?? [];
    const next = produce(list);
    if (!next) return;
    replaceTaskRecords(taskId, next);
  }
  function patchRecord(
    recordId: number,
    patch: Parameters<typeof updateLifeRecord>[2],
  ) {
    patchOnOwner(recordId, (list) => updateLifeRecord(list, recordId, patch));
  }
  /** + / 表头打点：当前时分落在显示日（四表一致） */
  function stampNow(): number {
    const at = dataStore.dateService.combineDateAndTime(displayDayStart.value, Date.now());
    return Number.isFinite(at) ? at : Date.now();
  }
  /** 新行只追加到面板绑定的那只桶。未闭合段若在别的桶上，就地补结束时间。 */
  function writeAppend(alwaysNew = false) {
    const amountMl = recordKind.value === "drink" ? settingStore.settings.drinkCupMl : undefined;
    const eatCourse = recordKind.value === "eat" ? ("meal" as const) : undefined;
    const kind = recordKind.value;
    const primaryList = task.value?.lifeRecords;
    if (!alwaysNew && (kind === "sleep" || kind === "toilet")) {
      const primaryOpen = [...(primaryList ?? [])].reverse().find((record) => record.endAt == null);
      if (!primaryOpen) {
        let open: LifeRecord | undefined;
        for (const bucket of bucketTasks.value) {
          if (bucket.id === id.value) continue;
          for (let i = (bucket.lifeRecords?.length ?? 0) - 1; i >= 0; i--) {
            const record = bucket.lifeRecords![i];
            if (record.endAt != null) continue;
            if (!open || record.recordedAt >= open.recordedAt) open = record;
          }
        }
        if (open) {
          patchRecord(open.id, { endAt: resolveLifeSpanEndAt(open.recordedAt, stampNow()) });
          return;
        }
      }
    }
    let { next, record } = appendLifeRecord(primaryList, kind, stampNow(), { amountMl, eatCourse, alwaysNew });
    const taken = new Set<number>();
    for (const bucket of bucketTasks.value) {
      if (bucket.id === id.value) continue;
      for (const row of bucket.lifeRecords ?? []) taken.add(row.id);
    }
    if (taken.has(record.id)) {
      let nid = record.id + 1;
      const ids = new Set(next.map((row) => row.id));
      while (taken.has(nid) || ids.has(nid)) nid++;
      next = next.map((row) => (row.id === record.id ? { ...row, id: nid } : row));
    }
    replaceTaskRecords(id.value, next);
  }
  function append() {
    writeAppend(false);
  }
  /** 表格 +：新开一行并写开始时间，不把未闭合段写成结束 */
  function appendRow() {
    writeAppend(true);
  }
  function toggleEatCourse(record: LifeRecord) {
    patchRecord(record.id, { eatCourse: nextEatCourse(record.eatCourse) });
  }
  function changeDrinkKind(record: LifeRecord, kind: DrinkKind) {
    patchRecord(record.id, { drinkKind: kind });
  }
  function toggleDrinkKind(record: LifeRecord) {
    patchRecord(record.id, { drinkKind: nextDrinkKind(drinkKindOf(record)) });
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
    patchRecord(record.id, patch);
    if (record.energyRecordId != null) {
      syncLinkedEnergy({ ...record, ...patch }, record.energy);
    }
  }
  function changeEndAt(record: LifeRecord, ts: number | null) {
    // 时间选择器偶发 null：不当成清空，否则会丢掉已有结束、表上没有 duration
    if (ts == null) return;
    const nextTs = resolveLifeSpanEndAt(record.recordedAt, ts);
    patchRecord(record.id, { endAt: nextTs });
    if (record.energyRecordId != null) {
      syncLinkedEnergy({ ...record, endAt: nextTs }, record.energy);
    }
  }
  function changeTime(record: LifeRecord, field: "recordedAt" | "endAt", ts: number | null) {
    if (field === "endAt") changeEndAt(record, ts);
    else changeRecordedAt(record, ts);
  }
  function changeDescription(record: LifeRecord, text: string) {
    descDrafts.set(record.id, { taskId: ownerTaskId(record.id), text, dayStart: displayDayStart.value });
    descDraftTick.value++;
    flushDescDrafts();
  }
  function changeEatFeel(record: LifeRecord, field: "hunger" | "satiety", value: number | null) {
    if (value == null) {
      patchOnOwner(record.id, (list) =>
        list.map((r) => {
          if (r.id !== record.id) return r;
          const next = { ...r };
          delete next[field];
          return next;
        }),
      );
      return;
    }
    patchRecord(record.id, { [field]: clampLifeScore(value) });
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
      patchRecord(record.id, { energyRecordId: energyRecord.id });
    }
  }
  function changeEnergy(record: LifeRecord, value: number | null) {
    if (value == null) {
      unlinkEnergy(record);
      patchOnOwner(record.id, (list) =>
        list.map((r) => {
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
    patchRecord(record.id, { energy: v, energyRecordId: energyRecord.id });
  }
  function unlinkEnergy(record: LifeRecord) {
    const days = new Set([displayDayStart.value, lifeEnergyDayStart(record)]);
    for (const day of days) dropEnergyFromDay(day, record.energyRecordId);
  }
  function remove(record: LifeRecord) {
    descDrafts.delete(record.id);
    unlinkEnergy(record);
    dataStore.removeLifeRecordAt(ownerTaskId(record.id), record.id, { keepEmptyBucket: embedded.value });
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
    patchRecord,
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
