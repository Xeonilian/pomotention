/** 1–10 分奖赏值对应的情绪 emoji */
export const REWARD_SCORE_EMOJIS = ["😭", "😫", "😟", "😐", "🤔", "😀", "😄", "😁", "🤩", "🥳"] as const;

/** 1–10 分精力值：由阴郁天气渐转晴朗（低分→高分，10 分为彩虹） */
export const ENERGY_SCORE_EMOJIS = ["🌫️", "⛈️", "🌧️", "🌦️", "☁️", "🌥️", "⛅", "🌤️", "☀️", "🌈"] as const;

function clampScore(value: number): number {
  return Math.min(10, Math.max(1, Math.round(value)));
}

export function getRewardScoreEmoji(value: number): string {
  return REWARD_SCORE_EMOJIS[clampScore(value) - 1];
}

export function getEnergyScoreEmoji(value: number): string {
  return ENERGY_SCORE_EMOJIS[clampScore(value) - 1];
}

export function createScoreMarks(emojis: readonly string[]): Record<number, string> {
  return Object.fromEntries(emojis.map((emoji, index) => [index + 1, emoji]));
}
