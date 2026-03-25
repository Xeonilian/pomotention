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
  { priority: 98, emoji: "🌱" },
  { priority: 97, emoji: "🎨" },
  { priority: 96, emoji: "🚗" },
  { priority: 95, emoji: "🏡" },
  { priority: 94, emoji: "😸" },
] as const;

export const SPECIAL_PRIORITIES: number[] = PRIORITY_CATEGORIES.map((c) => c.priority);

/** 排序槽位是否在「排序」emoji 弹层中显示：默认顺序下前 8 个为 true */
export function getDefaultPriorityCategoryShowInRank(): Record<number, boolean> {
  const out: Record<number, boolean> = {};
  PRIORITY_CATEGORIES.forEach((c, i) => {
    out[c.priority] = i < 8;
  });
  return out;
}

const emojiByPriority: Record<number, string> = Object.fromEntries(PRIORITY_CATEGORIES.map((c) => [c.priority, c.emoji]));

/** 根据 priority 取 emoji，非特殊值返回空串 */
export function getEmojiForPriority(priority: number): string {
  return emojiByPriority[priority] ?? "";
}
