import { describe, it, expect } from "vitest";
import { ProjectSyncService } from "@/services/sync/projectSync";
import type { Project } from "@/core/types/Project";

describe("ProjectSyncService mapping", () => {
  const service = new ProjectSyncService(
    () => [],
    () => new Map(),
  );

  it("maps local project to cloud insert", () => {
    const local: Project = {
      id: 1001,
      title: "咨询",
      description: "desc",
      status: "ongoing",
      dueDate: 2000,
      parentId: null,
      tagId: 42,
      synced: false,
      lastModified: 1001,
      deleted: false,
    };
    const cloud = (service as any).mapLocalToCloud(local, "user-1");
    expect(cloud).toMatchObject({
      user_id: "user-1",
      timestamp_id: 1001,
      title: "咨询",
      description: "desc",
      status: "ongoing",
      due_date: 2000,
      parent_id: null,
      tag_id: 42,
      deleted: false,
    });
  });

  it("maps cloud row to local project", () => {
    const local = (service as any).mapCloudToLocal({
      id: "uuid",
      user_id: "user-1",
      timestamp_id: 1001,
      title: "咨询",
      description: null,
      status: null,
      due_date: null,
      parent_id: 99,
      tag_id: null,
      deleted: false,
      last_modified: "2026-11-03T00:00:00.000Z",
    });
    expect(local.id).toBe(1001);
    expect(local.title).toBe("咨询");
    expect(local.parentId).toBe(99);
    expect(local.tagId).toBeUndefined();
    expect(local.synced).toBe(true);
    expect(local.deleted).toBe(false);
  });
});
