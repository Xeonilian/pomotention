/** 导出用：带本地偏移的 ISO + 人读日/时刻（不编造） */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** ISO-8601 with numeric offset, e.g. 2026-11-05T12:37:00+08:00 */
export function formatExportDateTime(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  const offMin = -d.getTimezoneOffset();
  const sign = offMin >= 0 ? "+" : "-";
  const abs = Math.abs(offMin);
  const oh = pad2(Math.floor(abs / 60));
  const om = pad2(abs % 60);
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}` +
    `${sign}${oh}:${om}`
  );
}

export function formatExportDay(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatExportClock(ms: number): string {
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

export function formatExportStartText(ms: number | null | undefined): string {
  if (ms == null || Number.isNaN(ms)) return "";
  const day = formatExportDay(ms);
  const clock = formatExportClock(ms);
  if (!day) return "";
  return clock ? `${day} ${clock}` : day;
}

export function resolveExportTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown";
  } catch {
    return "unknown";
  }
}

/** 人读时段：起止钟面；跨日带日 */
export function formatExportRangeText(
  startMs: number | null | undefined,
  endMs: number | null | undefined,
): string {
  const hasS = startMs != null && !Number.isNaN(startMs);
  const hasE = endMs != null && !Number.isNaN(endMs);
  if (!hasS && !hasE) return "";
  if (hasS && !hasE) return `${formatExportClock(startMs!)}–`;
  if (!hasS && hasE) return `–${formatExportClock(endMs!)}`;
  const sd = formatExportDay(startMs!);
  const ed = formatExportDay(endMs!);
  const sc = formatExportClock(startMs!);
  const ec = formatExportClock(endMs!);
  if (sd && ed && sd !== ed) return `${sd} ${sc}–${ed} ${ec}`;
  return `${sc}–${ec}`;
}
