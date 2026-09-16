import { describe, it, expect } from "vitest";
import {
  normalizeTaskToolbarMobilePinned,
  mergeTaskToolbarMobilePinned,
  getTaskToolbarOverflowIds,
  toggleTaskToolbarEditSelection,
  type TaskToolbarActionId,
} from "@/core/taskToolbarActions";

describe("normalizeTaskToolbarMobilePinned", () => {
  it("默认 star + tag + energy", () => {
    expect(normalizeTaskToolbarMobilePinned(undefined)).toEqual(["star", "tag", "energy"]);
    expect(normalizeTaskToolbarMobilePinned([])).toEqual(["star", "tag", "energy"]);
  });

  it("旧 2 槽设置会补齐第 3 槽", () => {
    expect(normalizeTaskToolbarMobilePinned(["star", "tag"])).toEqual(["star", "tag", "energy"]);
  });

  it("去重并截断为 3", () => {
    expect(normalizeTaskToolbarMobilePinned(["energy", "energy", "reward", "template", "star"])).toEqual([
      "energy",
      "reward",
      "template",
    ]);
  });
});

describe("getTaskToolbarOverflowIds", () => {
  it("排除已固定项", () => {
    expect(getTaskToolbarOverflowIds(["star", "tag", "energy"])).toEqual(["reward", "interruption", "template"]);
  });
});

describe("mergeTaskToolbarMobilePinned", () => {
  it("无选中则不变", () => {
    expect(mergeTaskToolbarMobilePinned(["star", "tag", "energy"], [])).toEqual(["star", "tag", "energy"]);
  });

  it("只选一个：接到末尾，顶出最前", () => {
    expect(mergeTaskToolbarMobilePinned(["star", "tag", "energy"], ["reward"])).toEqual([
      "tag",
      "energy",
      "reward",
    ]);
    expect(mergeTaskToolbarMobilePinned(["tag", "energy", "reward"], ["template"])).toEqual([
      "energy",
      "reward",
      "template",
    ]);
  });

  it("选两个：接到末尾，顶出最前两个", () => {
    expect(mergeTaskToolbarMobilePinned(["star", "tag", "energy"], ["reward", "template"])).toEqual([
      "energy",
      "reward",
      "template",
    ]);
  });

  it("选三个：整批替换", () => {
    expect(mergeTaskToolbarMobilePinned(["star", "tag", "energy"], ["reward", "interruption", "template"])).toEqual([
      "reward",
      "interruption",
      "template",
    ]);
  });
});

describe("toggleTaskToolbarEditSelection", () => {
  it("FIFO 最多 3 个", () => {
    let sel: TaskToolbarActionId[] = [];
    sel = toggleTaskToolbarEditSelection(sel, "energy");
    sel = toggleTaskToolbarEditSelection(sel, "reward");
    sel = toggleTaskToolbarEditSelection(sel, "interruption");
    sel = toggleTaskToolbarEditSelection(sel, "template");
    expect(sel).toEqual(["reward", "interruption", "template"]);
  });
});
