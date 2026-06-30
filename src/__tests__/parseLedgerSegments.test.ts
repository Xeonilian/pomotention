import { describe, it, expect } from "vitest";
import {
  parseLedgerFromTitle,
  stripLedgerSummarySuffix,
  formatLedgerSummaryBracket,
  composeLedgerTitle,
  getTitleTagPickerMode,
  replaceTagTriggerWithCategory,
  isInLedgerInputZone,
} from "@/core/ledger/parseLedgerSegments";

describe("parseLedgerFromTitle v1", () => {
  it("无触发符时不解析", () => {
    const r = parseLedgerFromTitle("开会写周报");
    expect(r.ok).toHaveLength(0);
    expect(r.diaryText).toBe("开会写周报");
  });

  it("有触发但无结尾符时不解析", () => {
    const r = parseLedgerFromTitle("今天 -3度出门");
    expect(r.ok).toHaveLength(0);
    expect(r.diaryText).toBe("今天 -3度出门");
  });

  it("单笔记账：日记 + 汇总", () => {
    const r = parseLedgerFromTitle("买菜 -30 西瓜 -25#grocery 喝的￥");
    expect(r.warnings).toHaveLength(0);
    expect(r.ok).toHaveLength(2);
    expect(r.ok[0]).toMatchObject({ amount: 30, direction: "expense", memo: "西瓜" });
    expect(r.ok[1]).toMatchObject({ amount: 25, direction: "expense", categoryTagNames: ["grocery"], memo: "喝的" });
    expect(r.diaryText).toBe("买菜 西瓜 喝的");
  });

  it("收入与支出 + 分号分段", () => {
    const r = parseLedgerFromTitle("奖金 +5000; 午饭 -30￥");
    expect(r.ok).toHaveLength(2);
    expect(r.ok[0]).toMatchObject({ amount: 5000, direction: "income", memo: "午饭" });
    expect(r.ok[1]).toMatchObject({ amount: 30, direction: "expense" });
    expect(r.diaryText).toBe("奖金 午饭");
  });

  it("$ 结尾符", () => {
    const r = parseLedgerFromTitle("咖啡 -15$");
    expect(r.ok).toHaveLength(1);
    expect(r.ok[0].amount).toBe(15);
  });

  it("行首无空格也可触发", () => {
    const r = parseLedgerFromTitle("-10 早餐￥");
    expect(r.ok).toHaveLength(1);
    expect(r.ok[0].amount).toBe(10);
    expect(r.diaryText).toBe("早餐");
  });

  it("仅记账段在开头", () => {
    const r = parseLedgerFromTitle("-10 早餐￥");
    expect(r.ok).toHaveLength(1);
    expect(r.ok[0].amount).toBe(10);
  });

  it("保存前剥旧汇总括号", () => {
    const r = parseLedgerFromTitle("买菜（-55） -10 零食￥");
    expect(r.ok).toHaveLength(1);
    expect(r.ok[0].amount).toBe(10);
    expect(r.diaryText).toBe("买菜 零食");
  });
});

describe("formatLedgerSummaryBracket", () => {
  it("仅非零项", () => {
    expect(formatLedgerSummaryBracket([{ direction: "expense", amount: 30 }, { direction: "expense", amount: 25 }])).toBe(
      "（-55）",
    );
    expect(formatLedgerSummaryBracket([{ direction: "income", amount: 5000 }])).toBe("（+5000）");
    expect(
      formatLedgerSummaryBracket([
        { direction: "expense", amount: 30 },
        { direction: "income", amount: 5000 },
      ]),
    ).toBe("（-30 +5000）");
  });
});

describe("composeLedgerTitle", () => {
  it("组合日记与括号", () => {
    expect(composeLedgerTitle("买菜 西瓜", "（-55）")).toBe("买菜 西瓜（-55）");
    expect(composeLedgerTitle("", "（-30）")).toBe("（-30）");
  });
});

describe("getTitleTagPickerMode", () => {
  it("记账段内为 ledgerText", () => {
    expect(getTitleTagPickerMode("买菜 -30#gro")).toBe("ledgerText");
    expect(getTitleTagPickerMode("买菜 -30￥", 6)).toBe("ledgerText");
    expect(getTitleTagPickerMode("买菜 -30￥")).toBe("activity");
  });

  it("￥ 之后为 activity", () => {
    expect(getTitleTagPickerMode("买菜 -30￥ #urg")).toBe("activity");
  });

  it("段外为 activity", () => {
    expect(getTitleTagPickerMode("开会 #urgent")).toBe("activity");
    expect(getTitleTagPickerMode("今天 -3度")).toBe("activity");
  });
});

describe("replaceTagTriggerWithCategory", () => {
  it("替换末尾 #query", () => {
    expect(replaceTagTriggerWithCategory("买菜 -30#gro", "grocery")).toBe("买菜 -30#grocery ");
  });
});

describe("stripLedgerSummarySuffix", () => {
  it("剥 v1 括号", () => {
    expect(stripLedgerSummarySuffix("买菜（-55）")).toBe("买菜");
  });
});
