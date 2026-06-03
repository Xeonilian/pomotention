export const RAINBOW_COUNT = 25;
export const RAINBOW_ANIMATION_TIME_S = 45;

export const RAINBOW_PURPLE = "rgb(232 121 249)";
export const RAINBOW_BLUE = "rgb(96 165 250)";
export const RAINBOW_GREEN = "rgb(94 234 212)";

const RAINBOW_BASE_COLORS = [RAINBOW_PURPLE, RAINBOW_BLUE, RAINBOW_GREEN] as const;

/** 六种颜色排列，对应 SCSS random(6) 分支 */
const RAINBOW_COLOR_PERMUTATIONS: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [0, 2, 1],
  [2, 0, 1],
  [2, 1, 0],
  [1, 2, 0],
  [1, 0, 2],
];

export interface RainbowStripSpec {
  colors: [string, string, string];
  durationS: number;
  delayS: number;
}

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function buildRainbowStrips(seed: number): RainbowStripSpec[] {
  const length = RAINBOW_COUNT;
  const animationTime = RAINBOW_ANIMATION_TIME_S;

  return Array.from({ length }, (_, index) => {
    const i = index + 1;
    const permIndex = Math.floor(seededUnit(seed + i * 7) * RAINBOW_COLOR_PERMUTATIONS.length);
    const perm = RAINBOW_COLOR_PERMUTATIONS[permIndex] ?? RAINBOW_COLOR_PERMUTATIONS[0]!;

    return {
      colors: [
        RAINBOW_BASE_COLORS[perm[0]]!,
        RAINBOW_BASE_COLORS[perm[1]]!,
        RAINBOW_BASE_COLORS[perm[2]]!,
      ],
      durationS: animationTime - (animationTime / length / 2) * i,
      delayS: (i / length) * animationTime,
    };
  });
}

export function nextRainbowSeed(current: number): number {
  return current + 1 + Math.floor(Math.random() * 3);
}

export function rainbowStripCssVars(strip: RainbowStripSpec): Record<string, string> {
  return {
    "--rainbow-c1": strip.colors[0],
    "--rainbow-c2": strip.colors[1],
    "--rainbow-c3": strip.colors[2],
    "--rainbow-duration": `${strip.durationS}s`,
    "--rainbow-delay": `${strip.delayS}s`,
  };
}
