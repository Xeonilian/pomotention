// 当日精力桶：task 必须挂到一条 activity 上才能过云端外键
import type { Activity } from "@/core/types/Activity";
import type { Task } from "@/core/types/Task";
import { dayEnergyDayOf, dayEnergyPlaceholderTitle, isDayEnergyActivityTitle, isDayEnergyTask } from "@/core/dayEnergy";
import { nextFreeTimestampId } from "@/services/lifeRecord/lifeRecordService";

/** 构造一条 energy_<dayStart> task（不入 store）。sourceId 先写日键，挂活动时再改成 activity id */
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

/** 按标题里的日键查找（sourceId 挂上活动后不再等于日键） */
export function findDayEnergyTask(dayStartTs: number, tasks: Task[]): Task | undefined {
  return tasks.find((t) => isDayEnergyTask(t) && dayEnergyDayOf(t) === dayStartTs);
}

function buildDayEnergyActivity(dayStartTs: number, id: number, taskId: number, now: number): Activity {
  return {
    id,
    title: dayEnergyPlaceholderTitle(dayStartTs),
    class: "T",
    parentId: null,
    status: "done",
    taskId,
    deleted: false,
    synced: false,
    lastModified: now,
  };
}

/**
 * 给还没挂上精力活动的桶补 activity，并保持 synced=false。
 * 下次上传会先传活动再传任务，标记才会被清掉。
 */
export function reconcileDayEnergyTasks(
  tasks: Task[],
  activities: Activity[],
  now = Date.now(),
): { created: Activity[]; changed: boolean } {
  const created: Activity[] = [];
  let changed = false;
  const occupied = new Set<number>();
  for (const activity of activities) occupied.add(activity.id);
  for (const task of tasks) occupied.add(task.id);

  for (const task of tasks) {
    if (!isDayEnergyTask(task)) continue;
    const day = dayEnergyDayOf(task);
    if (day == null) continue;

    const title = dayEnergyPlaceholderTitle(day);
    const linked = activities.find((activity) => activity.id === task.sourceId);
    if (linked && !linked.deleted && isDayEnergyActivityTitle(linked.title)) continue;

    let host = [...activities, ...created].find((activity) => !activity.deleted && activity.title === title);
    if (!host) {
      const id = nextFreeTimestampId(now, occupied);
      occupied.add(id);
      host = buildDayEnergyActivity(day, id, task.id, now);
      created.push(host);
      changed = true;
    }

    if (task.sourceId !== host.id || task.activityTitle !== title) {
      task.sourceId = host.id;
      task.activityTitle = title;
      task.synced = false;
      task.lastModified = now;
      changed = true;
    }
    if (host.taskId !== task.id) {
      host.taskId = task.id;
      host.synced = false;
      host.lastModified = now;
      changed = true;
    }
  }

  return { created, changed };
}
