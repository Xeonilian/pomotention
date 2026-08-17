import { describe, it, expect, afterEach, vi } from "vitest";
import {
  AFDIAN_CREATOR_URL,
  buildAfdianSubscribeUrl,
  buildAfdianTipUrl,
  isPomUserId,
} from "@/core/billing/afdian";

describe("afdian checkout URLs", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("isPomUserId 只接受 uuid", () => {
    expect(isPomUserId("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
    expect(isPomUserId("not-a-uuid")).toBe(false);
    expect(isPomUserId("")).toBe(false);
    expect(isPomUserId(undefined)).toBe(false);
  });

  it("未登录订阅链接不带 custom_order_id", () => {
    const url = new URL(buildAfdianSubscribeUrl());
    expect(url.origin + url.pathname).toBe(AFDIAN_CREATOR_URL);
    expect(url.searchParams.get("custom_order_id")).toBeNull();
  });

  it("已登录订阅链接带 custom_order_id", () => {
    const uid = "550e8400-e29b-41d4-a716-446655440000";
    const url = new URL(buildAfdianSubscribeUrl(uid));
    expect(url.searchParams.get("custom_order_id")).toBe(uid);
  });

  it("非法 userId 不写入 custom_order_id", () => {
    const url = new URL(buildAfdianSubscribeUrl("user@example.com"));
    expect(url.searchParams.get("custom_order_id")).toBeNull();
  });

  it("打赏链接带默认 9 元，不带 custom_order_id", () => {
    const url = new URL(buildAfdianTipUrl());
    expect(url.searchParams.get("custom_price")).toBe("9");
    expect(url.searchParams.get("custom_order_id")).toBeNull();
  });
});
