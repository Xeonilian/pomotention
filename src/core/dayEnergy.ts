// 当日精力桶：无选中 task 时 energy 的宿主；不进 Activity/Tracker UI
import type { Task } from "@/core/types/Task";
import { dailyPlaceholderTitle } from "@/core/dailyPlaceholder";

/** activityTitle 占位：daily_energy_<当日零点> */
export function dayEnergyPlaceholderTitle(dayStartTs: number): string {
  return dailyPlaceholderTitle("energy", dayStartTs);
}

export function isDayEnergyTask(task: Pick<Task, "activityTitle" | "deleted"> | null | undefined): boolean {
  if (!task || task.deleted) return false;
  const t = task.activityTitle ?? "";
  // 新格式 + 旧 day_energy / energy_<ts>
  return t === "day_energy" || /^energy_\d+$/.test(t) || /^daily_energy_\d+$/.test(t);
}
