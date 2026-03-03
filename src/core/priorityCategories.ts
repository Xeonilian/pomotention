/**
 * 排序列特殊槽位：仅数字与 emoji 的配置，不包含 tag（tag 由用户在设置中绑定）
 */
export const PRIORITY_CATEGORIES = [
  { priority: 44, emoji: "🥗" },
  { priority: 55, emoji: "📚" },
  { priority: 66, emoji: "🙊" },
  { priority: 88, emoji: "💸" },
  { priority: 99, emoji: "🧸" },
  { priority: 77, emoji: "✨" },
  { priority: 33, emoji: "💤" },
  { priority: 22, emoji: "🔮" },
] as const;

export const SPECIAL_PRIORITIES: number[] = PRIORITY_CATEGORIES.map((c) => c.priority);

const emojiByPriority: Record<number, string> = Object.fromEntries(PRIORITY_CATEGORIES.map((c) => [c.priority, c.emoji]));

/** 根据 priority 取 emoji，非特殊值返回空串 */
export function getEmojiForPriority(priority: number): string {
  return emojiByPriority[priority] ?? "";
}
