import { describe, it, expect } from "vitest";
import {
  buildExportHits,
  toMarkdownReport,
  toTodoCsv,
  type BuildExportHitsDeps,
} from "@/services/search/exportFilteredHits";
import type { Activity } from "@/core/types/Activity";
import type { Todo } from "@/core/types/Todo";
import type { Task } from "@/core/types/Task";

describe("exportFilteredHits", () => {
  const activity: Activity = {
    id: 1,
    title: "边界感",
    class: "T",
    tagIds: [10],
    parentId: null,
    deleted: false,
    synced: false,
    lastModified: 1,
  };
  const todo: Todo = {
    id: 2,
    activityId: 1,
    activityTitle: "边界感",
    priority: 1,
    status: "done",
    dueDate: Date.parse("2026-11-03T00:00:00+08:00"),
    startTime: Date.parse("2026-11-02T09:30:00+08:00"),
    doneTime: Date.parse("2026-11-02T11:00:00+08:00"),
    deleted: false,
    synced: false,
    lastModified: 1,
  };
  const task: Task = {
    id: 3,
    activityTitle: "边界感",
    sourceId: 1,
    description: "正文",
    energyRecords: [],
    rewardRecords: [],
    interruptionRecords: [],
    starred: true,
    deleted: false,
    synced: false,
    lastModified: 1,
  };

  const deps: BuildExportHitsDeps = {
    getActivity: (id) => (id === 1 ? activity : undefined),
    getTodo: (id) => (id === 1 ? todo : undefined),
    getSchedule: () => undefined,
    getTask: (id) => (id === 1 ? task : undefined),
    getTagNames: () => ["周复盘"],
    getProjectTitle: () => "咨询",
  };

  it("builds todo hit and markdown punch card", () => {
    const bundle = buildExportHits([1], deps, {
      projectLabel: "全库",
      tagsLabel: "周复盘",
      query: "",
      starredOnly: false,
      activityClass: null,
    });
    expect(bundle.todos).toHaveLength(1);
    expect(bundle.todos[0]!.tags).toBe("周复盘");
    expect(bundle.todos[0]!.startDay).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const md = toMarkdownReport(bundle);
    expect(md).toContain("日 × Tag 打卡");
    expect(md).toContain("周复盘");
    expect(md).toContain("复盘支架（ORID）");
    const csv = toTodoCsv(bundle);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("activityId");
  });
});
