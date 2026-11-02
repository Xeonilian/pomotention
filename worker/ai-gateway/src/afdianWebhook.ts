/**
 * 爱发电 Webhook：订阅订单自动写同步权益；打赏 plan 忽略。
 * 通知 URL 形如：https://gateway.../webhooks/afdian?k=<AFDIAN_WEBHOOK_TOKEN>
 */

export interface AfdianWebhookEnv {
  AI_KV: KVNamespace;
  /** 通知 URL 的 ?k= 与此一致；secret，勿入库 */
  AFDIAN_WEBHOOK_TOKEN?: string;
  /** 云同步月付 plan_id（可逗号多个） */
  AFDIAN_SYNC_PLAN_MONTH?: string;
  /** 云同步年付 plan_id */
  AFDIAN_SYNC_PLAN_YEAR?: string;
  /** 打赏等应忽略的 plan_id，逗号分隔 */
  AFDIAN_TIP_PLAN_IDS?: string;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** 爱发电要求的成功应答（非 200 会重试） */
function afdianOk(em = ""): Response {
  return new Response(JSON.stringify({ ec: 200, em }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function afdianFail(httpStatus: number, em: string): Response {
  return new Response(JSON.stringify({ ec: httpStatus, em }), {
    status: httpStatus,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

interface AfdianOrder {
  out_trade_no?: string;
  custom_order_id?: string;
  plan_id?: string;
  month?: number;
  status?: number;
  total_amount?: string;
}

function parseOrder(body: unknown): AfdianOrder | null {
  if (!body || typeof body !== "object") return null;
  const root = body as Record<string, unknown>;
  const data = root.data;
  if (!data || typeof data !== "object") return null;
  const order = (data as Record<string, unknown>).order;
  if (!order || typeof order !== "object") return null;
  return order as AfdianOrder;
}

function planIdSet(raw: string | undefined): Set<string> {
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/** 从 base 起加 calendar months（UTC 日） */
export function addCalendarMonths(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

async function grantSyncMonths(env: AfdianWebhookEnv, userId: string, months: number): Promise<string> {
  const key = `entitlement:sync:${userId}`;
  const now = Date.now();
  let startMs = now;
  const raw = await env.AI_KV.get(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { until?: string };
      if (parsed.until) {
        const prev = new Date(parsed.until).getTime();
        if (!Number.isNaN(prev) && prev > startMs) startMs = prev;
      }
    } catch {
      /* 坏数据则从 now 起算 */
    }
  }
  const until = addCalendarMonths(new Date(startMs), months).toISOString();
  await env.AI_KV.put(key, JSON.stringify({ until }));
  return until;
}

/**
 * POST /webhooks/afdian?k=...
 * 幂等键：afdian:order:<out_trade_no>
 */
export async function handleAfdianWebhook(req: Request, env: AfdianWebhookEnv): Promise<Response> {
  const url = new URL(req.url);
  const token = env.AFDIAN_WEBHOOK_TOKEN?.trim();
  if (!token) {
    return afdianFail(503, "webhook token not configured");
  }
  if (url.searchParams.get("k") !== token) {
    return afdianFail(401, "unauthorized");
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return afdianFail(400, "invalid json");
  }

  const order = parseOrder(body);
  if (!order) {
    // 结构不对：回 200 避免毒单狂重试；不写权益
    return afdianOk("ignored: bad payload");
  }

  const outTradeNo = typeof order.out_trade_no === "string" ? order.out_trade_no.trim() : "";
  if (!outTradeNo) {
    return afdianOk("ignored: no out_trade_no");
  }

  // 幂等：已处理过直接成功
  const orderKey = `afdian:order:${outTradeNo}`;
  const prior = await env.AI_KV.get(orderKey);
  if (prior) {
    return afdianOk("duplicate");
  }

  const planId = typeof order.plan_id === "string" ? order.plan_id.trim() : "";
  const tipPlans = planIdSet(env.AFDIAN_TIP_PLAN_IDS);
  const syncPlans = new Set<string>([
    ...planIdSet(env.AFDIAN_SYNC_PLAN_MONTH),
    ...planIdSet(env.AFDIAN_SYNC_PLAN_YEAR),
  ]);

  if (planId && tipPlans.has(planId)) {
    await env.AI_KV.put(orderKey, JSON.stringify({ action: "tip_skip", at: new Date().toISOString() }));
    return afdianOk("tip skipped");
  }

  if (!planId || !syncPlans.has(planId)) {
    await env.AI_KV.put(orderKey, JSON.stringify({ action: "unknown_plan_skip", planId, at: new Date().toISOString() }));
    return afdianOk("ignored: plan");
  }

  const customId = typeof order.custom_order_id === "string" ? order.custom_order_id.trim() : "";
  if (!UUID_RE.test(customId)) {
    // 站外付款无 uuid：本关不自动开，等认领；仍 200 + 记单避免重试刷屏
    await env.AI_KV.put(
      orderKey,
      JSON.stringify({ action: "need_redeem", planId, at: new Date().toISOString() }),
    );
    return afdianOk("ignored: no custom_order_id");
  }

  const months = typeof order.month === "number" && order.month > 0 ? Math.floor(order.month) : 1;
  const until = await grantSyncMonths(env, customId, months);

  await env.AI_KV.put(
    orderKey,
    JSON.stringify({
      action: "sync_granted",
      userId: customId,
      months,
      until,
      planId,
      at: new Date().toISOString(),
    }),
  );

  return afdianOk("ok");
}
