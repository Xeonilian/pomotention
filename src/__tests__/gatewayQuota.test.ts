import { describe, it, expect } from "vitest";
import {
  DEFAULT_FREE_MONTHLY_QUOTA,
  DEFAULT_PREMIUM_MONTHLY_QUOTA,
  monthlyQuotaLimit,
  parsePositiveInt,
  quotaExhaustedCode,
} from "../../worker/ai-gateway/src/quota";

describe("gateway monthly quota", () => {
  it("free / premium 上限与业务码", () => {
    expect(monthlyQuotaLimit(false, DEFAULT_FREE_MONTHLY_QUOTA, DEFAULT_PREMIUM_MONTHLY_QUOTA)).toBe(20);
    expect(monthlyQuotaLimit(true, DEFAULT_FREE_MONTHLY_QUOTA, DEFAULT_PREMIUM_MONTHLY_QUOTA)).toBe(2000);
    expect(quotaExhaustedCode(false)).toBe("QUOTA_EXHAUSTED");
    expect(quotaExhaustedCode(true)).toBe("PREMIUM_QUOTA_EXHAUSTED");
  });

  it("parsePositiveInt 忽略非法值", () => {
    expect(parsePositiveInt(undefined, 20)).toBe(20);
    expect(parsePositiveInt("0", 20)).toBe(20);
    expect(parsePositiveInt("abc", 20)).toBe(20);
    expect(parsePositiveInt("2000", 20)).toBe(2000);
  });
});
