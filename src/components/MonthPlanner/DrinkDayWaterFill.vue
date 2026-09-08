<!--
  月格喝水水位 —— 轻快水彩：
  - 三浪交错织带（不要嵌套成「大套小」），一眼能分出三条上沿
  - 单罩极淡天蓝，叠满仍透、偏青蓝不发闷
  - 达标：同色三罩铺满
-->
<template>
  <div class="drink-water-fill" aria-hidden="true">
    <template v-if="met && clamped > 0">
      <div class="drink-water-fill__wash drink-water-fill__wash--a" />
      <div class="drink-water-fill__wash drink-water-fill__wash--b" />
      <div class="drink-water-fill__wash drink-water-fill__wash--c" />
    </template>
    <svg v-else-if="clamped > 0" class="drink-water-fill__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path class="drink-water-fill__body drink-water-fill__body--a" :d="bodyPath(0)" />
      <path class="drink-water-fill__body drink-water-fill__body--b" :d="bodyPath(1)" />
      <path class="drink-water-fill__body drink-water-fill__body--c" :d="bodyPath(2)" />
      <path class="drink-water-fill__crest drink-water-fill__crest--a" :d="crestPath(0)" fill="none" />
      <path class="drink-water-fill__crest drink-water-fill__crest--b" :d="crestPath(1)" fill="none" />
      <path class="drink-water-fill__crest drink-water-fill__crest--c" :d="crestPath(2)" fill="none" />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    ratio: number;
    met?: boolean;
  }>(),
  { met: false },
);

const clamped = computed(() => Math.min(1, Math.max(0, Number(props.ratio) || 0)));

const baseY = computed(() => {
  const r = clamped.value;
  if (r <= 0) return 100;
  return (1 - r) * 100;
});

function fract(n: number): number {
  return n - Math.floor(n);
}
function hash(n: number): number {
  return fract(Math.sin(n * 12.9898) * 43758.5453);
}

/**
 * 三浪相位拉开、振幅接近 → 上沿织带交错，
 * 单层色带露白，看起来才是三层而不是「大套小」。
 */
const BASE_LAYERS = [
  { phase: 0.3, ampScale: 1.1, yBias: 0 },
  { phase: 2.3, ampScale: 1.0, yBias: -0.8 },
  { phase: 5.2, ampScale: 0.9, yBias: 0.8 },
] as const;

const layers = computed(() => {
  const r = clamped.value;
  const seed = r * 19.17 + r * r * 7.3;
  // 振幅略大，织带缝隙才看得见
  const ampBase = 3.4 + (1 - r) * 1.4;
  return BASE_LAYERS.map((L, i) => {
    const h0 = hash(seed + i * 1.7);
    const h1 = hash(seed + i * 2.3 + 4);
    const h2 = hash(seed + i * 3.1 + 8);
    const h3 = hash(seed + i * 4.9 + 12);
    return {
      phase: L.phase + h0 * 0.9,
      ampScale: L.ampScale * (0.94 + h1 * 0.18),
      yBias: L.yBias + (h2 - 0.5) * 1.2,
      freq2: 2.2 + h3 * 1.4,
      ampBase,
    };
  });
});

function waveY(x: number, layer: number): number {
  const L = layers.value[layer]!;
  const a = L.ampBase * L.ampScale;
  const y =
    baseY.value +
    L.yBias +
    a * Math.sin((x / 100) * Math.PI * 2 + L.phase) +
    a * 0.38 * Math.sin((x / 100) * Math.PI * L.freq2 + L.phase * 1.3);
  return Math.min(100, Math.max(0, y));
}

function crestPath(layer: number): string {
  if (clamped.value <= 0) return "";
  const steps = 16;
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 100;
    const y = waveY(x, layer);
    d += i === 0 ? `M ${x.toFixed(2)} ${y.toFixed(2)}` : ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
  }
  return d;
}

function bodyPath(layer: number): string {
  if (clamped.value <= 0) return "";
  const crest = crestPath(layer);
  if (!crest) return "";
  return `${crest} L 100 100 L 0 100 Z`;
}
</script>

<style scoped>
.drink-water-fill {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.drink-water-fill__wash {
  position: absolute;
  inset: 0;
}

/*
  轻快天蓝：偏青、低 alpha。
  三层满叠约 0.20，仍透格底；避免灰闷中蓝。
*/
.drink-water-fill__wash--a,
.drink-water-fill__body--a {
  fill: rgba(160, 220, 250, 0.09);
  background: rgba(160, 220, 250, 0.09);
}

.drink-water-fill__wash--b,
.drink-water-fill__body--b {
  fill: rgba(110, 230, 255, 0.07);
  background: rgba(110, 230, 255, 0.07);
}

.drink-water-fill__wash--c,
.drink-water-fill__body--c {
  fill: rgba(190, 235, 255, 0.108);
  background: rgba(190, 235, 255, 0.055);
}

.drink-water-fill__svg {
  width: 100%;
  height: 100%;
  display: block;
}

.drink-water-fill__crest {
  vector-effect: non-scaling-stroke;
  stroke-linecap: round;
  stroke-linejoin: round;
}

/* 浪线也用天蓝水痕，不用深蓝描边 */
.drink-water-fill__crest--a {
  stroke: rgba(54, 161, 207, 0.52);
  stroke-width: 0.85px;
}

.drink-water-fill__crest--b {
  stroke: rgba(90, 210, 245, 0.34);
  stroke-width: 0.7px;
}

/* 最上层浪：偏灰蓝、不透明到看不见 */
.drink-water-fill__crest--c {
  stroke: rgba(120, 150, 170, 0.65);
  stroke-width: 0.55px;
}
</style>
