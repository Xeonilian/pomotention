/**
 * 规范化时间输入，支持多种格式并返回 HH:mm。
 * 空串 → ""；无法识别 → null。
 */
export function normalizeTimeInput(raw: string): string | "" | null {
  const value = raw.trim();
  if (!value) return "";

  // 带冒号形式，如 7:3 / 07:11
  const colonMatch = value.match(/^(\d{1,2}):(\d{1,2})$/);
  if (colonMatch) {
    const hours = parseInt(colonMatch[1], 10);
    const minutes = parseInt(colonMatch[2], 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) return null;
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  // 四位纯数字，如 0711 / 1234
  if (/^\d{4}$/.test(value)) {
    const hours = parseInt(value.slice(0, 2), 10);
    const minutes = parseInt(value.slice(2), 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) return null;
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  // 三位纯数字，前 1 位小时，后 2 位分钟，如 711 / 930 / 111
  if (/^\d{3}$/.test(value)) {
    const hours = parseInt(value.slice(0, 1), 10);
    const minutes = parseInt(value.slice(1), 10);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
    if (hours < 0 || hours > 24 || minutes < 0 || minutes >= 60) return null;
    const h = hours.toString().padStart(2, "0");
    const m = minutes.toString().padStart(2, "0");
    return `${h}:${m}`;
  }

  return null;
}
