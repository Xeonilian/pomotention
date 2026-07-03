import { BaseSyncService } from "./baseSyncService";
import type { LedgerEntry, LedgerDirection } from "@/core/types/LedgerEntry";
import type { Database } from "@/core/types/Database";
import { convertISOToTimestamp } from "@/core/utils/convertTimestampToISO";

type CloudLedgerInsert = Database["public"]["Tables"]["ledger_entries"]["Insert"];
type CloudLedgerRow = Database["public"]["Tables"]["ledger_entries"]["Row"];

export class LedgerSyncService extends BaseSyncService<LedgerEntry, CloudLedgerInsert> {
  constructor(getList: () => LedgerEntry[], getMap: () => Map<number, LedgerEntry>) {
    super("ledger_entries", "ledgerEntries", getList, getMap);
  }

  /** 本地 → 云端（仅非冗余字段；与 todoSync / taskSync 一致只存 activity_id） */
  protected mapLocalToCloud(local: LedgerEntry, userId: string): CloudLedgerInsert {
    return {
      user_id: userId,
      timestamp_id: local.id,
      amount: local.amount,
      direction: local.direction,
      currency: local.currency,
      memo: local.memo ?? null,
      category_tag_ids: (local.categoryTagIds ?? []) as CloudLedgerInsert["category_tag_ids"],
      raw_segment: local.rawSegment,
      segment_index: local.segmentIndex,
      activity_id: local.sourceActivityId,
      deleted: local.deleted ?? false,
    };
  }

  protected mapCloudToLocal(cloud: CloudLedgerRow): LedgerEntry {
    const cloudTimestamp = convertISOToTimestamp(cloud.last_modified);
    const tagIds = cloud.category_tag_ids;
    const categoryTagIds = Array.isArray(tagIds) ? (tagIds as number[]) : [];
    return {
      id: cloud.timestamp_id,
      amount: Number(cloud.amount),
      direction: cloud.direction as LedgerDirection,
      currency: cloud.currency,
      memo: cloud.memo ?? undefined,
      categoryTagIds,
      rawSegment: cloud.raw_segment,
      segmentIndex: cloud.segment_index,
      sourceActivityId: cloud.activity_id,
      // 云表不存 todo_id；与 activity 1:1，聚合时经 todoByActivityId 解析
      sourceTodoId: 0,
      lastModified: Date.now(),
      cloudModified: cloudTimestamp,
      synced: true,
      deleted: cloud.deleted,
    };
  }
}
