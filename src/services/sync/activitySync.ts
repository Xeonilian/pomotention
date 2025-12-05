// src/services/sync/activitySync.ts

import { BaseSyncService } from "@/services/sync/baseSyncService";
import type { Activity } from "@/core/types/Activity";
import type { Database } from "@/core/types/Database";
import type { Ref } from "vue";
import { convertTimestampToISO } from "@/core/utils";

type CloudActivity = Database["public"]["Tables"]["activities"]["Row"];
type CloudActivityInsert = Database["public"]["Tables"]["activities"]["Insert"];

export class ActivitySyncService extends BaseSyncService<Activity, CloudActivityInsert> {
  constructor(reactiveList: Ref<Activity[]>) {
    super("activities", "activitySheet", reactiveList);
  }

  protected mapLocalToCloud(local: Activity, userId: string): CloudActivityInsert {
    return {
      user_id: userId,
      timestamp_id: local.id,
      title: local.title,
      class: local.class,
      project_id: local.projectId ?? null,
      est_pomo_i: local.estPomoI ?? null,
      due_date: local.dueDate ?? null,
      due_range_start: local.dueRange?.[0] ?? null,
      due_range_minutes: local.dueRange?.[1] ?? null,
      interruption: local.interruption ?? null,
      status: local.status ?? null,
      location: local.location ?? null,
      pomo_type: local.pomoType ?? null,
      is_untaetigkeit: local.isUntaetigkeit ?? false,
      task_id: local.taskId ?? null,
      tag_ids: local.tagIds ?? null,
      parent_id: local.parentId,
      deleted: local.deleted || false,
    };
  }

  protected mapCloudToLocal(cloud: CloudActivity): Activity {
    return {
      id: cloud.timestamp_id,
      title: cloud.title,
      class: cloud.class as "S" | "T",
      projectId: cloud.project_id ?? undefined,
      estPomoI: cloud.est_pomo_i ?? undefined,
      dueDate: cloud.due_date ?? undefined,
      dueRange:
        cloud.due_range_start !== null && cloud.due_range_minutes !== null ? [cloud.due_range_start, cloud.due_range_minutes] : undefined,
      interruption: (cloud.interruption as "I" | "E") ?? undefined,
      status: (cloud.status as Activity["status"]) ?? undefined,
      location: cloud.location ?? undefined,
      pomoType: (cloud.pomo_type as "🍅" | "🍇" | "🍒") ?? undefined,
      isUntaetigkeit: cloud.is_untaetigkeit ?? false,
      taskId: cloud.task_id ?? undefined,
      tagIds: cloud.tag_ids ?? undefined,
      parentId: cloud.parent_id,
      lastModified: Date.now(),
      synced: true,
      deleted: cloud.deleted || false,
    };
  }
}
