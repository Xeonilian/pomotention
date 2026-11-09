// src/services/sync/projectSync.ts

import { BaseSyncService } from "@/services/sync/baseSyncService";
import type { Project } from "@/core/types/Project";
import type { Database } from "@/core/types/Database";
import { convertISOToTimestamp } from "@/core/utils/convertTimestampToISO";

type CloudProject = Database["public"]["Tables"]["projects"]["Row"];
type CloudProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];

export class ProjectSyncService extends BaseSyncService<Project, CloudProjectInsert> {
  constructor(getList: () => Project[], getMap: () => Map<number, Project>) {
    super("projects", "project", getList, getMap);
  }

  protected mapLocalToCloud(local: Project, userId: string): CloudProjectInsert {
    return {
      user_id: userId,
      timestamp_id: local.id,
      title: local.title,
      description: local.description ?? null,
      status: local.status ?? null,
      due_date: local.dueDate ?? null,
      parent_id: local.parentId,
      tag_id: local.tagId ?? null,
      member_ids: local.memberIds ?? [],
      deleted: local.deleted ?? false,
    };
  }

  protected mapCloudToLocal(cloud: CloudProject): Project {
    const cloudTimestamp = convertISOToTimestamp(cloud.last_modified);
    const memberIds = Array.isArray(cloud.member_ids)
      ? (cloud.member_ids as number[])
      : undefined;
    return {
      id: cloud.timestamp_id,
      title: cloud.title,
      description: cloud.description ?? undefined,
      status: (cloud.status as Project["status"]) ?? "",
      dueDate: cloud.due_date ?? undefined,
      parentId: cloud.parent_id ?? null,
      tagId: cloud.tag_id ?? undefined,
      memberIds: memberIds?.length ? memberIds : undefined,
      lastModified: Date.now(),
      synced: true,
      deleted: cloud.deleted,
      cloudModified: cloudTimestamp,
    };
  }
}
