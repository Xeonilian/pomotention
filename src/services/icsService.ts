// src/services/icsService.ts
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { Todo } from "@/core/types/Todo";
import type { Schedule } from "@/core/types/Schedule";
import { isTauri } from "@tauri-apps/api/core";

dayjs.extend(utc);

export type DataRow =
  | { type: "S"; item: Schedule } // Schedule
  | { type: "T"; item: Todo }; // Todo

export type ExportResult =
  | { ok: true; mode: "file"; path: string }
  | { ok: true; mode: "qr"; qrText: string }
  | {
      ok: false;
      reason: "not_found" | "empty" | "cancelled" | "error" | "not_tauri";
      detail?: string;
    };

// ---------- 工具 ----------
function formatIcsDate(ts: number | string | Date) {
  return dayjs(ts).utc().format("YYYYMMDDTHHmmss[Z]");
}

function escapeText(text?: string) {
  if (!text) return "";
  return String(text).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function foldLine(line: string) {
  const max = 75;
  const chunks: string[] = [];
  for (let i = 0; i < line.length; i += max) chunks.push(line.slice(i, i + max));
  return chunks.map((c, idx) => (idx === 0 ? c : ` ${c}`)).join("\r\n");
}

function makeIcsEvent(e: {
  UID: string;
  DTSTAMP: number;
  DTSTART: number;
  DTEND?: number;
  SUMMARY?: string;
  DESCRIPTION?: string;
  LOCATION?: string;
}) {
  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${e.UID}@pomotention`,
    `DTSTAMP:${formatIcsDate(e.DTSTAMP)}`,
    `DTSTART:${formatIcsDate(e.DTSTART)}`,
  ];
  const mergedDescription = e.DESCRIPTION && e.LOCATION ? `${e.DESCRIPTION}\n${e.LOCATION}` : e.DESCRIPTION ?? e.LOCATION ?? undefined;

  // 然后按合并后的描述输出

  // LOCATION 仍可保留，方便日历客户端识别可导航的地点字段
  if (e.DTEND) lines.push(`DTEND:${formatIcsDate(e.DTEND)}`);
  if (e.SUMMARY) lines.push(foldLine(`SUMMARY:${escapeText(e.SUMMARY)}`));
  if (mergedDescription) lines.push(foldLine(`DESCRIPTION:${escapeText(mergedDescription)}`));
  if (e.LOCATION) lines.push(foldLine(`LOCATION:${escapeText(e.LOCATION)}`));
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

function wrapCalendar(vevents: string[]) {
  const head = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Pomotention//Planner//CN", "CALSCALE:GREGORIAN"];
  return [...head, ...vevents, "END:VCALENDAR"].join("\r\n");
}

// ---------- 领域转换 ----------
export function scheduleToIcs(schedule: Schedule) {
  const start = schedule?.activityDueRange?.[0];
  const durMin = schedule?.activityDueRange?.[1] ?? 0;
  let end = null;
  if (start) {
    end = start + Number(durMin) * 60 * 1000;
  }

  return makeIcsEvent({
    UID: String(schedule?.id ?? `${Date.now()}@local`),
    DTSTAMP: Date.now(),
    DTSTART: start ?? Date.now(),
    DTEND: end ?? Date.now(),
    SUMMARY: schedule?.activityTitle,
    DESCRIPTION: schedule?.location,
  });
}

export function todoToIcs(todo: Todo) {
  const uid = String(todo?.id ?? `${Date.now()}@local`);
  const dtstamp = Date.now();

  const startMs = todo?.startTime;
  let endMs = todo?.doneTime;

  // 情况一：有开始时间 → 走普通事件
  if (startMs != null) {
    if (endMs == null) {
      const est = Array.isArray(todo?.estPomo)
        ? Math.max(
            1,
            todo.estPomo.reduce((a, b) => a + Number(b || 0), 0)
          )
        : Math.max(1, Number(todo?.estPomo || 0));
      endMs = startMs + est * 30 * 60 * 1000;
    }
    return makeIcsEvent({
      UID: uid,
      DTSTAMP: dtstamp,
      DTSTART: startMs,
      DTEND: endMs,
      SUMMARY: todo?.activityTitle,
      DESCRIPTION: `priority = ${todo?.priority}`,
    });
  }

  // 情况二：都没有时间 → 用 id 的日期生成全天事件
  // 约定 id 是 timestring/number；从 id 推出 UTC 日期 YYYYMMDD
  const idNum = Number(todo?.id);
  const baseTs = Number.isFinite(idNum) ? idNum : Date.now();
  const d = new Date(baseTs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  const dateOnly = `${y}${m}${day}`; // e.g. 20250109

  // 最小改动：直接在此处构造 VEVENT 文本（不新增函数）
  const lines: string[] = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(dtstamp)}`,
    // 全天事件用 VALUE=DATE，不带 Z 和时间
    `DTSTART;VALUE=DATE:${dateOnly}`,
    `DESCRIPTION:priority = ${todo?.priority}`,
  ];
  if (todo?.activityTitle) {
    lines.push(foldLine(`SUMMARY:${escapeText(String(todo.activityTitle))}`));
  }
  lines.push("END:VEVENT");
  return lines.join("\r\n");
}

export function buildCalendarFromRows(rows: DataRow[]): string {
  const vevents: string[] = [];
  for (const row of rows) {
    if (row.type === "S") vevents.push(scheduleToIcs(row.item));
    else if (row.type === "T") vevents.push(todoToIcs(row.item));
  }
  return wrapCalendar(vevents);
}

export function buildSingleCalendar(row: DataRow): string {
  const vevent = row.type === "S" ? scheduleToIcs(row.item) : todoToIcs(row.item);
  return wrapCalendar([vevent]);
}

export function icsToQR(icsText: string): string {
  // 如需压缩，可在此处做 pako.deflate + base64
  return icsText;
}

// ---------- 高层：一个入口，按是否选中分流 ----------
export async function handleExportOrQR(
  rows: DataRow[],
  selectedRowId: number | null | undefined,
  opts?: { filename?: string; idGetter?: (item: any) => string | number }
): Promise<ExportResult> {
  const idGetter = opts?.idGetter ?? ((item: any) => String(item?.id ?? item?._id ?? item?.uuid ?? ""));

  try {
    if (selectedRowId) {
      // 单条 -> 二维码
      const row = rows.find((r) => String(idGetter(r.item)) === String(selectedRowId));
      if (!row) return { ok: false, reason: "not_found", detail: "未找到所选条目" };
      const ics = buildSingleCalendar(row);
      return { ok: true, mode: "qr", qrText: icsToQR(ics) };
    } else {
      // 批量 -> 文件
      if (!isTauri()) return { ok: false, reason: "not_tauri", detail: "先选择一条数据" };
      if (!rows?.length) return { ok: false, reason: "empty", detail: "当前无可导出的数据" };
      const icsText = buildCalendarFromRows(rows);
      const defaultName = opts?.filename ?? `${dayjs().format("YYYYMMDD-HHmmss")}.ics`;
      const path = await save({
        filters: [{ name: "iCalendar", extensions: ["ics"] }],
        defaultPath: defaultName,
      });
      if (!path) return { ok: false, reason: "cancelled" };
      await writeTextFile(path, icsText);
      return { ok: true, mode: "file", path };
    }
  } catch (e: any) {
    return { ok: false, reason: "error", detail: e?.message ?? String(e) };
  }
}
