import { describe, it, expect, beforeEach, vi } from "vitest";
import { setActivePinia, createPinia } from "pinia";
import { useTagStore } from "@/stores/useTagStore";
import { useDataStore } from "@/stores/useDataStore";

vi.mock("@/services/data/localStorageService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/data/localStorageService")>();
  return {
    ...actual,
    loadTags: vi.fn(() => []),
    saveTags: vi.fn(),
    loadActivities: vi.fn(() => []),
    loadTodos: vi.fn(() => []),
    loadSchedules: vi.fn(() => []),
    loadTasks: vi.fn(() => []),
    loadTemplates: vi.fn(() => []),
    loadLedgerEntries: vi.fn(() => []),
  };
});

vi.mock("@/core/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/core/utils")>();
  return {
    ...actual,
    scheduleDebouncedCloudUpload: vi.fn(),
  };
});

vi.mock("@/stores/useSearchUiStore", () => ({
  useSearchUiStore: vi.fn(() => ({
    removeFilterTagId: vi.fn(),
  })),
}));

describe("useTagStore.addTag", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("同毫秒创建多个新标签时 id 递增", () => {
    const fixed = 1_700_000_000_000;
    vi.spyOn(Date, "now").mockReturnValue(fixed);
    const tagStore = useTagStore();

    const a = tagStore.addTag("food", "#2080f0", "rgba(206, 227, 252, 0.5)");
    const b = tagStore.addTag("transport", "#2080f0", "rgba(206, 227, 252, 0.5)");
    const c = tagStore.addTag("salary", "#2080f0", "rgba(206, 227, 252, 0.5)");

    expect(a.id).toBe(fixed);
    expect(b.id).toBe(fixed + 1);
    expect(c.id).toBe(fixed + 2);
    expect(new Set([a.id, b.id, c.id]).size).toBe(3);
    vi.restoreAllMocks();
  });
});

describe("useTagStore.removeTag", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("软删 tag 时从 activity 与 ledger 移除引用并标记 unsynced", () => {
    const tagStore = useTagStore();
    const dataStore = useDataStore();

    tagStore.addTag("food", "#2080f0", "rgba(206, 227, 252, 0.5)");
    const keepTag = tagStore.addTag("transport", "#2080f0", "rgba(206, 227, 252, 0.5)");
    const foodId = tagStore.allTags.find((t) => t.name === "food")!.id;

    dataStore.activityList.push({
      id: 1,
      title: "test",
      class: "T",
      parentId: null,
      tagIds: [foodId, keepTag.id],
      lastModified: 0,
      synced: true,
      deleted: false,
    });
    dataStore.ledgerList.push({
      id: 1,
      amount: 10,
      direction: "expense",
      currency: "CNY",
      categoryTagIds: [foodId],
      rawSegment: "-10 #food",
      segmentIndex: 0,
      sourceActivityId: 1,
      sourceTodoId: 0,
      lastModified: 0,
      synced: true,
      deleted: false,
    });

    tagStore.removeTag(foodId);

    expect(tagStore.getTag(foodId)).toBeUndefined();
    expect(dataStore.activityList[0].tagIds).toEqual([keepTag.id]);
    expect(dataStore.activityList[0].synced).toBe(false);
    expect(dataStore.ledgerList[0].categoryTagIds).toBeUndefined();
    expect(dataStore.ledgerList[0].synced).toBe(false);
  });
});
