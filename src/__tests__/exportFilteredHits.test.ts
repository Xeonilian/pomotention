import { describe, it, expect } from "vitest";
import {
  buildExportHits,
  toMarkdownReport,
  toTodoCsv,
  toExportJson,
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
    description: "会谈中谈到边界与请求。",
    energyRecords: [{ id: 100, value: 6, description: "会后" }],
    rewardRecords: [{ id: 101, value: 8 }],
    interruptionRecords: [{ id: 102, interruptionType: "E", description: "手机响" }],
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

  it("builds markdown + slim JSON times", () => {
    const bundle = buildExportHits([1], deps, {
      projectLabel: "",
      tagsLabel: "周复盘",
      query: "",
      starredOnly: false,
      activityClass: null,
    });
    expect(bundle.todos).toHaveLength(1);

    const md = toMarkdownReport(bundle);
    expect(md).toMatch(/^日期：\d{4}-\d{2}-\d{2}/m);
    expect(md).toContain("- `周复盘` 1");
    expect(md).toContain("[1](#n-1)");
    expect(md).toContain("边界感");
    expect(md).toContain("```markdown");

    const csv = toTodoCsv(bundle);
    expect(csv.startsWith("\uFEFF")).toBe(true);

    const json = JSON.parse(toExportJson(bundle));
    expect(json.meta.summary.energyN).toBe(1);
    expect(json.todos[0].start).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(json.todos[0].due).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(json.todos[0].done).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(json.todos[0]).not.toHaveProperty("startText");
    expect(json.todos[0]).not.toHaveProperty("startDay");
    expect(json.todos[0]).not.toHaveProperty("startTime");
    expect(json.todos[0]).not.toHaveProperty("dueDay");
    expect(json.todos[0]).not.toHaveProperty("dueAt");
    expect(json.todos[0].tags).toEqual(["周复盘"]);
    expect(json.todos[0].energy[0]).toEqual(expect.objectContaining({ at: expect.any(String), value: 6 }));
    expect(json.todos[0].energy[0]).not.toHaveProperty("atDay");
  });
});
