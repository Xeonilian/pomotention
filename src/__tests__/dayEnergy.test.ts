import { describe, it, expect } from "vitest";
import { dayEnergyPlaceholderTitle, isDayEnergyTask } from "@/core/dayEnergy";
import { buildDayEnergyTask, findDayEnergyTask } from "@/services/task/dayEnergyService";
import type { Task } from "@/core/types/Task";

const DAY = 1_704_067_200_000;

function task(partial: Partial<Task> & Pick<Task, "id" | "activityTitle" | "sourceId">): Task {
  return {
    energyRecords: [],
    rewardRecords: [],
    interruptionRecords: [],
    starred: false,
    deleted: false,
    synced: true,
    lastModified: DAY,
    ...partial,
  };
}

describe("dayEnergy", () => {
  it("占位标题为 daily_energy_<日零点>", () => {
    expect(dayEnergyPlaceholderTitle(DAY)).toBe(`daily_energy_${DAY}`);
  });

  it("isDayEnergyTask 认 daily_energy_<ts> 与旧格式", () => {
    expect(isDayEnergyTask(task({ id: 1, activityTitle: `daily_energy_${DAY}`, sourceId: DAY }))).toBe(true);
    expect(isDayEnergyTask(task({ id: 1, activityTitle: `energy_${DAY}`, sourceId: DAY }))).toBe(true);
    expect(isDayEnergyTask(task({ id: 1, activityTitle: "day_energy", sourceId: DAY }))).toBe(true);
    expect(isDayEnergyTask(task({ id: 1, activityTitle: `daily_energy_${DAY}`, sourceId: DAY, deleted: true }))).toBe(false);
    expect(isDayEnergyTask(task({ id: 1, activityTitle: "其他", sourceId: DAY }))).toBe(false);
  });

  it("findDayEnergyTask 按日键匹配", () => {
    const list = [buildDayEnergyTask(DAY, 1), buildDayEnergyTask(DAY + 86_400_000, 2)];
    expect(findDayEnergyTask(DAY, list)?.id).toBe(1);
    expect(findDayEnergyTask(DAY, list)?.activityTitle).toBe(`daily_energy_${DAY}`);
    expect(findDayEnergyTask(DAY + 86_400_000, list)?.id).toBe(2);
    expect(findDayEnergyTask(DAY + 1, list)).toBeUndefined();
  });
});
