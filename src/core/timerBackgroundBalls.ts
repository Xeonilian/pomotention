/** 彩球背景默认色板 */
export const TIMER_BALL_DEFAULT_COLORS = ["#3CC157", "#2AA7FF", "#1B1B1B", "#FCBC0F", "#F85F36"] as const;

export const TIMER_BALL_COUNT = 50;

export type TimerBallPalette = readonly string[];

export function pickRandomBallColor(palette: TimerBallPalette): string {
  return palette[Math.floor(Math.random() * palette.length)] ?? palette[0] ?? "#888888";
}

/** 点击空白处：生成一组新的随机 HSL 色板 */
export function randomizeBallPalette(paletteSize = 5): string[] {
  return Array.from({ length: paletteSize }, () => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 55 + Math.floor(Math.random() * 30);
    const lightness = 45 + Math.floor(Math.random() * 20);
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  });
}
