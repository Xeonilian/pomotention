/**
 * Pomotention AI Gateway — Cloudflare Worker
 * 真实 Moonshot key 只在此；模型写死 moonshot-v1-8k。
 */
import { jwtVerify } from "jose";
import {
  DEFAULT_FREE_MONTHLY_QUOTA,
  DEFAULT_PREMIUM_MONTHLY_QUOTA,
  monthlyQuotaLimit,
  parsePositiveInt,
  quotaExhaustedCode,
} from "./quota";

const HARDCODED_MODEL = "moonshot-v1-8k";
const RATE_LIMIT_PER_MINUTE = 20;
const CANDIDATES_MAX_CHARS = 8000;

export interface Env {
  AI_KV: KVNamespace;
  MOONSHOT_API_KEY: string;
  SUPABASE_JWT_SECRET: string;
  ADMIN_TOKEN: string;
  MOONSHOT_BASE_URL?: string;
  FREE_MONTHLY_QUOTA?: string;
  PREMIUM_MONTHLY_QUOTA?: string;
  /** 问 Supabase 登录是否有效；与前端同一项目 */
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
}

type JsonRecord = Record<string, unknown>;

function json(data: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...corsHeaders(),
      ...extraHeaders,
    },
  });
}

function corsHeaders(): HeadersInit {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Authorization, Content-Type",
  };
}

function err(status: number, code: string, message: string, extra?: JsonRecord): Response {
  return json({ code, message, ...extra }, status);
}

function monthKey(d = new Date()): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function minuteKey(d = new Date()): string {
  return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:MM
}

interface AuthUser {
  userId: string;
  email?: string;
}

/** 先问 Supabase 这张登录条是否有效；配不齐再退回本地钥匙核对 */
async function authenticateUser(req: Request, env: Env): Promise<AuthUser | Response> {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return err(401, "UNAUTHORIZED", "Missing Bearer token");
  }
  const token = header.slice("Bearer ".length).trim();
  if (!token) {
    return err(401, "UNAUTHORIZED", "Empty token");
  }

  const supabaseUrl = env.SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = env.SUPABASE_ANON_KEY?.trim();
  if (supabaseUrl && anonKey) {
    return await authenticateViaSupabase(token, supabaseUrl, anonKey);
  }

  return await authenticateViaJwtSecret(token, env);
}

async function authenticateViaSupabase(token: string, supabaseUrl: string, anonKey: string): Promise<AuthUser | Response> {
  let res: Response;
  try {
    res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
    });
  } catch {
    return err(401, "UNAUTHORIZED", "Auth check unreachable");
  }

  if (!res.ok) {
    return err(401, "UNAUTHORIZED", "Invalid or expired JWT");
  }

  let user: JsonRecord;
  try {
    user = (await res.json()) as JsonRecord;
  } catch {
    return err(401, "UNAUTHORIZED", "Invalid auth response");
  }

  const userId = typeof user.id === "string" ? user.id : "";
  if (!userId) {
    return err(401, "UNAUTHORIZED", "JWT missing sub");
  }
  if (user.is_anonymous === true) {
    return err(401, "UNVERIFIED", "Anonymous accounts have no AI quota");
  }
  const email = typeof user.email === "string" ? user.email : undefined;
  if ("email_confirmed_at" in user && !user.email_confirmed_at && email) {
    return err(401, "UNVERIFIED", "Email not confirmed");
  }
  return { userId, email };
}

async function authenticateViaJwtSecret(token: string, env: Env): Promise<AuthUser | Response> {
  if (!env.SUPABASE_JWT_SECRET) {
    return err(500, "MISCONFIGURED", "SUPABASE_JWT_SECRET not set");
  }

  try {
    const secret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    const userId = typeof payload.sub === "string" ? payload.sub : "";
    if (!userId) {
      return err(401, "UNAUTHORIZED", "JWT missing sub");
    }

    const role = payload.role;
    if (role !== "authenticated") {
      return err(401, "UNAUTHORIZED", "JWT role is not authenticated");
    }

    const isAnonymous =
      payload.is_anonymous === true ||
      (payload.app_metadata &&
        typeof payload.app_metadata === "object" &&
        (payload.app_metadata as JsonRecord).provider === "anonymous");
    if (isAnonymous) {
      return err(401, "UNVERIFIED", "Anonymous accounts have no AI quota");
    }

    const email = typeof payload.email === "string" ? payload.email : undefined;
    if ("email_confirmed_at" in payload && !payload.email_confirmed_at && email) {
      return err(401, "UNVERIFIED", "Email not confirmed");
    }

    return { userId, email };
  } catch {
    return err(401, "UNAUTHORIZED", "Invalid or expired JWT");
  }
}

interface Entitlement {
  plan: "free" | "premium";
  until?: string;
}

async function getEntitlement(env: Env, userId: string): Promise<Entitlement> {
  const raw = await env.AI_KV.get(`entitlement:${userId}`);
  if (!raw) return { plan: "free" };
  try {
    const parsed = JSON.parse(raw) as Entitlement;
    if (parsed.plan === "premium" && parsed.until) {
      if (new Date(parsed.until).getTime() > Date.now()) {
        return parsed;
      }
      return { plan: "free" };
    }
    return parsed.plan === "premium" ? parsed : { plan: "free" };
  } catch {
    return { plan: "free" };
  }
}

function freeQuota(env: Env): number {
  return parsePositiveInt(env.FREE_MONTHLY_QUOTA, DEFAULT_FREE_MONTHLY_QUOTA);
}

function premiumQuota(env: Env): number {
  return parsePositiveInt(env.PREMIUM_MONTHLY_QUOTA, DEFAULT_PREMIUM_MONTHLY_QUOTA);
}

/** 限流 + 月配额；premium 用高上限，仍计数。失败返回 Response */
async function assertAllowed(env: Env, userId: string): Promise<Response | null> {
  const rateKey = `rate:${userId}:${minuteKey()}`;
  const rateRaw = await env.AI_KV.get(rateKey);
  const rateCount = rateRaw ? Number(rateRaw) || 0 : 0;
  if (rateCount >= RATE_LIMIT_PER_MINUTE) {
    return err(429, "RATE_LIMITED", "Too many requests, try again later");
  }
  await env.AI_KV.put(rateKey, String(rateCount + 1), { expirationTtl: 120 });

  const ent = await getEntitlement(env, userId);
  const isPremium = ent.plan === "premium";
  const limit = monthlyQuotaLimit(isPremium, freeQuota(env), premiumQuota(env));

  const qKey = `quota:${userId}:${monthKey()}`;
  const qRaw = await env.AI_KV.get(qKey);
  const used = qRaw ? Number(qRaw) || 0 : 0;
  if (used >= limit) {
    const code = quotaExhaustedCode(isPremium);
    const message = isPremium ? "Premium monthly quota exhausted" : "Free monthly quota exhausted";
    return err(402, code, message, { used, limit });
  }
  return null;
}

async function bumpQuota(env: Env, userId: string): Promise<void> {
  const qKey = `quota:${userId}:${monthKey()}`;
  const qRaw = await env.AI_KV.get(qKey);
  const used = qRaw ? Number(qRaw) || 0 : 0;
  // TTL ~35 天；允许 ±1 误差（KV 最终一致）
  await env.AI_KV.put(qKey, String(used + 1), { expirationTtl: 35 * 24 * 60 * 60 });
}

async function callMoonshot(env: Env, body: JsonRecord): Promise<Response> {
  if (!env.MOONSHOT_API_KEY) {
    return err(500, "MISCONFIGURED", "MOONSHOT_API_KEY not set");
  }
  const base = (env.MOONSHOT_BASE_URL || "https://api.moonshot.cn/v1").replace(/\/$/, "");
  // 写死模型，忽略客户端 model
  const payload = { ...body, model: HARDCODED_MODEL, stream: false };

  const upstream = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.MOONSHOT_API_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") || "application/json",
      ...corsHeaders(),
    },
  });
}

async function handleChatCompletions(req: Request, env: Env): Promise<Response> {
  const auth = await authenticateUser(req, env);
  if (auth instanceof Response) return auth;

  const denied = await assertAllowed(env, auth.userId);
  if (denied) return denied;

  let body: JsonRecord;
  try {
    body = (await req.json()) as JsonRecord;
  } catch {
    return err(400, "BAD_REQUEST", "Invalid JSON body");
  }

  if (!Array.isArray(body.messages)) {
    return err(400, "BAD_REQUEST", "messages array required");
  }

  const upstream = await callMoonshot(env, body);
  if (upstream.ok) {
    await bumpQuota(env, auth.userId);
  }
  return upstream;
}

/** 本关：组装 messages 后走同一 Moonshot 调用；正式 AiMapper prompt 留给 capture 关 */
async function handleCaptureMap(req: Request, env: Env): Promise<Response> {
  const auth = await authenticateUser(req, env);
  if (auth instanceof Response) return auth;

  const denied = await assertAllowed(env, auth.userId);
  if (denied) return denied;

  let body: JsonRecord;
  try {
    body = (await req.json()) as JsonRecord;
  } catch {
    return err(400, "BAD_REQUEST", "Invalid JSON body");
  }

  const rawText = typeof body.rawText === "string" ? body.rawText.trim() : "";
  if (!rawText) {
    return err(400, "BAD_REQUEST", "rawText required");
  }

  let candidates = typeof body.candidates === "string" ? body.candidates : JSON.stringify(body.candidates ?? "");
  if (candidates.length > CANDIDATES_MAX_CHARS) {
    candidates = candidates.slice(0, CANDIDATES_MAX_CHARS);
  }

  const kindsHint = typeof body.kindsHint === "string" ? body.kindsHint : "ledger and other allowed kinds per app";

  const messages = [
    {
      role: "system",
      content:
        "You map one Chinese natural-language sentence into JSON intents for a productivity app. " +
        "Output ONLY valid JSON array of {op,kind,target,fields,confidence}. " +
        "confidence is high|low. Do not invent unknown kinds. " +
        `Allowed kinds hint: ${kindsHint}`,
    },
    {
      role: "user",
      content: `Sentence:\n${rawText}\n\nCandidates (may be empty):\n${candidates || "(none)"}`,
    },
  ];

  const upstream = await callMoonshot(env, {
    messages,
    temperature: 0.2,
  });
  if (upstream.ok) {
    await bumpQuota(env, auth.userId);
  }
  return upstream;
}

async function handleAdminEntitlement(req: Request, env: Env): Promise<Response> {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return err(401, "UNAUTHORIZED", "Invalid admin token");
  }

  let body: JsonRecord;
  try {
    body = (await req.json()) as JsonRecord;
  } catch {
    return err(400, "BAD_REQUEST", "Invalid JSON body");
  }

  const userId = typeof body.user_id === "string" ? body.user_id : "";
  const plan = body.plan === "premium" || body.plan === "free" ? body.plan : null;
  const until = typeof body.until === "string" ? body.until : undefined;
  if (!userId || !plan) {
    return err(400, "BAD_REQUEST", "user_id and plan (free|premium) required");
  }
  if (plan === "premium" && until && Number.isNaN(Date.parse(until))) {
    return err(400, "BAD_REQUEST", "until must be ISO8601");
  }

  const record: Entitlement = plan === "premium" ? { plan, until } : { plan: "free" };
  await env.AI_KV.put(`entitlement:${userId}`, JSON.stringify(record));
  return json({ ok: true, user_id: userId, entitlement: record });
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/\/$/, "") || "/";

    try {
      if (req.method === "GET" && (path === "/health" || path === "/")) {
        return json({ ok: true, model: HARDCODED_MODEL });
      }
      if (req.method === "POST" && path === "/v1/chat/completions") {
        return await handleChatCompletions(req, env);
      }
      if (req.method === "POST" && path === "/capture/map") {
        return await handleCaptureMap(req, env);
      }
      if (req.method === "POST" && path === "/admin/entitlement") {
        return await handleAdminEntitlement(req, env);
      }
      return err(404, "NOT_FOUND", `No route ${req.method} ${path}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unknown error";
      return err(500, "INTERNAL", message);
    }
  },
};
