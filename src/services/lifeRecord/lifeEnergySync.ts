// 生活条精力分 ↔ 当日 energy 桶：纯函数，不碰 store
import type { EnergyRecord, LifeRecord } from "@/core/types/Task";

export function clampLifeScore(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value)));
}

/** 段事件用结束时刻；未结束用开始 */
export function lifeEnergyAt(record: Pick<LifeRecord, "recordedAt" | "endAt">): number {
  return record.endAt ?? record.recordedAt;
}

function withLifeDescription(record: EnergyRecord, life: Pick<LifeRecord, "description">): EnergyRecord {
  const next = { ...record };
  const text = (life.description ?? "").trim();
  if (text) next.description = text;
  else delete next.description;
  return next;
}

/** 改分或新建一条；描述跟生活条走（空则清掉） */
export function upsertDayEnergyFromLife(
  energyRecords: EnergyRecord[] | undefined,
  life: Pick<LifeRecord, "energyRecordId" | "description">,
  value: number,
  at: number,
): { next: EnergyRecord[]; energyRecord: EnergyRecord } {
  const v = clampLifeScore(value);
  const list = energyRecords ?? [];
  const existingId = life.energyRecordId;
  if (existingId != null) {
    const i = list.findIndex((r) => r.id === existingId);
    if (i >= 0) {
      const energyRecord = withLifeDescription({ ...list[i], value: v, recordedAt: at }, life);
      const next = [...list];
      next[i] = energyRecord;
      return { next, energyRecord };
    }
  }
  let id = Date.now();
  while (list.some((r) => r.id === id)) id++;
  const energyRecord = withLifeDescription({ id, value: v, recordedAt: at }, life);
  return { next: [...list, energyRecord], energyRecord };
}

export function dropDayEnergyFromLife(
  energyRecords: EnergyRecord[] | undefined,
  energyRecordId: number | undefined,
): EnergyRecord[] | null {
  if (energyRecordId == null) return null;
  const list = energyRecords ?? [];
  const next = list.filter((r) => r.id !== energyRecordId);
  return next.length === list.length ? null : next;
}
