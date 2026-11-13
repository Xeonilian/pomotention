import { describe, expect, it } from "vitest";
import {
  collectLiveDescendantIds,
  countActivitiesOnDeadProjects,
  findOrphanForestRoots,
} from "@/services/project/cleanupOrphanProjects";
import type { Project } from "@/core/types/Project";

function p(partial: Partial<Project> & Pick<Project, "id" | "title" | "parentId">): Project {
  return {
    synced: true,
    lastModified: partial.id,
    deleted: false,
    ...partial,
  };
}

describe("cleanupOrphanProjects helpers", () => {
  it("finds forest roots whose parent is missing or deleted", () => {
    const projects = [
      p({ id: 1, title: "dead", parentId: null, deleted: true }),
      p({ id: 2, title: "orphan", parentId: 1 }),
      p({ id: 3, title: "child", parentId: 2 }),
      p({ id: 4, title: "root", parentId: null }),
      p({ id: 5, title: "missing-parent", parentId: 999 }),
    ];
    expect(findOrphanForestRoots(projects).sort((a, b) => a - b)).toEqual([2, 5]);
    expect(collectLiveDescendantIds(projects, 2)).toEqual([2, 3]);
  });

  it("counts activities on dead projects", () => {
    const projects = [p({ id: 1, title: "gone", parentId: null, deleted: true }), p({ id: 2, title: "live", parentId: null })];
    const { count, deadProjectIds } = countActivitiesOnDeadProjects(
      [{ projectId: 1 }, { projectId: 2 }, { projectId: 1 }, { projectId: undefined }],
      projects,
    );
    expect(count).toBe(2);
    expect(deadProjectIds).toEqual([1]);
  });
});
