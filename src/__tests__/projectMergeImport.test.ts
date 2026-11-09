import { beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_KEYS } from "@/core/constants";
import { handleFileImportFromContents, previewFileImportFromContents } from "@/services/data/mergeService";
import type { Project } from "@/core/types/Project";

const store = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, v);
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  clear: () => store.clear(),
  key: () => null,
  length: 0,
});

function project(partial: Partial<Project> & Pick<Project, "id" | "title">): Project {
  return {
    parentId: null,
    synced: true,
    lastModified: partial.id,
    deleted: false,
    ...partial,
  };
}

describe("project import merge", () => {
  beforeEach(() => {
    store.clear();
  });

  it("keeps same-title projects with different ids", async () => {
    const local = [
      project({ id: 1, title: "未命名", parentId: null }),
      project({ id: 2, title: "子", parentId: 1 }),
    ];
    store.set(STORAGE_KEYS.PROJECT, JSON.stringify(local));

    const incoming = [
      project({ id: 10, title: "未命名", parentId: null }),
      project({ id: 11, title: "未命名", parentId: 10 }),
      project({ id: 2, title: "子", parentId: 1 }), // 同 id → keep-local 跳过
    ];

    const preview = await previewFileImportFromContents({
      "project.json": JSON.stringify(incoming),
    });
    const row = preview.results.find((r) => r.storageKey === STORAGE_KEYS.PROJECT)!;
    expect(row.status).toBe("SUCCESS");
    expect(row.addedCount).toBe(2);
    expect(row.skippedCount).toBe(1);

    await handleFileImportFromContents({
      "project.json": JSON.stringify(incoming),
    });
    const merged = JSON.parse(store.get(STORAGE_KEYS.PROJECT)!) as Project[];
    expect(merged.map((p) => p.id).sort((a, b) => a - b)).toEqual([1, 2, 10, 11]);
    expect(merged.filter((p) => p.title === "未命名")).toHaveLength(3);
    expect(merged.find((p) => p.id === 11)?.parentId).toBe(10);
  });
});
