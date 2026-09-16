import { describe, it, expect } from "vitest";
import {
  normalizeHomeToolbarMobilePinned,
  mergeHomeToolbarMobilePinned,
  getHomeToolbarOverflowIds,
  toggleHomeToolbarEditSelection,
  type HomeToolbarActionId,
} from "@/core/homeToolbarActions";

describe("normalizeHomeToolbarMobilePinned", () => {
  it("默认 tagFilter + ledger + drink", () => {
    expect(normalizeHomeToolbarMobilePinned(undefined)).toEqual(["tagFilter", "ledger", "drink"]);
    expect(normalizeHomeToolbarMobilePinned([])).toEqual(["tagFilter", "ledger", "drink"]);
  });

  it("旧 2 槽设置会补齐第 3 槽", () => {
    expect(normalizeHomeToolbarMobilePinned(["tagFilter", "ledger"])).toEqual(["tagFilter", "ledger", "drink"]);
  });

  it("去重并截断为 3", () => {
    expect(normalizeHomeToolbarMobilePinned(["drink", "drink", "sleep", "eat", "toilet"])).toEqual([
      "drink",
      "sleep",
      "eat",
    ]);
  });
});

describe("getHomeToolbarOverflowIds", () => {
  it("排除已固定项", () => {
    expect(getHomeToolbarOverflowIds(["tagFilter", "ledger", "drink"])).toEqual(["eat", "toilet", "sleep"]);
  });
});

describe("mergeHomeToolbarMobilePinned", () => {
  it("无选中则不变", () => {
    expect(mergeHomeToolbarMobilePinned(["tagFilter", "ledger", "drink"], [])).toEqual([
      "tagFilter",
      "ledger",
      "drink",
    ]);
  });

  it("只选一个：接到末尾，顶出最前", () => {
    expect(mergeHomeToolbarMobilePinned(["tagFilter", "ledger", "drink"], ["eat"])).toEqual([
      "ledger",
      "drink",
      "eat",
    ]);
    expect(mergeHomeToolbarMobilePinned(["ledger", "drink", "eat"], ["sleep"])).toEqual([
      "drink",
      "eat",
      "sleep",
    ]);
  });

  it("选两个：接到末尾，顶出最前两个", () => {
    expect(mergeHomeToolbarMobilePinned(["tagFilter", "ledger", "drink"], ["eat", "sleep"])).toEqual([
      "drink",
      "eat",
      "sleep",
    ]);
  });

  it("选三个：整批替换", () => {
    expect(mergeHomeToolbarMobilePinned(["tagFilter", "ledger", "drink"], ["eat", "sleep", "toilet"])).toEqual([
      "eat",
      "sleep",
      "toilet",
    ]);
  });
});

describe("toggleHomeToolbarEditSelection", () => {
  it("FIFO 最多 3 个", () => {
    let sel: HomeToolbarActionId[] = [];
    sel = toggleHomeToolbarEditSelection(sel, "drink");
    sel = toggleHomeToolbarEditSelection(sel, "eat");
    sel = toggleHomeToolbarEditSelection(sel, "toilet");
    sel = toggleHomeToolbarEditSelection(sel, "sleep");
    expect(sel).toEqual(["eat", "toilet", "sleep"]);
  });
});
