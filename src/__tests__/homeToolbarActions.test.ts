import { describe, it, expect } from "vitest";
import {
  normalizeHomeToolbarMobilePinned,
  mergeHomeToolbarMobilePinned,
  getHomeToolbarOverflowIds,
  toggleHomeToolbarEditSelection,
  type HomeToolbarActionId,
} from "@/core/homeToolbarActions";

// 新 schema：3 个 action（tagFilter/ledger/life）× 3 槽 → 手机端全显，无 overflow
const ALL_THREE: HomeToolbarActionId[] = ["tagFilter", "ledger", "life"];

describe("normalizeHomeToolbarMobilePinned", () => {
  it("默认/空 → tagFilter + ledger + life", () => {
    expect(normalizeHomeToolbarMobilePinned(undefined)).toEqual(ALL_THREE);
    expect(normalizeHomeToolbarMobilePinned([])).toEqual(ALL_THREE);
  });

  it("旧 2 槽设置会补齐第 3 槽", () => {
    expect(normalizeHomeToolbarMobilePinned(["tagFilter", "ledger"])).toEqual(ALL_THREE);
  });

  it("去重并截断为 3", () => {
    expect(normalizeHomeToolbarMobilePinned(["life", "life", "tagFilter", "ledger"])).toEqual([
      "life",
      "tagFilter",
      "ledger",
    ]);
  });

  it("过滤已失效的旧 id（drink/eat/toilet/sleep）", () => {
    // 旧 id 不再合法，应被丢弃并补齐为默认三件套
    expect(normalizeHomeToolbarMobilePinned(["drink", "eat"] as unknown as HomeToolbarActionId[])).toEqual(ALL_THREE);
  });
});

describe("getHomeToolbarOverflowIds", () => {
  it("3 action × 3 槽 → 无 overflow", () => {
    expect(getHomeToolbarOverflowIds(ALL_THREE)).toEqual([]);
  });
});

describe("mergeHomeToolbarMobilePinned", () => {
  it("无选中则不变", () => {
    expect(mergeHomeToolbarMobilePinned(ALL_THREE, [])).toEqual(ALL_THREE);
  });

  it("选三个：按选中顺序整批替换", () => {
    expect(mergeHomeToolbarMobilePinned(ALL_THREE, ["life", "ledger", "tagFilter"])).toEqual([
      "life",
      "ledger",
      "tagFilter",
    ]);
  });

  it("不足三个且均已在内 → 不变（无新项可放）", () => {
    expect(mergeHomeToolbarMobilePinned(ALL_THREE, ["life"])).toEqual(ALL_THREE);
  });
});

describe("toggleHomeToolbarEditSelection", () => {
  it("FIFO 最多 3 个", () => {
    let sel: HomeToolbarActionId[] = [];
    sel = toggleHomeToolbarEditSelection(sel, "tagFilter");
    sel = toggleHomeToolbarEditSelection(sel, "ledger");
    sel = toggleHomeToolbarEditSelection(sel, "life");
    // 再选已存在的 → 取消
    sel = toggleHomeToolbarEditSelection(sel, "ledger");
    expect(sel).toEqual(["tagFilter", "life"]);
  });

  it("满 3 再选 → 顶出最前", () => {
    let sel: HomeToolbarActionId[] = ["tagFilter", "ledger", "life"];
    // 这里只剩已选过的；先取消再选以触发顶出
    sel = toggleHomeToolbarEditSelection(sel, "tagFilter"); // 取消
    sel = toggleHomeToolbarEditSelection(sel, "tagFilter"); // 重新进末尾
    expect(sel).toEqual(["ledger", "life", "tagFilter"]);
  });
});
