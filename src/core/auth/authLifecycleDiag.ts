/**
 * 手机可读的登出/清库诊断：环状事件日志 + localStorage 业务键快照（无正文、无 token）
 */
const DIAG_STORAGE_KEY = "authLifecycleDiag";
const MAX_EVENTS = 30;

export type AuthLifecycleDiagEvent = {
  at: string;
  kind: string;
  detail?: string;
};

type DiagStore = {
  events: AuthLifecycleDiagEvent[];
};

function readStore(): DiagStore {
  if (typeof localStorage === "undefined") return { events: [] };
  try {
    const raw = localStorage.getItem(DIAG_STORAGE_KEY);
    if (!raw) return { events: [] };
    const parsed = JSON.parse(raw) as DiagStore;
    return { events: Array.isArray(parsed?.events) ? parsed.events : [] };
  } catch {
    return { events: [] };
  }
}

function writeStore(store: DiagStore): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(DIAG_STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

/** 记录一次会话生命周期事件（供设置→环境诊断展示） */
export function recordAuthLifecycleEvent(kind: string, detail?: string): void {
  const store = readStore();
  store.events.push({
    at: new Date().toISOString(),
    kind,
    ...(detail ? { detail: detail.slice(0, 200) } : {}),
  });
  if (store.events.length > MAX_EVENTS) {
    store.events = store.events.slice(-MAX_EVENTS);
  }
  writeStore(store);
}

export function formatAuthLifecycleEventLines(): string[] {
  const events = readStore().events;
  const lines = ["[auth_lifecycle_log]"];
  if (!events.length) {
    lines.push("  (empty — 尚无记录，或整站存储曾被清空)");
    return lines;
  }
  for (const e of events) {
    lines.push(`  ${e.at} | ${e.kind}${e.detail ? ` | ${e.detail}` : ""}`);
  }
  return lines;
}

function summarizeStorageValue(raw: string | null): string {
  if (raw == null) return "MISSING";
  if (raw === "") return "empty_string";
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return `array(len=${parsed.length}, bytes=${raw.length})`;
    if (parsed && typeof parsed === "object") {
      const keys = Object.keys(parsed as object).length;
      return `object(keys=${keys}, bytes=${raw.length})`;
    }
    return `json(bytes=${raw.length})`;
  } catch {
    return `raw(bytes=${raw.length})`;
  }
}

/** 业务键是否还在、大概多少条（不输出内容） */
export function formatLocalDataSnapshotLines(storageKeys: Record<string, string>): string[] {
  const lines = ["[local_data_snapshot]"];
  if (typeof localStorage === "undefined") {
    lines.push("  localStorage: unavailable");
    return lines;
  }

  let totalKeys = 0;
  let sbKeys = 0;
  for (const k of Object.keys(localStorage)) {
    totalKeys += 1;
    if (k.startsWith("sb-")) sbKeys += 1;
  }
  lines.push(`  localStorage_key_count: ${totalKeys} (sb-=${sbKeys})`);
  lines.push(`  diag_log_key: ${localStorage.getItem(DIAG_STORAGE_KEY) != null ? "present" : "MISSING"}`);

  for (const [name, key] of Object.entries(storageKeys)) {
    lines.push(`  ${name} (${key}): ${summarizeStorageValue(localStorage.getItem(key))}`);
  }
  return lines;
}
