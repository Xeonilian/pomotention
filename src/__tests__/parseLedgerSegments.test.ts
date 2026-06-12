import { describe, it, expect } from "vitest";
import { parseLedgerSegments, normalizeTitleAfterParse } from "@/core/ledger/parseLedgerSegments";

describe("parseLedgerSegments", () => {
  it("无触发符时返回空", () => {
    const r = parseLedgerSegments("开会写周报");
    expect(r.ok).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  it("￥ 支出：金额、memo、分类", () => {
    const r = parseLedgerSegments("开会 ￥-30.00买菜#grocery 回工位");
    expect(r.warnings).toHaveLength(0);
    expect(r.ok).toHaveLength(1);
    expect(r.ok[0]).toMatchObject({
      amount: 30,
      direction: "expense",
      currency: "CNY",
      memo: "买菜",
      categoryTagName: "grocery",
      segmentIndex: 0,
    });
  });

  it("买 + 数字触发", () => {
    const r = parseLedgerSegments("买30买菜#grocery");
    expect(r.ok[0]).toMatchObject({
      amount: 30,
      direction: "expense",
      memo: "买菜",
      categoryTagName: "grocery",
    });
  });

  it("收入关键词", () => {
    const r = parseLedgerSegments("收入5000工资#salary");
    expect(r.ok[0]).toMatchObject({
      amount: 5000,
      direction: "income",
      memo: "工资",
      categoryTagName: "salary",
    });
  });

  it("支出关键词", () => {
    const r = parseLedgerSegments("支出15.5地铁");
    expect(r.ok[0]).toMatchObject({
      amount: 15.5,
      direction: "expense",
      memo: "地铁",
    });
  });

  it("￥+ 为收入", () => {
    const r = parseLedgerSegments("￥+5000奖金");
    expect(r.ok[0]).toMatchObject({ amount: 5000, direction: "income", memo: "奖金" });
  });

  it("$ 仅提示符，默认币种来自设置", () => {
    const r = parseLedgerSegments("$-12 lunch", "USD");
    expect(r.ok[0]).toMatchObject({ amount: 12, direction: "expense", currency: "USD", memo: "lunch" });
  });

  it("显式 ISO 币种", () => {
    const r = parseLedgerSegments("￥-9.99 USD 订阅#grocery");
    expect(r.ok[0]).toMatchObject({
      amount: 9.99,
      currency: "USD",
      memo: "订阅",
      categoryTagName: "grocery",
    });
  });

  it("中文逗号分笔", () => {
    const r = parseLedgerSegments("￥-30买菜#grocery，买15地铁#transport");
    expect(r.ok).toHaveLength(2);
    expect(r.ok[0].categoryTagName).toBe("grocery");
    expect(r.ok[1]).toMatchObject({ amount: 15, memo: "地铁", categoryTagName: "transport" });
  });

  it("顿号分笔", () => {
    const r = parseLedgerSegments("买10#a、买20#b");
    expect(r.ok).toHaveLength(2);
    expect(r.ok[0].amount).toBe(10);
    expect(r.ok[1].amount).toBe(20);
  });

  it("英文逗号分笔", () => {
    const r = parseLedgerSegments("￥-1#a,￥-2#b");
    expect(r.ok).toHaveLength(2);
  });

  it("叙述逗号不触发分笔；片段后接自由文建议用分隔符", () => {
    const r = parseLedgerSegments("开会，对接 ￥-30买菜，继续");
    expect(r.ok).toHaveLength(1);
    expect(r.ok[0].memo).toBe("买菜");
  });

  it("无金额时产生 warning", () => {
    const r = parseLedgerSegments("开会 ￥买菜 结束");
    expect(r.ok).toHaveLength(0);
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0].message).toBe("缺少金额");
  });

  it("买后无数字不触发", () => {
    const r = parseLedgerSegments("买好了午饭");
    expect(r.ok).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
  });

  it("部分成功部分失败", () => {
    const r = parseLedgerSegments("￥-30买菜#grocery ￥买菜");
    expect(r.ok).toHaveLength(1);
    expect(r.warnings).toHaveLength(1);
  });

  it("仅分类无 memo", () => {
    const r = parseLedgerSegments("￥-30#grocery");
    expect(r.ok[0]).toMatchObject({ amount: 30, memo: undefined, categoryTagName: "grocery" });
  });

  it("rawSegment 保留原文片段", () => {
    const title = "￥-30买菜#grocery";
    const r = parseLedgerSegments(title);
    expect(r.ok[0].rawSegment).toBe(title);
  });

  it("segmentIndex 递增", () => {
    const r = parseLedgerSegments("买1#a、买2#b、买3#c");
    expect(r.ok.map((s) => s.segmentIndex)).toEqual([0, 1, 2]);
  });
});

describe("normalizeTitleAfterParse", () => {
  it("剥掉片段内 #分类", () => {
    const title = "开会 ￥-30买菜#grocery 回工位";
    const { ok } = parseLedgerSegments(title);
    expect(normalizeTitleAfterParse(title, ok)).toBe("开会 ￥-30买菜 回工位");
  });

  it("多笔均剥 #", () => {
    const title = "￥-30#grocery，买15#transport";
    const { ok } = parseLedgerSegments(title);
    expect(normalizeTitleAfterParse(title, ok)).toBe("￥-30，买15");
  });

  it("无分类时不改 title", () => {
    const title = "买30地铁";
    const { ok } = parseLedgerSegments(title);
    expect(normalizeTitleAfterParse(title, ok)).toBe(title);
  });

  it("空片段列表返回原文", () => {
    expect(normalizeTitleAfterParse("普通待办", [])).toBe("普通待办");
  });
});
