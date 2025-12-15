// src/services/sync/__tests__/scheduleSync.test.ts
// 增加indexMap 增加同步时间参数，但是没有通过测试
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import type { Ref } from "vue";
import { ScheduleSyncService } from "@/services/sync/scheduleSync";
import { supabase } from "@/core/services/supabase";
import type { Schedule } from "@/core/types/Schedule";
import {
  createMockSchedule,
  createMockFullScheduleFromCloud,
  createUnsyncedSchedule,
  createMockSchedules,
} from "@/__tests__/mocks/testDbData";

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

vi.mock("@/core/services/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: mockUpsert,
    })),
    rpc: vi.fn().mockResolvedValue({ data: [], error: null, count: null, status: 200, statusText: "OK" }),
  },
}));

const supabaseClient = supabase as NonNullable<typeof supabase>;

vi.mock("@/core/services/authServicve", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: "test-user-id" }),
}));

// ========== 测试 ==========
describe("ScheduleSyncService", () => {
  let service: ScheduleSyncService;
  let scheduleListRef: Ref<Schedule[]>;
  let indexMap: Map<number, Schedule>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();

    vi.mocked(supabaseClient.rpc).mockResolvedValue({ data: [], error: null, count: null, status: 200, statusText: "OK" });

    scheduleListRef = ref<Schedule[]>([]);
    indexMap = new Map<number, Schedule>();
    service = new ScheduleSyncService(scheduleListRef, indexMap);
  });

  // ==================== 数据转换测试 ====================
  describe("数据转换", () => {
    it("mapLocalToCloud: 正确转换本地 Schedule 为云端格式", () => {
      const localSchedule = createMockSchedule({
        id: 1234567890000,
        activityId: 9999,
        status: "done",
        doneTime: 1234567890000,
        deleted: false,
      });

      const cloudSchedule = service["mapLocalToCloud"](localSchedule, "test-user-id");

      expect(cloudSchedule.user_id).toBe("test-user-id");
      expect(cloudSchedule.timestamp_id).toBe(1234567890000);
      expect(cloudSchedule.activity_id).toBe(9999);
      expect(cloudSchedule.status).toBe("done");
      expect(cloudSchedule.done_time).toBe(1234567890000);
      expect(cloudSchedule.deleted).toBe(false);
    });

    it("mapCloudToLocal: 正确转换 RPC 返回的完整数据（含冗余字段）", () => {
      const cloudSchedule = createMockFullScheduleFromCloud({
        id: 1234567890000,
        activityId: 9999,
        activityTitle: "测试活动",
        projectName: "测试项目",
        taskId: 8888,
        location: "会议室",
        status: "done",
      });

      const localSchedule = service["mapCloudToLocal"](cloudSchedule);

      // 验证基础字段
      expect(localSchedule.id).toBe(1234567890000);
      expect(localSchedule.activityId).toBe(9999);
      expect(localSchedule.status).toBe("done");

      // 验证冗余字段（来自 activities 表 JOIN）
      expect(localSchedule.activityTitle).toBe("测试活动");
      expect(localSchedule.projectName).toBe("测试项目");
      expect(localSchedule.taskId).toBe(8888);
      expect(localSchedule.location).toBe("会议室");

      // 验证同步元数据
      expect(localSchedule.synced).toBe(true);
      expect(localSchedule.deleted).toBe(false);
      expect(localSchedule.lastModified).toBeGreaterThan(0);
    });

    it("mapCloudToLocal: 正确处理 null 值", () => {
      const cloudSchedule = createMockFullScheduleFromCloud({
        projectName: null,
        doneTime: null,
      });

      const localSchedule = service["mapCloudToLocal"](cloudSchedule);

      expect(localSchedule.projectName).toBeUndefined();
      expect(localSchedule.doneTime).toBeNull();
    });
  });

  // ==================== RPC Download 测试 ====================
  describe("RPC Download", () => {
    it("download: 调用 RPC 获取完整数据", async () => {
      const mockRpcData = [
        createMockFullScheduleFromCloud({
          id: 1111111111111,
          activityTitle: "RPC 返回的活动",
        }),
      ];

      vi.mocked(supabaseClient.rpc).mockResolvedValueOnce({
        data: mockRpcData,
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      });

      const result = await service.download(0);

      expect(supabaseClient.rpc).toHaveBeenCalledWith("get_full_schedules", {
        p_user_id: "test-user-id",
      });
      expect(result.success).toBe(true);
      expect(result.downloaded).toBe(1);
    });

    it("download: 正确合并云端数据到本地", async () => {
      const existingSchedule = createMockSchedule({
        id: 1111111111111,
        activityTitle: "旧标题",
        synced: true,
      });

      scheduleListRef.value = [existingSchedule];
      mockLocalStorage.setItem("todaySchedule", JSON.stringify([existingSchedule]));

      const cloudSchedule = createMockFullScheduleFromCloud({
        id: 1111111111111,
        activityTitle: "新标题",
      });

      vi.mocked(supabaseClient.rpc).mockResolvedValueOnce({
        data: [cloudSchedule],
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      });

      await service.download(0);

      const saved = JSON.parse(mockLocalStorage.getItem("todaySchedule")!);
      expect(saved[0].activityTitle).toBe("新标题");
    });

    it("download: 保留本地未同步的修改", async () => {
      const now = Date.now();
      const localSchedule = createUnsyncedSchedule({
        id: 1111111111111,
        activityTitle: "本地修改",
        lastModified: now,
      });

      scheduleListRef.value = [localSchedule];
      mockLocalStorage.setItem("todaySchedule", JSON.stringify([localSchedule]));

      const cloudSchedule = createMockFullScheduleFromCloud({
        id: 1111111111111,
        activityTitle: "云端旧数据",
      });

      vi.mocked(supabaseClient.rpc).mockResolvedValueOnce({
        data: [cloudSchedule],
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      });

      await service.download(now - 10000);

      const saved = JSON.parse(mockLocalStorage.getItem("todaySchedule")!);
      expect(saved[0].activityTitle).toBe("本地修改");
    });
  });

  // ==================== Upload 测试 ====================
  describe("Upload", () => {
    it("upload: 只上传未同步的数据", async () => {
      const schedules = createMockSchedules(3);
      schedules[0].synced = false;
      schedules[1].synced = true;
      schedules[2].synced = false;

      scheduleListRef.value = schedules;
      mockLocalStorage.setItem("todaySchedule", JSON.stringify(schedules));

      const result = await service.upload();

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(2);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ timestamp_id: schedules[0].id }),
          expect.objectContaining({ timestamp_id: schedules[2].id }),
        ]),
        expect.any(Object)
      );
    });

    it("upload: 上传成功后标记 synced=true", async () => {
      const schedule = createUnsyncedSchedule();
      scheduleListRef.value = [schedule];
      mockLocalStorage.setItem("todaySchedule", JSON.stringify([schedule]));

      await service.upload();

      const saved = JSON.parse(mockLocalStorage.getItem("todaySchedule")!);
      expect(saved[0].synced).toBe(true);
    });

    it("upload: 没有未同步数据时跳过上传", async () => {
      const schedules = createMockSchedules(2, { synced: true });
      scheduleListRef.value = schedules;
      mockLocalStorage.setItem("todaySchedule", JSON.stringify(schedules));

      const result = await service.upload();

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(0);
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });
});
