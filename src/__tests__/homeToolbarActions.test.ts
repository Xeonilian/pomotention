import { describe, it, expect } from "vitest";
import {
  normalizeHomeToolbarMobilePinned,
  mergeHomeToolbarMobilePinned,
  getHomeToolbarOverflowIds,
  toggleHomeToolbarEditSelection,
  type HomeToolbarActionId,
} from "@/core/homeToolbarActions";

describe("normalizeHomeToolbarMobilePinned", () => {
  it("默认 tagFilter + ledger", () => {
    expect(normalizeHomeToolbarMobilePinned(undefined)).toEqual(["tagFilter", "ledger"]);
    expect(normalizeHomeToolbarMobilePinned([])).toEqual(["tagFilter", "ledger"]);
  });

  it("去重并截断为 2", () => {
    expect(normalizeHomeToolbarMobilePinned(["drink", "drink", "sleep", "eat"])).toEqual(["drink", "sleep"]);
  });
});

describe("getHomeToolbarOverflowIds", () => {
  it("排除已固定项", () => {
    expect(getHomeToolbarOverflowIds(["tagFilter", "ledger"])).toEqual(["drink", "eat", "toilet", "sleep"]);
  });
});

describe("mergeHomeToolbarMobilePinned", () => {
  it("无选中则不变", () => {
    expect(mergeHomeToolbarMobilePinned(["tagFilter", "ledger"], [])).toEqual(["tagFilter", "ledger"]);
  });

  it("只选一个：保留左槽、替换右槽", () => {
    expect(mergeHomeToolbarMobilePinned(["tagFilter", "ledger"], ["drink"])).toEqual(["tagFilter", "drink"]);
    expect(mergeHomeToolbarMobilePinned(["tagFilter", "drink"], ["sleep"])).toEqual(["tagFilter", "sleep"]);
  });

  it("选两个：整批替换", () => {
    expect(mergeHomeToolbarMobilePinned(["tagFilter", "ledger"], ["drink", "sleep"])).toEqual(["drink", "sleep"]);
  });
});

describe("toggleHomeToolbarEditSelection", () => {
  it("FIFO 最多 2 个", () => {
    let sel: HomeToolbarActionId[] = [];
    sel = toggleHomeToolbarEditSelection(sel, "drink");
    sel = toggleHomeToolbarEditSelection(sel, "eat");
    sel = toggleHomeToolbarEditSelection(sel, "toilet");
    expect(sel).toEqual(["eat", "toilet"]);
  });
});
