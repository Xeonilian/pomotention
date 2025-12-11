// src/services/sync/tagSync.ts

import { BaseSyncService } from "@/services/sync/baseSyncService";
import type { Tag } from "@/core/types/Tag";
import type { Database } from "@/core/types/Database";
import type { Ref } from "vue";

type CloudTag = Database["public"]["Tables"]["tags"]["Row"];
type CloudTagInsert = Database["public"]["Tables"]["tags"]["Insert"];

export class TagSyncService extends BaseSyncService<Tag, CloudTagInsert> {
  constructor(reactiveList: Ref<Tag[]>, indexMap: Map<number, Tag>) {
    super("tags", "tag", reactiveList, indexMap);
  }

  protected mapLocalToCloud(local: Tag, userId: string): CloudTagInsert {
    return {
      user_id: userId,
      timestamp_id: local.id,
      name: local.name,
      color: local.color,
      background_color: local.backgroundColor,
      deleted: local.deleted,
    };
  }

  protected mapCloudToLocal(cloud: CloudTag): Tag {
    return {
      id: cloud.timestamp_id,
      name: cloud.name,
      color: cloud.color,
      backgroundColor: cloud.background_color,
      lastModified: Date.now(),
      synced: true,
      deleted: cloud.deleted,
    };
  }
}
