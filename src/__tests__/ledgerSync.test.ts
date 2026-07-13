import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import type { Ref } from "vue";
import { LedgerSyncService } from "@/services/sync/ledgerSync";
import type { LedgerEntry } from "@/core/types/LedgerEntry";

vi.mock("@/core/services/supabase", () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock("@/core/services/authService", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: "test-user-id" }),
}));

function createMockLedgerEntry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 1700000000000,
    amount: 30,
    direction: "expense",
    currency: "CNY",
    memo: "买菜",
    categoryTagIds: [1],
    rawSegment: "-30买菜",
    segmentIndex: 0,
    sourceActivityId: 100,
    sourceTodoId: 200,
    lastModified: Date.now(),
    synced: false,
    deleted: false,
    ...overrides,
  };
}

describe("LedgerSyncService", () => {
  let service: LedgerSyncService;
  let ledgerListRef: Ref<LedgerEntry[]>;
  let indexMap: Map<number, LedgerEntry>;

  beforeEach(() => {
    vi.clearAllMocks();
    ledgerListRef = ref<LedgerEntry[]>([]);
    indexMap = new Map<number, LedgerEntry>();
    service = new LedgerSyncService(
      () => ledgerListRef.value,
      () => indexMap,
    );
  });

  describe("mapLocalToCloud", () => {
    it("maps LedgerEntry fields to snake_case cloud row", () => {
      const entry = createMockLedgerEntry();
      const cloud = service["mapLocalToCloud"](entry, "user-abc");

      expect(cloud.user_id).toBe("user-abc");
      expect(cloud.timestamp_id).toBe(entry.id);
      expect(cloud.amount).toBe(30);
      expect(cloud.direction).toBe("expense");
      expect(cloud.currency).toBe("CNY");
      expect(cloud.memo).toBe("买菜");
      expect(cloud.category_tag_ids).toEqual([1]);
      expect(cloud.raw_segment).toBe("-30买菜");
      expect(cloud.segment_index).toBe(0);
      expect(cloud.activity_id).toBe(100);
      expect(cloud.deleted).toBe(false);
    });

    it("无 rawSegment 时上传空串", () => {
      const entry = createMockLedgerEntry({ rawSegment: undefined });
      const cloud = service["mapLocalToCloud"](entry, "user-abc");
      expect(cloud.raw_segment).toBe("");
    });
  });

  describe("mapCloudToLocal", () => {
    it("maps table row (snake_case) back to LedgerEntry with sync metadata", () => {
      const local = service["mapCloudToLocal"]({
        timestamp_id: 1700000000000,
        amount: 30,
        direction: "expense",
        currency: "CNY",
        memo: "买菜",
        category_tag_ids: [1],
        raw_segment: "-30买菜",
        segment_index: 0,
        activity_id: 100,
        deleted: false,
        last_modified: "2026-07-01T00:00:00.000Z",
      });

      expect(local.id).toBe(1700000000000);
      expect(local.amount).toBe(30);
      expect(local.direction).toBe("expense");
      expect(local.categoryTagIds).toEqual([1]);
      expect(local.sourceActivityId).toBe(100);
      expect(local.sourceTodoId).toBe(0);
      expect(local.sourceScheduleId).toBe(0);
      expect(local.synced).toBe(true);
      expect(local.deleted).toBe(false);
      expect(local.cloudModified).toBe(new Date("2026-07-01T00:00:00.000Z").getTime());
    });
  });
});
