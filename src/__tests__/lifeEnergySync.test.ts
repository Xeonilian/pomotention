import { describe, expect, it } from "vitest";
import type { EnergyRecord, LifeRecord } from "@/core/types/Task";
import { getDayStartTimestamp } from "@/core/utils";
import {
  clampLifeScore,
  dropDayEnergyFromLife,
  lifeEnergyAt,
  lifeEnergyDayStart,
  upsertDayEnergyFromLife,
} from "@/services/lifeRecord/lifeEnergySync";

describe("clampLifeScore / lifeEnergyAt", () => {
  it("夹到 1–10", () => {
    expect(clampLifeScore(0)).toBe(1);
    expect(clampLifeScore(11)).toBe(10);
    expect(clampLifeScore(6.4)).toBe(6);
  });
  it("有 endAt 用结束，否则用开始", () => {
    expect(lifeEnergyAt({ recordedAt: 10, endAt: 20 })).toBe(20);
    expect(lifeEnergyAt({ recordedAt: 10 })).toBe(10);
  });
  it("跨夜结束进醒来那天的桶", () => {
    const start = new Date(2026, 9, 19, 23, 0).getTime();
    const end = new Date(2026, 9, 20, 7, 0).getTime();
    expect(lifeEnergyDayStart({ recordedAt: start, endAt: end })).toBe(getDayStartTimestamp(end));
    expect(lifeEnergyDayStart({ recordedAt: start })).toBe(getDayStartTimestamp(start));
  });
});

describe("upsertDayEnergyFromLife", () => {
  const life: Pick<LifeRecord, "energyRecordId" | "description"> = {};
  it("无指针则追加；空描述不写 description", () => {
    const { next, energyRecord } = upsertDayEnergyFromLife(undefined, life, 7, 100);
    expect(next).toHaveLength(1);
    expect(energyRecord.value).toBe(7);
    expect(energyRecord.recordedAt).toBe(100);
    expect(energyRecord.description).toBeUndefined();
  });
  it("新建时抄生活条描述", () => {
    const { energyRecord } = upsertDayEnergyFromLife(undefined, { description: "  跑步  " }, 6, 10);
    expect(energyRecord.description).toBe("跑步");
  });
  it("有指针则改原条 value/recordedAt/description", () => {
    const existing: EnergyRecord = { id: 9, value: 3, recordedAt: 1, description: "旧" };
    const { next, energyRecord } = upsertDayEnergyFromLife(
      [existing],
      { energyRecordId: 9, description: "新备注" },
      8,
      50,
    );
    expect(next).toHaveLength(1);
    expect(energyRecord.id).toBe(9);
    expect(energyRecord.value).toBe(8);
    expect(energyRecord.recordedAt).toBe(50);
    expect(energyRecord.description).toBe("新备注");
  });
  it("描述清空则去掉 energy 条上的 description", () => {
    const existing: EnergyRecord = { id: 9, value: 3, recordedAt: 1, description: "旧" };
    const { energyRecord } = upsertDayEnergyFromLife([existing], { energyRecordId: 9, description: "  " }, 3, 1);
    expect(energyRecord.description).toBeUndefined();
  });
});

describe("dropDayEnergyFromLife", () => {
  it("按 id 删；无 id 或未命中返回 null", () => {
    const list: EnergyRecord[] = [{ id: 1, value: 5, recordedAt: 1 }];
    expect(dropDayEnergyFromLife(list, 1)).toEqual([]);
    expect(dropDayEnergyFromLife(list, 2)).toBeNull();
    expect(dropDayEnergyFromLife(list, undefined)).toBeNull();
  });
});
