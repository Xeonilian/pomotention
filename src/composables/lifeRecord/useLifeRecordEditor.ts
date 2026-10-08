// 生活记录表单读写：窄槽与新建日面板共用。喝水/睡觉日面板仍各自读写，不经这里。
import { computed, toValue, type MaybeRefOrGetter } from "vue";
import type { LifeRecord } from "@/core/types/Task";
import { getLifeRecordDef, type LifeRecordKind } from "@/core/lifeRecord";
import { appendLifeRecord, updateLifeRecord } from "@/services/lifeRecord/lifeRecordService";
import { useDataStore } from "@/stores/useDataStore";
import { useDisplayedTaskStore } from "@/stores/useDisplayedTaskStore";
import { useSettingStore } from "@/stores/useSettingStore";

export function useLifeRecordEditor(taskId: MaybeRefOrGetter<number>, kind: MaybeRefOrGetter<LifeRecordKind>) {
  const dataStore = useDataStore();
  const displayStore = useDisplayedTaskStore();
  const settingStore = useSettingStore();

  const id = computed(() => toValue(taskId));
  const recordKind = computed(() => toValue(kind));

  const task = computed(() => dataStore.taskList.find((t) => t.id === id.value) ?? null);
  const records = computed<LifeRecord[]>(() =>
    [...(task.value?.lifeRecords ?? [])].sort((a, b) => a.recordedAt - b.recordedAt),
  );
  const def = computed(() => getLifeRecordDef(recordKind.value));
  const hasOpenSleep = computed(() => recordKind.value === "sleep" && records.value.some((r) => r.endAt == null));

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
    dataStore.updateTaskById(id.value, { lifeRecords: next });
  }

  function stampNow(): number {
    const anchor = rowDayAnchor.value;
    return isToday(anchor) ? Date.now() : withTimePart(anchor, Date.now());
  }

  function append() {
    const amountMl = recordKind.value === "drink" ? settingStore.settings.drinkCupMl : undefined;
    writeRecords(appendLifeRecord(task.value?.lifeRecords, recordKind.value, stampNow(), { amountMl }).next);
  }

  function changeRecordedAt(record: LifeRecord, ts: number | null) {
    if (ts == null) return;
    writeRecords(updateLifeRecord(records.value, record.id, { recordedAt: withTimePart(record.recordedAt, ts) }));
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
  }

  function changeDescription(record: LifeRecord, text: string) {
    writeRecords(updateLifeRecord(records.value, record.id, { description: text }));
  }

  function remove(record: LifeRecord) {
    dataStore.removeLifeRecordAt(id.value, record.id);
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
    hasOpenSleep,
    append,
    changeRecordedAt,
    changeEndAt,
    changeDescription,
    remove,
    discard,
    deselect,
  };
}
