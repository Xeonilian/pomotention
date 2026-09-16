// 当日 energy 宿主：查/建；sourceId = 当日零点作为日键
import type { Task } from "@/core/types/Task";
import { dayEnergyPlaceholderTitle, isDayEnergyTask } from "@/core/dayEnergy";

/** 构造一条 energy_<dayStart> task（不入 store） */
export function buildDayEnergyTask(dayStartTs: number, id: number = Date.now()): Task {
  return {
    id,
    activityTitle: dayEnergyPlaceholderTitle(dayStartTs),
    sourceId: dayStartTs,
    energyRecords: [],
    rewardRecords: [],
    interruptionRecords: [],
    description: "",
    starred: false,
    deleted: false,
    synced: false,
    lastModified: id,
  };
}

/** 按日键查找已有宿主（不创建） */
export function findDayEnergyTask(dayStartTs: number, tasks: Task[]): Task | undefined {
  return tasks.find((t) => isDayEnergyTask(t) && t.sourceId === dayStartTs);
}
