// 当日精力桶：无选中 task 时 energy 的宿主；不进 Activity/Tracker UI
import type { Task } from "@/core/types/Task";
import { dailyPlaceholderTitle } from "@/core/dailyPlaceholder";

/** activityTitle 占位：daily_energy_<当日零点> */
export function dayEnergyPlaceholderTitle(dayStartTs: number): string {
  return dailyPlaceholderTitle("energy", dayStartTs);
}

export function isDayEnergyActivityTitle(title?: string | null): boolean {
  if (!title) return false;
  return title === "day_energy" || /^(?:daily_)?energy_\d+$/.test(title);
}

/** 日键在标题里；旧 day_energy 没有数字，退回 sourceId */
export function dayEnergyDayOf(task: Pick<Task, "activityTitle" | "sourceId">): number | null {
  const title = task.activityTitle ?? "";
  const matched = /^(?:daily_)?energy_(\d+)$/.exec(title);
  if (matched) return Number(matched[1]);
  if (title === "day_energy" && Number.isFinite(task.sourceId)) return task.sourceId;
  return null;
}

export function isDayEnergyTask(task: Pick<Task, "activityTitle" | "deleted"> | null | undefined): boolean {
  if (!task || task.deleted) return false;
  return isDayEnergyActivityTitle(task.activityTitle);
}
