export const STAR_COUNT = 50;
export const STAR_COUNT_MOBILE = 22;
export const TOMATO_COUNT = 6;
export const TOMATO_COUNT_MOBILE = 5;
export const STAR_DURATION_SCALE_MOBILE = 0.8;

export const STAR_DEFAULT_COLOR = "#ffffff";

export type TomatoDepth = "far" | "mid" | "near";

export interface StarItemSpec {
  kind: "star" | "tomato";
  tailLengthEm: number;
  topOffsetVh: number;
  fallDurationS: number;
  fallDelayS: number;
  tomatoDepth?: TomatoDepth;
  tomatoFontSizePx?: number;
  tomatoOpacity?: number;
}

export const STAR_COLOR_PRESETS = ["#ffffff", "#d4ecff", "#fff4cc", "#ffd6eb", "#c8f7ff", "#ffe8c8"] as const;

/** 番茄远景层次：越小越慢越淡 */
const TOMATO_DEPTH_PRESETS: Record<
  TomatoDepth,
  { fontSizePx: number; opacity: number; durationMin: number; durationMax: number }
> = {
  far: { fontSizePx: 18, opacity: 0.42, durationMin: 22, durationMax: 36 },
  mid: { fontSizePx: 26, opacity: 0.62, durationMin: 16, durationMax: 26 },
  near: { fontSizePx: 34, opacity: 0.88, durationMin: 12, durationMax: 20 },
};

const TOMATO_DEPTH_ORDER: TomatoDepth[] = ["far", "far", "mid", "mid", "near", "near"];

function tomatoDepthOrder(seed: number): TomatoDepth[] {
  const order = [...TOMATO_DEPTH_ORDER];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(seededUnit(seed + i * 19) * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

function seededUnit(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function randomRange(min: number, max: number, seed: number): number {
  return min + seededUnit(seed) * (max - min);
}

function pickTomatoIndices(count: number, tomatoCount: number, seed: number): number[] {
  const indices = Array.from({ length: count }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(seededUnit(seed + i * 31) * (i + 1));
    [indices[i], indices[j]] = [indices[j]!, indices[i]!];
  }
  return indices.slice(0, tomatoCount);
}

export interface BuildStarItemsOptions {
  starCount?: number;
  tomatoCount?: number;
  durationScale?: number;
}

function scaledDuration(seconds: number, scale: number): number {
  return Math.round(seconds * scale * 10) / 10;
}

export function buildStarItems(colorSeed: number, options?: BuildStarItemsOptions): StarItemSpec[] {
  const starCount = options?.starCount ?? STAR_COUNT;
  const tomatoCount = options?.tomatoCount ?? TOMATO_COUNT;
  const durationScale = options?.durationScale ?? 1;
  const tomatoIndices = pickTomatoIndices(starCount, tomatoCount, colorSeed + 1000);
  const tomatoIndexSet = new Set(tomatoIndices);
  const depthOrder = tomatoDepthOrder(colorSeed + 2000);
  let tomatoSlot = 0;

  return Array.from({ length: starCount }, (_, index) => {
    const base = colorSeed * 100 + index;
    const isTomato = tomatoIndexSet.has(index);

    if (!isTomato) {
      return {
        kind: "star" as const,
        tailLengthEm: randomRange(5, 7.5, base + 1),
        topOffsetVh: randomRange(0, 100, base + 2),
        fallDurationS: scaledDuration(randomRange(6, 12, base + 3), durationScale),
        fallDelayS: scaledDuration(randomRange(0, 10, base + 4), durationScale),
      };
    }

    const depth = depthOrder[tomatoSlot % depthOrder.length] ?? "mid";
    tomatoSlot += 1;
    const depthPreset = TOMATO_DEPTH_PRESETS[depth];

    return {
      kind: "tomato" as const,
      tailLengthEm: randomRange(4.5, 6.5, base + 1),
      topOffsetVh: randomRange(0, 100, base + 2),
      fallDurationS: scaledDuration(randomRange(depthPreset.durationMin, depthPreset.durationMax, base + 3), durationScale),
      fallDelayS: scaledDuration(randomRange(0, 14, base + 4), durationScale),
      tomatoDepth: depth,
      tomatoFontSizePx: depthPreset.fontSizePx,
      tomatoOpacity: depthPreset.opacity,
    };
  });
}

export function starColorFromSeed(seed: number): string {
  const index = Math.floor(seededUnit(seed + 500) * STAR_COLOR_PRESETS.length);
  return STAR_COLOR_PRESETS[index] ?? STAR_DEFAULT_COLOR;
}

export function nextStarColorSeed(current: number): number {
  return current + 1 + Math.floor(Math.random() * 3);
}

export function starItemCssVars(item: StarItemSpec): Record<string, string> {
  const vars: Record<string, string> = {
    "--star-tail-length": `${item.tailLengthEm}em`,
    "--top-offset": `${item.topOffsetVh}vh`,
    "--fall-duration": `${item.fallDurationS}s`,
    "--fall-delay": `${item.fallDelayS}s`,
  };

  if (item.kind === "tomato") {
    vars["--tomato-font-size"] = `${item.tomatoFontSizePx ?? 26}px`;
    vars["--tomato-opacity"] = String(item.tomatoOpacity ?? 0.62);
  }

  return vars;
}
