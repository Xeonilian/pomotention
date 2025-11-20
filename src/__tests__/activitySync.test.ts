// __tests__/services/sync/activitySync.test.ts

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue"; // ✅ 添加 ref
import { ActivitySyncService } from "@/services/sync/activitySync";
import { createMockActivity } from "@/__tests__/mocks/testDbData";
import type { Activity } from "@/core/types/Activity";
import type { Ref } from "vue"; // ✅ 添加类型

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    clear: () => {
      store = {};
    },
  };
})();

global.localStorage = mockLocalStorage as any;

// Mock supabase
const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      gt: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  }),
});

vi.mock("@/core/services/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: mockUpsert,
      select: mockSelect,
    })),
  },
}));

vi.mock("@/core/services/authServicve", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: "test-user-id" }),
}));

describe("ActivitySyncService", () => {
  let service: ActivitySyncService;
  let activityListRef: Ref<Activity[]>; // ✅ 添加响应式数据

  beforeEach(() => {
    mockLocalStorage.clear();
    vi.clearAllMocks();

    // ✅ 创建响应式数据
    activityListRef = ref<Activity[]>([]);

    // ✅ 传入响应式数据
    service = new ActivitySyncService(activityListRef);
  });

  describe("数据转换 - mapLocalToCloud", () => {
    it("应该正确转换必填字段", () => {
      const activity = createMockActivity({
        id: 123,
        title: "Test Activity",
        class: "S",
        parentId: 0,
      });

      const cloud = service["mapLocalToCloud"](activity, "user-123");

      expect(cloud.user_id).toBe("user-123");
      expect(cloud.timestamp_id).toBe(123);
      expect(cloud.title).toBe("Test Activity");
      expect(cloud.class).toBe("S");
      expect(cloud.parent_id).toBe(0);
    });

    it("应该正确处理可选字段", () => {
      const activity = createMockActivity({
        projectId: 456,
        estPomoI: "3",
        dueDate: 1700000000000,
        dueRange: [1000, "60"],
        interruption: "I",
        status: "ongoing",
        location: "Office",
        pomoType: "🍅",
        isUntaetigkeit: true,
        taskId: 789,
        tagIds: [1, 2, 3],
      });

      const cloud = service["mapLocalToCloud"](activity, "user-123");

      expect(cloud.project_id).toBe(456);
      expect(cloud.est_pomo_i).toBe("3");
      expect(cloud.due_date).toBe(1700000000000);
      expect(cloud.due_range_start).toBe(1000);
      expect(cloud.due_range_minutes).toBe("60");
      expect(cloud.interruption).toBe("I");
      expect(cloud.status).toBe("ongoing");
      expect(cloud.location).toBe("Office");
      expect(cloud.pomo_type).toBe("🍅");
      expect(cloud.is_untaetigkeit).toBe(true);
      expect(cloud.task_id).toBe(789);
      expect(cloud.tag_ids).toEqual([1, 2, 3]);
    });

    it("应该将 undefined 转换为 null", () => {
      const activity = createMockActivity({
        projectId: undefined,
        estPomoI: undefined,
        dueDate: undefined,
      });

      const cloud = service["mapLocalToCloud"](activity, "user-123");

      expect(cloud.project_id).toBeNull();
      expect(cloud.est_pomo_i).toBeNull();
      expect(cloud.due_date).toBeNull();
    });

    it("应该正确拆分 dueRange", () => {
      const activity = createMockActivity({
        dueRange: [1000, "60"],
      });

      const cloud = service["mapLocalToCloud"](activity, "user-123");

      expect(cloud.due_range_start).toBe(1000);
      expect(cloud.due_range_minutes).toBe("60");
    });

    it("dueRange 为 undefined 时应该返回 null", () => {
      const activity = createMockActivity({
        dueRange: undefined,
      });

      const cloud = service["mapLocalToCloud"](activity, "user-123");

      expect(cloud.due_range_start).toBeNull();
      expect(cloud.due_range_minutes).toBeNull();
    });
  });

  describe("数据转换 - mapCloudToLocal", () => {
    it("应该生成正确的同步元数据", () => {
      const cloud = {
        timestamp_id: 123,
        title: "Test",
        class: "S",
        parent_id: 0,
        project_id: null,
        est_pomo_i: null,
        due_date: null,
        due_range_start: null,
        due_range_minutes: null,
        interruption: null,
        status: null,
        location: null,
        pomo_type: null,
        is_untaetigkeit: false,
        task_id: null,
        tag_ids: null,
      };

      const local = service["mapCloudToLocal"](cloud as any);

      expect(local.id).toBe(123);
      expect(local.synced).toBe(true);
      expect(local.deleted).toBe(false);
      expect(local.lastModified).toBeGreaterThan(0);
    });

    it("应该正确合并 dueRange", () => {
      const cloud = {
        timestamp_id: 123,
        title: "Test",
        class: "T",
        parent_id: 0,
        due_range_start: 1234567890000,
        due_range_minutes: "120",
        project_id: null,
        est_pomo_i: null,
        due_date: null,
        interruption: null,
        status: null,
        location: null,
        pomo_type: null,
        is_untaetigkeit: false,
        task_id: null,
        tag_ids: null,
      };

      const local = service["mapCloudToLocal"](cloud as any);

      expect(local.dueRange).toEqual([1234567890000, "120"]);
    });

    it("应该将 null 转换为 undefined", () => {
      const cloud = {
        timestamp_id: 123,
        title: "Test",
        class: "S",
        parent_id: 0,
        project_id: null,
        est_pomo_i: null,
        due_date: null,
        due_range_start: null,
        due_range_minutes: null,
        interruption: null,
        status: null,
        location: null,
        pomo_type: null,
        is_untaetigkeit: false,
        task_id: null,
        tag_ids: null,
      };

      const local = service["mapCloudToLocal"](cloud as any);

      expect(local.projectId).toBeUndefined();
      expect(local.estPomoI).toBeUndefined();
      expect(local.dueDate).toBeUndefined();
      expect(local.dueRange).toBeUndefined();
    });
  });

  describe("upload 逻辑", () => {
    it("应该只上传 synced = false 的记录", async () => {
      const activities = [
        createMockActivity({ id: 1, title: "A1", synced: true }),
        createMockActivity({ id: 2, title: "A2", synced: false }),
        createMockActivity({ id: 3, title: "A3", synced: false }),
      ];

      // ✅ 同时设置 localStorage 和响应式数据
      localStorage.setItem("activitySheet", JSON.stringify(activities));
      activityListRef.value = activities;

      const result = await service.upload();

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(2);

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      const uploadedData = mockUpsert.mock.calls[0][0];
      expect(uploadedData).toHaveLength(2);
      expect(uploadedData[0].timestamp_id).toBe(2);
      expect(uploadedData[1].timestamp_id).toBe(3);
    });

    it("上传后应该标记为 synced = true", async () => {
      const activities = [createMockActivity({ id: 1, synced: false })];

      // ✅ 同时设置 localStorage 和响应式数据
      localStorage.setItem("activitySheet", JSON.stringify(activities));
      activityListRef.value = activities;

      await service.upload();

      // ✅ 检查响应式数据
      expect(activityListRef.value[0].synced).toBe(true);

      // ✅ 检查 localStorage
      const updated = JSON.parse(localStorage.getItem("activitySheet")!);
      expect(updated[0].synced).toBe(true);
    });

    it("没有未同步数据时应该返回 uploaded = 0", async () => {
      const activities = [
        createMockActivity({ id: 1, synced: true }),
        createMockActivity({ id: 2, synced: true }),
        createMockActivity({ id: 3, synced: true }),
      ];

      // ✅ 同时设置 localStorage 和响应式数据
      localStorage.setItem("activitySheet", JSON.stringify(activities));
      activityListRef.value = activities;

      const result = await service.upload();

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(0);
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it("应该上传已删除的记录（deleted = true）", async () => {
      const activities = [createMockActivity({ id: 1, synced: false, deleted: true })];

      // ✅ 同时设置 localStorage 和响应式数据
      localStorage.setItem("activitySheet", JSON.stringify(activities));
      activityListRef.value = activities;

      const result = await service.upload();

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(1);
      expect(mockUpsert).toHaveBeenCalledTimes(1);
    });
  });
  describe("核心 Bug 排查 - 修改隔离性", () => {
    it("修改单个 activity 时，其他 activity 的 synced 不应变化", () => {
      const activities = [
        createMockActivity({ id: 1, synced: true, title: "A1" }),
        createMockActivity({ id: 2, synced: true, title: "A2" }),
        createMockActivity({ id: 3, synced: true, title: "A3" }),
      ];

      localStorage.setItem("activitySheet", JSON.stringify(activities));
      activityListRef.value = activities;

      // ✅ 模拟实际修改场景（类似 useDataStore 中的操作）
      const target = activityListRef.value[0];
      target.title = "Modified";
      target.synced = false;
      target.lastModified = Date.now();

      // 模拟保存到 localStorage
      localStorage.setItem("activitySheet", JSON.stringify(activityListRef.value));

      // 验证结果
      const updated = JSON.parse(localStorage.getItem("activitySheet")!) as Activity[];

      // ✅ 只有第一个被修改
      expect(updated[0].synced).toBe(false);
      expect(updated[0].title).toBe("Modified");

      // ✅ 其他项不受影响
      expect(updated[1].synced).toBe(true);
      expect(updated[1].title).toBe("A2");
      expect(updated[2].synced).toBe(true);
      expect(updated[2].title).toBe("A3");
    });
  });
});
