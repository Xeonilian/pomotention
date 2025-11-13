// src/services/sync/scheduleSync.ts
import { BaseSyncService } from "./baseSyncService";
import type { Schedule } from "@/core/types/Schedule";
import type { Database } from "@/core/types/Database";

type CloudSchedule = Database["public"]["Tables"]["schedules"]["Row"];
type CloudScheduleInsert = Database["public"]["Tables"]["schedules"]["Insert"];

export class ScheduleSyncService extends BaseSyncService<Schedule, CloudScheduleInsert> {
  constructor() {
    super("schedules", "todaySchedule");
  }

  protected mapLocalToCloud(local: Schedule, userId: string): CloudScheduleInsert {
    return {
      user_id: userId,
      timestamp_id: `${userId}_${local.id}`,
      activity_id: local.activityId,
      activity_title: local.activityTitle,
      activity_due_start: local.activityDueRange[0],
      activity_due_duration: local.activityDueRange[1],
      task_id: local.taskId,
      status: local.status || "",
      project_name: local.projectName,
      location: local.location,
      done_time: local.doneTime,
      is_untaetigkeit: local.isUntaetigkeit || false,
      interruption: local.interruption,
      deleted: local.deleted,
      last_modified: new Date(local.lastModified).toISOString(),
    };
  }

  protected mapCloudToLocal(cloud: CloudSchedule): Schedule {
    return {
      id: parseInt(cloud.timestamp_id.split("_")[1]),
      activityId: cloud.activity_id,
      activityTitle: cloud.activity_title,
      activityDueRange: [cloud.activity_due_start, cloud.activity_due_duration],
      taskId: cloud.task_id ?? undefined,
      status: (cloud.status || "") as Schedule["status"],
      projectName: cloud.project_name ?? undefined,
      location: cloud.location ?? undefined,
      doneTime: cloud.done_time ?? undefined,
      isUntaetigkeit: cloud.is_untaetigkeit ?? false,
      interruption: cloud.interruption as Schedule["interruption"],
      deleted: cloud.deleted ?? false,
      lastModified: new Date(cloud.last_modified).getTime(),
      synced: true,
    };
  }
}

export const scheduleSync = new ScheduleSyncService();