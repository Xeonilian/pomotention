export const FLAKE_COUNT = 46;

/** 单击时偏移 hue */
export function nextFlakeHueSeed(current: number): number {
  return current + 1 + Math.floor(Math.random() * 3);
}

export function flakeHueShiftDeg(hueSeed: number): string {
  return `${hueSeed * 45}deg`;
}
