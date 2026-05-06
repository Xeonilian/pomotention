/**
 * 公共假期：仅从仓库静态资源读取 `public/holidays/{region}/{year}.json`（构建后为同源路径）。
 * 无对应文件则该年无数据；不在线请求任何外网 API。
 * 内存 + sessionStorage 仅缓存成功解析后的 JSON。
 */
import { getDateKey } from "@/core/utils";

/** 同源路径：`BASE_URL` + holidays/{region}/{year}.json */
function localHolidayJsonUrl(region: string, year: number): string {
  const base = import.meta.env.BASE_URL ?? "/";
  const prefix = base.endsWith("/") ? base.slice(0, -1) : base;
  return `${prefix}/holidays/${region}/${year}.json`;
}

export type HolidayKind = "public_holiday" | "transfer_workday" | "solar_term";

export interface HolidayDisplay {
  label: string;
  kind: HolidayKind;
}

/** 同日多条合并时：补班 > 法定/纪念日 > 节气 */
const KIND_PRIORITY: Record<HolidayKind, number> = {
  transfer_workday: 0,
  public_holiday: 1,
  solar_term: 2,
};

function mergeHolidayLabels(a: string, b: string): string {
  const parts = [...new Set([...a.split(" · "), ...b.split(" · ")])].filter(Boolean);
  return parts.join(" · ");
}

function mergeHolidayDisplay(prev: HolidayDisplay, next: HolidayDisplay): HolidayDisplay {
  const label = mergeHolidayLabels(prev.label, next.label);
  const kind =
    KIND_PRIORITY[prev.kind] <= KIND_PRIORITY[next.kind] ? prev.kind : next.kind;
  return { label, kind };
}

interface HolidayCalendarRow {
  date: string;
  name?: string;
  name_cn?: string;
  name_en?: string;
  type?: string;
}

interface HolidayCalendarPayload {
  year: number;
  region: string;
  dates: HolidayCalendarRow[];
}

const MEMORY = new Map<string, HolidayCalendarPayload>();
const SS_PREFIX = "pomo-ph-local-";

function sessionGetJson<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function sessionSetJson(key: string, value: unknown) {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 配额满或禁用存储时忽略 */
  }
}

/** 本地日历日零点时间戳，与 getDateKey 一致 */
export function dateKeyToStartTs(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map((x) => Number(x));
  if (!y || !m || !d) return NaN;
  const dt = new Date(y, m - 1, d);
  dt.setHours(0, 0, 0, 0);
  return dt.getTime();
}

function yearsTouchingRange(start: number, end: number): number[] {
  const yStart = new Date(start).getFullYear();
  const yEnd = new Date(end - 1).getFullYear();
  const out: number[] = [];
  for (let y = yStart; y <= yEnd; y++) out.push(y);
  return out;
}

async function fetchLocalHolidayYear(region: string, year: number): Promise<HolidayCalendarPayload | null> {
  const memKey = `${region}-${year}`;
  const cached = MEMORY.get(memKey);
  if (cached != null) return cached;

  const ssKey = `${SS_PREFIX}${memKey}`;
  const fromSs = sessionGetJson<HolidayCalendarPayload>(ssKey);
  if (fromSs?.dates?.length) {
    MEMORY.set(memKey, fromSs);
    return fromSs;
  }

  const url = localHolidayJsonUrl(region, year);
  try {
    const res = await fetch(url, { cache: "default" });
    if (!res.ok) return null;
    const data = (await res.json()) as HolidayCalendarPayload;
    if (!data?.dates?.length) return null;
    MEMORY.set(memKey, data);
    sessionSetJson(ssKey, data);
    return data;
  } catch {
    return null;
  }
}

function rowToKind(type: string | undefined): HolidayKind {
  if (type === "transfer_workday") return "transfer_workday";
  if (type === "solar_term") return "solar_term";
  return "public_holiday";
}

function rowToLabel(row: HolidayCalendarRow): string {
  return row.name_cn || row.name || row.name_en || "";
}

/**
 * 读取本地 JSON 并裁剪到 [start, end)；键为 YYYY-MM-DD（与 getDateKey 一致）
 */
export async function loadVisiblePublicHolidays(
  start: number,
  end: number,
  countryCode: string,
): Promise<Record<string, HolidayDisplay>> {
  const upper = countryCode.trim().toUpperCase() || "CN";
  const years = yearsTouchingRange(start, end);
  const out: Record<string, HolidayDisplay> = {};

  for (const year of years) {
    const payload = await fetchLocalHolidayYear(upper, year);
    if (!payload?.dates?.length) continue;
    for (const row of payload.dates) {
      if (row.type === "holiday") continue; /* JSON 存档用，界面不展示 */
      const ts = dateKeyToStartTs(row.date);
      if (Number.isNaN(ts) || ts < start || ts >= end) continue;
      const label = rowToLabel(row);
      if (!label) continue;
      const incoming: HolidayDisplay = { label, kind: rowToKind(row.type) };
      const prev = out[row.date];
      out[row.date] = prev ? mergeHolidayDisplay(prev, incoming) : incoming;
    }
  }
  return out;
}

export function lookupHoliday(map: Record<string, HolidayDisplay>, dayStartTs: number): HolidayDisplay | null {
  const key = getDateKey(dayStartTs);
  return map[key] ?? null;
}
