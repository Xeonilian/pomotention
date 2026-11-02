/**
 * 爱发电 Webhook：订阅订单自动写同步权益；打赏 plan 忽略。
 * 通知 URL 形如：https://gateway.../webhooks/afdian?k=<AFDIAN_WEBHOOK_TOKEN>
 *
 * 留痕：afdian:order:<out_trade_no>；用户索引 afdian:user-orders:<uuid>
 * 幂等：先写订单键（固定 until）再写权益；重试只 ensure ≥ until，不叠月
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

export type AfdianOrderAction =
  | "sync_granted"
  | "tip_skip"
  | "unknown_plan_skip"
  | "need_redeem";

/** KV 留痕记录 */
export interface AfdianOrderRecord {
  action: AfdianOrderAction;
  outTradeNo: string;
  userId?: string;
  planId?: string;
  months?: number;
  until?: string;
  totalAmount?: string;
  at: string;
  updatedAt?: string;
}

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

function orderKvKey(outTradeNo: string): string {
  return `afdian:order:${outTradeNo}`;
}

function userOrdersKvKey(userId: string): string {
  return `afdian:user-orders:${userId}`;
}

export function parseAfdianOrderRecord(raw: string | null): AfdianOrderRecord | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as AfdianOrderRecord;
    if (!o || typeof o !== "object" || typeof o.action !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

/** 从 base 起加 calendar months（UTC 日） */
export function addCalendarMonths(base: Date, months: number): Date {
  const d = new Date(base.getTime());
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

/** 权益至少到 targetUntil（不叠月；已有更高则保留） */
export async function ensureSyncUntil(
  env: AfdianWebhookEnv,
  userId: string,
  targetUntil: string,
): Promise<string> {
  const key = `entitlement:sync:${userId}`;
  const targetMs = Date.parse(targetUntil);
  if (Number.isNaN(targetMs)) {
    throw new Error("invalid targetUntil");
  }
  let finalMs = targetMs;
  const raw = await env.AI_KV.get(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { until?: string };
      if (parsed.until) {
        const prev = Date.parse(parsed.until);
        if (!Number.isNaN(prev) && prev > finalMs) finalMs = prev;
      }
    } catch {
      /* 坏数据则用 target */
    }
  }
  const until = new Date(finalMs).toISOString();
  await env.AI_KV.put(key, JSON.stringify({ until }));
  return until;
}

/** 只算 until，不写权益 */
async function computeGrantUntil(
  env: AfdianWebhookEnv,
  userId: string,
  months: number,
): Promise<string> {
  const key = `entitlement:sync:${userId}`;
  const now = Date.now();
  let startMs = now;
  const raw = await env.AI_KV.get(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { until?: string };
      if (parsed.until) {
        const prev = Date.parse(parsed.until);
        if (!Number.isNaN(prev) && prev > startMs) startMs = prev;
      }
    } catch {
      /* 坏数据则从 now 起算 */
    }
  }
  return addCalendarMonths(new Date(startMs), months).toISOString();
}

async function putOrderRecord(env: AfdianWebhookEnv, record: AfdianOrderRecord): Promise<void> {
  await env.AI_KV.put(orderKvKey(record.outTradeNo), JSON.stringify(record));
}

/** 用户侧订单号索引，便于按 uuid 查留痕 */
async function appendUserOrderIndex(
  env: AfdianWebhookEnv,
  userId: string,
  outTradeNo: string,
): Promise<void> {
  const key = userOrdersKvKey(userId);
  let list: string[] = [];
  const raw = await env.AI_KV.get(key);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) {
        list = parsed.filter((x): x is string => typeof x === "string");
      }
    } catch {
      list = [];
    }
  }
  if (!list.includes(outTradeNo)) {
    list.push(outTradeNo);
    await env.AI_KV.put(key, JSON.stringify(list));
  }
}

export async function getAfdianOrderByTradeNo(
  env: AfdianWebhookEnv,
  outTradeNo: string,
): Promise<AfdianOrderRecord | null> {
  return parseAfdianOrderRecord(await env.AI_KV.get(orderKvKey(outTradeNo)));
}

export async function listAfdianOrdersForUser(
  env: AfdianWebhookEnv,
  userId: string,
): Promise<AfdianOrderRecord[]> {
  const raw = await env.AI_KV.get(userOrdersKvKey(userId));
  if (!raw) return [];
  let nos: string[] = [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      nos = parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    return [];
  }
  const out: AfdianOrderRecord[] = [];
  for (const no of nos) {
    const rec = await getAfdianOrderByTradeNo(env, no);
    if (rec) out.push(rec);
  }
  return out;
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

  const totalAmount = typeof order.total_amount === "string" ? order.total_amount : undefined;
  const nowIso = new Date().toISOString();

  // 已留痕：只补齐权益，绝不叠月
  const prior = await getAfdianOrderByTradeNo(env, outTradeNo);
  if (prior) {
    if (prior.action === "sync_granted" && prior.userId && prior.until) {
      await ensureSyncUntil(env, prior.userId, prior.until);
      await putOrderRecord(env, { ...prior, updatedAt: nowIso });
      return afdianOk("duplicate");
    }
    return afdianOk("duplicate");
  }

  const planId = typeof order.plan_id === "string" ? order.plan_id.trim() : "";
  const tipPlans = planIdSet(env.AFDIAN_TIP_PLAN_IDS);
  const syncPlans = new Set<string>([
    ...planIdSet(env.AFDIAN_SYNC_PLAN_MONTH),
    ...planIdSet(env.AFDIAN_SYNC_PLAN_YEAR),
  ]);

  if (planId && tipPlans.has(planId)) {
    await putOrderRecord(env, {
      action: "tip_skip",
      outTradeNo,
      planId,
      totalAmount,
      at: nowIso,
    });
    return afdianOk("tip skipped");
  }

  if (!planId || !syncPlans.has(planId)) {
    await putOrderRecord(env, {
      action: "unknown_plan_skip",
      outTradeNo,
      planId: planId || undefined,
      totalAmount,
      at: nowIso,
    });
    return afdianOk("ignored: plan");
  }

  const customId = typeof order.custom_order_id === "string" ? order.custom_order_id.trim() : "";
  if (!UUID_RE.test(customId)) {
    // 站外付款无 uuid：本关不自动开，等认领；仍 200 + 记单避免重试刷屏
    await putOrderRecord(env, {
      action: "need_redeem",
      outTradeNo,
      planId,
      totalAmount,
      at: nowIso,
    });
    return afdianOk("ignored: no custom_order_id");
  }

  const months = typeof order.month === "number" && order.month > 0 ? Math.floor(order.month) : 1;
  const until = await computeGrantUntil(env, customId, months);

  // 先写订单键（这笔付款 = 这个 until），再写权益
  const record: AfdianOrderRecord = {
    action: "sync_granted",
    outTradeNo,
    userId: customId,
    planId,
    months,
    until,
    totalAmount,
    at: nowIso,
  };
  await putOrderRecord(env, record);
  await appendUserOrderIndex(env, customId, outTradeNo);

  // 以 KV 中确认的记录为准（极端并发下取留痕里的 until）
  const confirmed = (await getAfdianOrderByTradeNo(env, outTradeNo)) ?? record;
  const finalUntil = confirmed.until ?? until;
  const finalUser = confirmed.userId ?? customId;
  await ensureSyncUntil(env, finalUser, finalUntil);

  return afdianOk("ok");
}
