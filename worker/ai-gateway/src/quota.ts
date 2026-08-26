/** 月配额数字与 402 业务码；无 Cloudflare 依赖，便于单测。 */

export const DEFAULT_FREE_MONTHLY_QUOTA = 20;
export const DEFAULT_PREMIUM_MONTHLY_QUOTA = 2000;

export function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function monthlyQuotaLimit(isPremium: boolean, freeQuota: number, premiumQuota: number): number {
  return isPremium ? premiumQuota : freeQuota;
}

export function quotaExhaustedCode(isPremium: boolean): "PREMIUM_QUOTA_EXHAUSTED" | "QUOTA_EXHAUSTED" {
  return isPremium ? "PREMIUM_QUOTA_EXHAUSTED" : "QUOTA_EXHAUSTED";
}
