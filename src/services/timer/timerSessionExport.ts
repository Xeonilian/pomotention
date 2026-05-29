import { isTauri } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { TimerSessionRecord, TimerSessionRules } from "@/core/types/TimerSession";

export type TimerSessionExportResult =
  | { ok: true; path?: string }
  | { ok: false; reason: "cancelled" | "empty" | "error"; detail?: string };

function csvEscape(value: string): string {
  const s = value.replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
}

function csvRow(cells: string[]): string {
  return cells.map(csvEscape).join(",");
}

const CSV_HEADER = [
  "category",
  "started_at",
  "ended_at",
  "duration_sec",
  "planned_duration_min",
  "state_message",
  "tag_names",
  "end_reason",
] as const;

function sessionToCsvRow(session: TimerSessionRecord, tagNames: string): string {
  const durationSec = Math.max(0, Math.round(session.durationMs / 1000));
  return csvRow([
    session.category,
    new Date(session.startedAt).toISOString(),
    new Date(session.endedAt).toISOString(),
    String(durationSec),
    String(session.plannedDurationMin),
    session.stateMessage || "",
    tagNames,
    session.endReason,
  ]);
}

/** 生成 UTF-8 CSV 正文（不含 BOM） */
export function buildTimerSessionsCsv(
  rows: TimerSessionRecord[],
  _rules?: TimerSessionRules,
  resolveTagNames: (tagIds: number[]) => string = () => "",
): string {
  const sorted = [...rows].sort((a, b) => a.startedAt - b.startedAt);
  const lines = [
    CSV_HEADER.join(","),
    ...sorted.map((row) => sessionToCsvRow(row, resolveTagNames(row.tagIds ?? []))),
  ];
  return `${lines.join("\n")}\n`;
}

function downloadCsvBlob(csv: string, filename: string): void {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 导出当前周 session：Tauri 走保存对话框，Web 走浏览器下载 */
export async function exportTimerSessionsCsv(
  rows: TimerSessionRecord[],
  defaultFilename: string,
  rules: TimerSessionRules,
  resolveTagNames?: (tagIds: number[]) => string,
): Promise<TimerSessionExportResult> {
  if (!rows.length) {
    return { ok: false, reason: "empty", detail: "当前周无记录" };
  }

  const csv = buildTimerSessionsCsv(rows, rules, resolveTagNames);

  if (isTauri()) {
    try {
      const path = await save({
        filters: [{ name: "CSV", extensions: ["csv"] }],
        defaultPath: defaultFilename,
      });
      if (!path) return { ok: false, reason: "cancelled" };
      await writeTextFile(path, `\uFEFF${csv}`);
      return { ok: true, path };
    } catch (e: unknown) {
      const detail = e instanceof Error ? e.message : String(e);
      return { ok: false, reason: "error", detail };
    }
  }

  downloadCsvBlob(csv, defaultFilename);
  return { ok: true };
}
