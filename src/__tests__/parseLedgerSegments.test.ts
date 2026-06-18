import { describe, it, expect } from "vitest";
import { parseLedgerFromTitle } from "@/core/ledger/parseLedgerSegments";

describe("parseLedgerFromTitle MVP", () => {
  it("块外无 ￥…￥ 时不解析", () => {
    const r = parseLedgerFromTitle("开会写周报");
    expect(r.ok).toHaveLength(0);
    expect(r.diaryText).toBe("开会写周报");
  });

  it("块外裸 ￥ 不触发", () => {
    const r = parseLedgerFromTitle("开会 ￥-30买菜");
    expect(r.ok).toHaveLength(0);
    expect(r.diaryText).toBe("开会 ￥-30买菜");
  });

  it("￥…￥ 支出：金额、memo、分类", () => {
    const r = parseLedgerFromTitle("开会 ￥-30.00买菜#grocery￥ 回工位");
    expect(r.warnings).toHaveLength(0);
    expect(r.ok).toHaveLength(1);
    expect(r.ok[0]).toMatchObject({
      amount: 30,
      direction: "expense",
      currency: "CNY",
      memo: "买菜",
      categoryTagName: "grocery",
    });
    expect(r.diaryText).toBe("开会 回工位");
  });

  it("块内 + 为收入", () => {
    const r = parseLedgerFromTitle("￥+5000奖金#salary￥");
    expect(r.ok[0]).toMatchObject({ amount: 5000, direction: "income", memo: "奖金", categoryTagName: "salary" });
    expect(r.diaryText).toBe("");
  });

  it("多个块各一笔", () => {
    const r = parseLedgerFromTitle("日记 ￥-30买菜#grocery￥ ￥-15地铁#transport￥");
    expect(r.ok).toHaveLength(2);
    expect(r.ok[1]).toMatchObject({ amount: 15, memo: "地铁", categoryTagName: "transport" });
    expect(r.diaryText).toBe("日记");
  });

  it("未闭合块产生 warning 且保留原文", () => {
    const r = parseLedgerFromTitle("日记 ￥-30买菜");
    expect(r.ok).toHaveLength(0);
    expect(r.warnings.some((w) => w.message === "未闭合的记账块")).toBe(true);
    expect(r.diaryText).toContain("￥-30买菜");
  });

  it("块外 ￥￥ 转义为字面量 ￥", () => {
    const r = parseLedgerFromTitle("定价约 ￥￥ 非记账");
    expect(r.ok).toHaveLength(0);
    expect(r.diaryText).toBe("定价约 ￥ 非记账");
  });

  it("块外 $$ 转义为字面量 $", () => {
    const r = parseLedgerFromTitle("美元$$符号");
    expect(r.diaryText).toBe("美元$符号");
  });

  it("无金额时 warning", () => {
    const r = parseLedgerFromTitle("￥-买菜￥");
    expect(r.ok).toHaveLength(0);
    expect(r.warnings.some((w) => w.message === "缺少金额")).toBe(true);
  });

  it("保存前剥掉旧版自动摘要", () => {
    const r = parseLedgerFromTitle("日记 ￥-5咖啡￥ （账：支5）");
    expect(r.ok).toHaveLength(1);
    expect(r.diaryText).toBe("日记");
  });
});
