// src/services/sync/timetableSync.ts
// 实际上并没有同步，因为出错，而且也不值当

import { BaseSyncService } from "@/services/sync/baseSyncService";
import type { Block } from "@/core/types/Block";
import type { Database } from "@/core/types/Database";

type CloudBlock = Database["public"]["Tables"]["timetable_blocks"]["Row"];
type CloudBlockInsert = Database["public"]["Tables"]["timetable_blocks"]["Insert"];

export class TimetableSyncService extends BaseSyncService<Block, CloudBlockInsert> {
  constructor(getList: () => Block[], getMap: () => Map<number, Block>) {
    super("timetable_blocks", "timeTableBlocks", getList, getMap);
  }

  protected mapLocalToCloud(local: Block, userId: string): CloudBlockInsert {
    return {
      user_id: userId,
      timestamp_id: local.id,
      type: local.type,
      category: local.category,
      start_time: local.start,
      end_time: local.end,
      deleted: local.deleted,
    };
  }

  protected mapCloudToLocal(cloud: CloudBlock): Block {
    return {
      id: cloud.timestamp_id,
      type: cloud.type as "work" | "entertainment",
      category: cloud.category as "living" | "sleeping" | "working",
      start: cloud.start_time,
      end: cloud.end_time,
      lastModified: Date.now(),
      synced: true,
      deleted: cloud.deleted,
    };
  }
}
