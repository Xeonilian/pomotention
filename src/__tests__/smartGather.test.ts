import { describe, expect, it } from "vitest";
import { pickSmartProjectId } from "@/services/project/smartGather";
import type { Project } from "@/core/types/Project";

function p(partial: Partial<Project> & { id: number; tagId?: number; parentId?: number | null }): Project {
  return {
    title: String(partial.id),
    parentId: partial.parentId ?? null,
    deleted: false,
    synced: true,
    lastModified: 1,
    ...partial,
  };
}

describe("pickSmartProjectId", () => {
  const depth = (id: number) => (id === 2 ? 1 : 0);

  it("picks deeper project when multiple tags match", () => {
    const projects = [p({ id: 1, tagId: 10, parentId: null }), p({ id: 2, tagId: 20, parentId: 1 })];
    expect(pickSmartProjectId([10, 20], projects, depth)).toBe(2);
  });

  it("same depth uses earlier tag in tagIds", () => {
    const projects = [p({ id: 1, tagId: 10 }), p({ id: 3, tagId: 30 })];
    const d = () => 0;
    expect(pickSmartProjectId([30, 10], projects, d)).toBe(3);
    expect(pickSmartProjectId([10, 30], projects, d)).toBe(1);
  });
});
