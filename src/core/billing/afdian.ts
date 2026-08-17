/** 爱发电创作者页；结账参数见爱发电开发者文档 */

export const AFDIAN_CREATOR_URL = "https://afdian.com/a/xeonilian";
export const SUBSCRIBE_PRICE_YUAN = 19;
export const TIP_DEFAULT_YUAN = 9;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isPomUserId(value: string | null | undefined): value is string {
  return typeof value === "string" && UUID_RE.test(value.trim());
}

function withQuery(base: string, params: Record<string, string>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }
  return url.toString();
}

/** 订阅结账。已登录时带 custom_order_id，给下一关 webhook 对账；本关仍人工开通。 */
export function buildAfdianSubscribeUrl(userId?: string | null): string {
  const params: Record<string, string> = {};
  const planId = import.meta.env.VITE_AFDIAN_PLAN_ID?.trim();
  if (planId) params.plan_id = planId;
  if (isPomUserId(userId)) params.custom_order_id = userId.trim();
  return withQuery(AFDIAN_CREATOR_URL, params);
}

/** 打赏（非权益）。默认金额 9 元，走自选金额参数。 */
export function buildAfdianTipUrl(): string {
  return withQuery(AFDIAN_CREATOR_URL, { custom_price: String(TIP_DEFAULT_YUAN) });
}

export function openExternalUrl(url: string): void {
  window.open(url, "_blank", "noopener,noreferrer");
}
