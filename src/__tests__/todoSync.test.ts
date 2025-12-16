// src/services/sync/__tests__/todoSync.test.ts
// 增加indexMap 增加同步时间参数，但是没有通过测试
import { describe, it, expect, beforeEach, vi } from "vitest";
import { ref } from "vue";
import type { Ref } from "vue";
import { TodoSyncService } from "@/services/sync/todoSync";
import { supabase } from "@/core/services/supabase";
import type { Todo } from "@/core/types/Todo";
import { createMockTodo, createMockFullTodoFromCloud, createUnsyncedTodo, createMockTodos } from "@/__tests__/mocks/testDbData";

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
describe("TodoSyncService", () => {
  let service: TodoSyncService;
  let todoListRef: Ref<Todo[]>;
  let indexMap: Map<number, Todo>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();

    // 重置 rpc mock
    vi.mocked(supabaseClient.rpc).mockResolvedValue({
      data: [],
      error: null,
      count: null,
      status: 200,
      statusText: "OK",
    });

    // 初始化测试数据容器
    todoListRef = ref<Todo[]>([]);
    indexMap = new Map<number, Todo>();

    // ✅ 修复点：传递“函数”而不是“变量”
    // Service 内部会调用 getList() 和 getMap() 来获取最新值
    service = new TodoSyncService(
      () => todoListRef.value, // 参数 1: 返回数组的函数
      () => indexMap // 参数 2: 返回 Map 的函数
    );
  });

  // ==================== 数据转换测试 ====================
  describe("数据转换", () => {
    it("mapLocalToCloud: 正确转换本地 Todo 为云端格式", () => {
      const localTodo = createMockTodo({
        id: 1234567890000,
        activityId: 9999,
        estPomo: [25, 5],
        realPomo: [30, 0],
        status: "done",
        priority: 1,
        doneTime: 1234567890000,
        startTime: 1234567890000,
        globalIndex: 5,
        deleted: false,
      });

      const cloudTodo = service["mapLocalToCloud"](localTodo, "test-user-id");

      expect(cloudTodo.user_id).toBe("test-user-id");
      expect(cloudTodo.timestamp_id).toBe(1234567890000);
      expect(cloudTodo.activity_id).toBe(9999);
      expect(cloudTodo.est_pomo).toEqual([25, 5]);
      expect(cloudTodo.real_pomo).toEqual([30, 0]);
      expect(cloudTodo.status).toBe("done");
      expect(cloudTodo.priority).toBe(1);
      expect(cloudTodo.done_time).toBe(1234567890000);
      expect(cloudTodo.start_time).toBe(1234567890000);
      expect(cloudTodo.global_index).toBe(5);
      expect(cloudTodo.deleted).toBe(false);
    });

    it("mapCloudToLocal: 正确转换 RPC 返回的完整数据（含冗余字段）", () => {
      const cloudTodo = createMockFullTodoFromCloud({
        id: 1234567890000,
        activityId: 9999,
        activityTitle: "测试活动",
        projectName: "测试项目",
        taskId: 8888,
        pomoType: "🍅",
        estPomo: [25, 5],
        realPomo: [30, 0],
        status: "done",
        priority: 1,
      });

      const localTodo = service["mapCloudToLocal"](cloudTodo);

      // 验证基础字段
      expect(localTodo.id).toBe(1234567890000);
      expect(localTodo.activityId).toBe(9999);
      expect(localTodo.estPomo).toEqual([25, 5]);
      expect(localTodo.realPomo).toEqual([30, 0]);
      expect(localTodo.status).toBe("done");
      expect(localTodo.priority).toBe(1);

      // 验证冗余字段（来自 activities 表 JOIN）
      expect(localTodo.activityTitle).toBe("测试活动");
      expect(localTodo.projectName).toBe("测试项目");
      expect(localTodo.taskId).toBe(8888);
      expect(localTodo.pomoType).toBe("🍅");

      // 验证同步元数据
      expect(localTodo.synced).toBe(true);
      expect(localTodo.deleted).toBe(false);
      expect(localTodo.lastModified).toBeGreaterThan(0);
    });

    it("mapCloudToLocal: 正确处理 null 值", () => {
      const cloudTodo = createMockFullTodoFromCloud({
        projectName: null,
        doneTime: null,
      });

      const localTodo = service["mapCloudToLocal"](cloudTodo);

      expect(localTodo.projectName).toBeUndefined();
      expect(localTodo.doneTime).toBeNull();
    });
  });

  // ==================== RPC Download 测试 ====================
  describe("RPC Download", () => {
    it("download: 调用 RPC 获取完整数据（而非直接查表）", async () => {
      const mockRpcData = [
        createMockFullTodoFromCloud({
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

      expect(supabaseClient.rpc).toHaveBeenCalledWith("get_full_todos", {
        p_user_id: "test-user-id",
      });
      expect(result.success).toBe(true);
      expect(result.downloaded).toBe(1);
    });

    it("download: 正确合并云端数据到本地", async () => {
      const existingTodo = createMockTodo({
        id: 1111111111111,
        activityTitle: "旧标题",
        synced: true,
      });

      todoListRef.value = [existingTodo];
      mockLocalStorage.setItem("todayTodo", JSON.stringify([existingTodo]));

      const cloudTodo = createMockFullTodoFromCloud({
        id: 1111111111111,
        activityTitle: "新标题",
      });

      vi.mocked(supabaseClient.rpc).mockResolvedValueOnce({
        data: [cloudTodo],
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      });

      await service.download(0);

      const saved = JSON.parse(mockLocalStorage.getItem("todayTodo")!);
      expect(saved[0].activityTitle).toBe("新标题");
    });

    it("download: 保留本地未同步的修改", async () => {
      const now = Date.now();
      const localTodo = createUnsyncedTodo({
        id: 1111111111111,
        activityTitle: "本地修改",
        lastModified: now,
      });

      todoListRef.value = [localTodo];
      mockLocalStorage.setItem("todayTodo", JSON.stringify([localTodo]));

      const cloudTodo = createMockFullTodoFromCloud({
        id: 1111111111111,
        activityTitle: "云端旧数据",
      });

      vi.mocked(supabaseClient.rpc).mockResolvedValueOnce({
        data: [cloudTodo],
        error: null,
        count: null,
        status: 200,
        statusText: "OK",
      });

      // 云端数据在本地修改之前
      await service.download(now - 10000);

      const saved = JSON.parse(mockLocalStorage.getItem("todayTodo")!);
      expect(saved[0].activityTitle).toBe("本地修改");
    });
  });

  // ==================== Upload 测试 ====================
  describe("Upload", () => {
    it("upload: 只上传未同步的数据", async () => {
      const todos = createMockTodos(3);
      todos[0].synced = false;
      todos[1].synced = true;
      todos[2].synced = false;

      todoListRef.value = todos;
      mockLocalStorage.setItem("todayTodo", JSON.stringify(todos));

      const result = await service.upload();

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(2);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ timestamp_id: todos[0].id }),
          expect.objectContaining({ timestamp_id: todos[2].id }),
        ]),
        expect.any(Object)
      );
    });

    it("upload: 上传成功后标记 synced=true", async () => {
      const todo = createUnsyncedTodo();
      todoListRef.value = [todo];
      mockLocalStorage.setItem("todayTodo", JSON.stringify([todo]));

      await service.upload();

      const saved = JSON.parse(mockLocalStorage.getItem("todayTodo")!);
      expect(saved[0].synced).toBe(true);
    });

    it("upload: 没有未同步数据时跳过上传", async () => {
      const todos = createMockTodos(2, { synced: true });
      todoListRef.value = todos;
      mockLocalStorage.setItem("todayTodo", JSON.stringify(todos));

      const result = await service.upload();

      expect(result.success).toBe(true);
      expect(result.uploaded).toBe(0);
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });
});
