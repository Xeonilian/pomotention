import type { TimerSessionRecord } from "@/core/types/TimerSession";

function csvEscape(value: string): string {
  const s = value.replace(/"/g, '""');
  return /[",\n\r]/.test(s) ? `"${s}"` : s;
}

function categoryToAction(category: TimerSessionRecord["category"]): string {
  if (category === "work_void") return "work_void";
  if (category === "work") return "work";
  return "break";
}

export function buildTimerSessionsCsv(rows: TimerSessionRecord[]): string {
  const lines = ["action,timestamp,title"];
  const sorted = [...rows].sort((a, b) => a.startedAt - b.startedAt);
  for (const row of sorted) {
    lines.push(
      [csvEscape(categoryToAction(row.category)), csvEscape(new Date(row.startedAt).toISOString()), csvEscape(row.stateMessage || "")].join(
        ",",
      ),
    );
  }
  return `${lines.join("\n")}\n`;
}

export function downloadTimerSessionsCsv(rows: TimerSessionRecord[], filename: string): void {
  const blob = new Blob([buildTimerSessionsCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
