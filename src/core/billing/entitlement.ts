// src/core/billing/entitlement.ts
// 同步权益：首次查权益起 14 天免费试用（起点存服务端 KV，幂等），到期需付费。
// 不复用一句记的 premium。试用锚点在服务端，老用户也能拿满 14 天，清客户端缓存改不了。
import { getSession } from "@/core/services/authService";

/** 短缓存，避免自动同步频繁打网关 */
const CACHE_TTL_MS = 60_000;

interface EntitlementResponse {
  ai: { plan: "free" | "premium"; until?: string };
  sync: { until?: string; trialUntil?: string };
}

export type SyncDenyReason = "expired" | "no-session";

export interface SyncEntitlementResult {
  /** 是否允许同步 */
  allowed: boolean;
  /** 不允许时的原因；允许时为 null */
  denyReason: SyncDenyReason | null;
  /** 试用到期时间（服务端首次查时写入起点 + 14 天），ISO；未查到为 null */
  trialUntil: string | null;
  /** 付费到期时间，ISO；未付费为 null */
  paidUntil: string | null;
}

interface CacheEntry {
  result: SyncEntitlementResult;
  ts: number;
}

let cache: CacheEntry | null = null;

function workerBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_AI_WORKER_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, "");
  }
  return "";
}

/**
 * 查当前用户的同步权益。
 * - 未配置 Worker（本地/未启用）：放行，不拦
 * - 未登录：拒绝（no-session）
 * - 网关不可达：放行（fail-open，不锁住付费用户；不缓存，下次重试）
 * - 试用未到期（服务端 trialUntil > now）：放行
 * - 付费未到期（sync.until > now）：放行
 * - 否则：拒绝（expired）
 */
export async function getSyncEntitlement(): Promise<SyncEntitlementResult> {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return cache.result;
  }

  const base = workerBaseUrl();
  // 未配置网关：不拦（兼容本地模式 / 未启用同步）
  if (!base) {
    return { allowed: true, denyReason: null, trialUntil: null, paidUntil: null };
  }

  const session = await getSession();
  const jwt = session?.access_token;
  if (!jwt) {
    return { allowed: false, denyReason: "no-session", trialUntil: null, paidUntil: null };
  }

  let paidUntil: string | null = null;
  let trialUntil: string | null = null;
  try {
    const res = await fetch(`${base}/v1/entitlement`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!res.ok) {
      // 网关出错：fail-open，不缓存
      return { allowed: true, denyReason: null, trialUntil: null, paidUntil: null };
    }
    const data = (await res.json()) as EntitlementResponse;
    paidUntil = data.sync?.until ?? null;
    trialUntil = data.sync?.trialUntil ?? null;
  } catch {
    // 网关不可达：fail-open，不缓存
    return { allowed: true, denyReason: null, trialUntil: null, paidUntil: null };
  }

  const now = Date.now();
  const paid = paidUntil ? new Date(paidUntil).getTime() > now : false;
  const inTrial = trialUntil ? new Date(trialUntil).getTime() > now : false;
  const allowed = paid || inTrial;
  const result: SyncEntitlementResult = {
    allowed,
    denyReason: allowed ? null : "expired",
    trialUntil,
    paidUntil,
  };
  cache = { result, ts: now };
  return result;
}

/** 付费/退款后清缓存，让下一次同步立刻读到新权益 */
export function clearSyncEntitlementCache(): void {
  cache = null;
}
