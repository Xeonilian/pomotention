// core/utils/convertTimestampToISO.ts
/**
 * 将时间戳转换为 ISO 格式，保留毫秒
 * @param timestamp 时间戳 如 1732636800000
 * @returns ISO 格式，保留毫秒 不带时区 如 2025-11-26T10:00:00.000Z
 */
export function convertTimestampToISO(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * 将 ISO 格式转换为时间戳，保留毫秒
 * @param iso  ISO 格式 如 2025-11-26T10:00:00.000Z
 * @returns 时间戳，保留毫秒 如 1732636800000
 */
export function convertISOToTimestamp(iso: string): number {
  return new Date(iso).getTime();
}
