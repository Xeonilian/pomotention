// src/services/sync/todoSync.ts
import { BaseSyncService } from "./baseSyncService";
import type { Todo } from "@/core/types/Todo";
import type { Database } from "@/core/types/Database";

type CloudTodo = Database["public"]["Tables"]["todos"]["Row"];
type CloudTodoInsert = Database["public"]["Tables"]["todos"]["Insert"];

export class TodoSyncService extends BaseSyncService<Todo, CloudTodoInsert> {
  constructor() {
    super("todos", "todos");
  }

  protected mapLocalToCloud(local: Todo, userId: string): CloudTodoInsert {
    return {
      user_id: userId,
      id: local.id,
      activity_id: local.activityId,
      activity_title: local.activityTitle,
      project_name: local.projectName || null,
      task_id: local.taskId || null,
      est_pomo: local.estPomo || null,
      real_pomo: local.realPomo || null,
      status: local.status || null,
      priority: local.priority,
      pomo_type: local.pomoType || null,
      due_date: local.dueDate || null,
      done_time: local.doneTime || null,
      start_time: local.startTime || null,
      interruption: local.interruption || null,
      global_index: local.globalIndex || null,
      // ✅ 不传 positionIndex
      // ✅ 不传 idFormated
      deleted: local.deleted,
      last_modified: new Date(local.lastModified).toISOString(),
    };
  }

  protected mapCloudToLocal(cloud: CloudTodo): Todo {
    return {
      id: cloud.id,
      activityId: cloud.activity_id,
      activityTitle: cloud.activity_title,
      projectName: cloud.project_name ?? undefined,
      taskId: cloud.task_id ?? undefined,
      estPomo: cloud.est_pomo ?? undefined,
      realPomo: cloud.real_pomo ?? undefined,
      status: (cloud.status || "") as Todo["status"],
      priority: cloud.priority,
      pomoType: cloud.pomo_type as Todo["pomoType"],
      dueDate: cloud.due_date ?? undefined,
      doneTime: cloud.done_time ?? undefined,
      startTime: cloud.start_time ?? undefined,
      interruption: cloud.interruption as Todo["interruption"],
      globalIndex: cloud.global_index ?? undefined,
      // ✅ 不读 positionIndex（服务端没有）
      deleted: cloud.deleted ?? false,
      lastModified: new Date(cloud.last_modified).getTime(),
      synced: true,
    };
  }
}

export const todoSync = new TodoSyncService();