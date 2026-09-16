<!--
  周列喝水水位 —— 与月格分开：
  高列里浪要平、振幅小，只作淡水色进度，不抢水滴点标
-->
<template>
  <div class="week-drink-fill" aria-hidden="true">
    <template v-if="met && clamped > 0">
      <div class="week-drink-fill__wash week-drink-fill__wash--a" />
      <div class="week-drink-fill__wash week-drink-fill__wash--b" />
      <div class="week-drink-fill__wash week-drink-fill__wash--c" />
    </template>
    <svg v-else-if="clamped > 0" class="week-drink-fill__svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <path class="week-drink-fill__body week-drink-fill__body--a" :d="bodyPath(0)" />
      <path class="week-drink-fill__body week-drink-fill__body--b" :d="bodyPath(1)" />
      <path class="week-drink-fill__body week-drink-fill__body--c" :d="bodyPath(2)" />
      <path class="week-drink-fill__crest week-drink-fill__crest--a" :d="crestPath(0)" fill="none" />
      <path class="week-drink-fill__crest week-drink-fill__crest--b" :d="crestPath(1)" fill="none" />
      <path class="week-drink-fill__crest week-drink-fill__crest--c" :d="crestPath(2)" fill="none" />
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

/** 周列：相位略错、振幅压低 */
const BASE_LAYERS = [
  { phase: 0.4, ampScale: 1.0, yBias: 0 },
  { phase: 2.1, ampScale: 0.9, yBias: -0.35 },
  { phase: 4.0, ampScale: 0.8, yBias: 0.35 },
] as const;

const layers = computed(() => {
  const r = clamped.value;
  const seed = r * 11.3 + r * r * 5.1;
  const ampBase = 1.2 + (1 - r) * 0.45;
  return BASE_LAYERS.map((L, i) => {
    const h0 = hash(seed + i * 1.7);
    const h1 = hash(seed + i * 2.3 + 4);
    const h2 = hash(seed + i * 3.1 + 8);
    const h3 = hash(seed + i * 4.9 + 12);
    return {
      phase: L.phase + h0 * 0.55,
      ampScale: L.ampScale * (0.95 + h1 * 0.1),
      yBias: L.yBias + (h2 - 0.5) * 0.4,
      freq2: 1.8 + h3 * 0.9,
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
    a * 0.22 * Math.sin((x / 100) * Math.PI * L.freq2 + L.phase * 1.2);
  return Math.min(100, Math.max(0, y));
}

function crestPath(layer: number): string {
  if (clamped.value <= 0) return "";
  const steps = 20;
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
.week-drink-fill {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 0;
}

.week-drink-fill__wash {
  position: absolute;
  inset: 0;
}

.week-drink-fill__wash--a,
.week-drink-fill__body--a {
  fill: rgba(160, 220, 250, 0.08);
  background: rgba(160, 220, 250, 0.08);
}

.week-drink-fill__wash--b,
.week-drink-fill__body--b {
  fill: rgba(110, 230, 255, 0.06);
  background: rgba(110, 230, 255, 0.06);
}

.week-drink-fill__wash--c,
.week-drink-fill__body--c {
  fill: rgba(190, 235, 255, 0.05);
  background: rgba(190, 235, 255, 0.05);
}

.week-drink-fill__svg {
  width: 100%;
  height: 100%;
  display: block;
}

.week-drink-fill__crest {
  vector-effect: non-scaling-stroke;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.week-drink-fill__crest--a {
  stroke: rgba(54, 161, 207, 0.4);
  stroke-width: 0.7px;
}

.week-drink-fill__crest--b {
  stroke: rgba(90, 210, 245, 0.28);
  stroke-width: 0.55px;
}

.week-drink-fill__crest--c {
  stroke: rgba(120, 150, 170, 0.45);
  stroke-width: 0.45px;
}
</style>
