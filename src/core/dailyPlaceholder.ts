// 系统日桶占位标题：daily_<kind>_<当日零点>，便于裸数据辨认；Search 等 UI 应隐藏
/** 形如 daily_eat_1735660800000 */
export function dailyPlaceholderTitle(kind: string, dayStartTs: number): string {
  return `daily_${kind}_${dayStartTs}`;
}

/** 是否系统日桶占位标题（含旧格式兼容见各域 isXxx） */
export function isDailyPlaceholderTitle(title?: string | null): boolean {
  if (!title) return false;
  return /^daily_[a-z]+_\d+$/i.test(title);
}
