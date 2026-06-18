import { describe, it, expect } from "vitest";
import {
  normalizeTaskToolbarMobilePinned,
  mergeTaskToolbarMobilePinned,
  getTaskToolbarOverflowIds,
  toggleTaskToolbarEditSelection,
} from "@/core/taskToolbarActions";

describe("normalizeTaskToolbarMobilePinned", () => {
  it("默认 star + tag", () => {
    expect(normalizeTaskToolbarMobilePinned(undefined)).toEqual(["star", "tag"]);
    expect(normalizeTaskToolbarMobilePinned([])).toEqual(["star", "tag"]);
  });

  it("去重并截断为 2", () => {
    expect(normalizeTaskToolbarMobilePinned(["energy", "energy", "reward", "template"])).toEqual(["energy", "reward"]);
  });
});

describe("getTaskToolbarOverflowIds", () => {
  it("排除已固定项", () => {
    expect(getTaskToolbarOverflowIds(["star", "tag"])).toEqual(["energy", "reward", "interruption", "template"]);
  });
});

describe("mergeTaskToolbarMobilePinned", () => {
  it("无选中则不变", () => {
    expect(mergeTaskToolbarMobilePinned(["star", "tag"], [])).toEqual(["star", "tag"]);
  });

  it("只选一个：保留左槽、替换右槽", () => {
    expect(mergeTaskToolbarMobilePinned(["star", "tag"], ["energy"])).toEqual(["star", "energy"]);
    expect(mergeTaskToolbarMobilePinned(["star", "energy"], ["reward"])).toEqual(["star", "reward"]);
  });

  it("选两个：整批替换未保留槽", () => {
    expect(mergeTaskToolbarMobilePinned(["star", "tag"], ["energy", "reward"])).toEqual(["energy", "reward"]);
  });
});

describe("toggleTaskToolbarEditSelection", () => {
  it("FIFO 最多 2 个", () => {
    let sel: ("star" | "tag" | "energy")[] = [];
    sel = toggleTaskToolbarEditSelection(sel, "energy");
    sel = toggleTaskToolbarEditSelection(sel, "reward");
    sel = toggleTaskToolbarEditSelection(sel, "interruption");
    expect(sel).toEqual(["reward", "interruption"]);
  });
});
