/**
 * 格式化时间戳为 HH:MM 格式
 * @param ts - 时间戳（毫秒）
 * @returns 格式化后的时间字符串
 */
export function formatTime(ts: number) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes()
        .toString()
        .padStart(2, '0')}`;
    }