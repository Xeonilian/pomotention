// src/services/sync/templateSync.ts

import { BaseSyncService } from "@/services/sync/baseSyncService";
import type { Template } from "@/core/types/Template";
import type { Database } from "@/core/types/Database";
import type { Ref } from "vue";

type CloudTemplate = Database["public"]["Tables"]["templates"]["Row"];
type CloudTemplateInsert = Database["public"]["Tables"]["templates"]["Insert"];

export class TemplateSyncService extends BaseSyncService<Template, CloudTemplateInsert> {
  constructor(reactiveList: Ref<Template[]>, indexMap: Map<number, Template>) {
    super("templates", "writingTemplate", reactiveList, indexMap);
  }

  protected mapLocalToCloud(local: Template, userId: string): CloudTemplateInsert {
    return {
      user_id: userId,
      timestamp_id: local.id,
      title: local.title,
      content: local.content,
      deleted: local.deleted,
    };
  }

  protected mapCloudToLocal(cloud: CloudTemplate): Template {
    return {
      id: cloud.timestamp_id,
      title: cloud.title,
      content: cloud.content,
      lastModified: Date.now(),
      synced: true,
      deleted: cloud.deleted,
    };
  }
}
