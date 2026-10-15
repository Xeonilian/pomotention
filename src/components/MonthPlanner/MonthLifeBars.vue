<!-- 月格四条竖 bar：喝水 / 吃饭 / 活动 / 睡觉；吃/活动/睡从底到顶按时间早→晚 -->
<template>
  <div v-if="hasData" class="mlb" aria-hidden="true">
    <div class="mlb__col">
      <div class="mlb__track mlb__track--drink">
        <div
          v-if="bars.drinkGoalRatio > 0"
          class="mlb__goal"
          :style="{ transform: `scaleY(${Math.max(0, bars.drinkGoalRatio)})` }"
        />
        <div
          v-for="(p, i) in bars.drinkParts"
          :key="i"
          class="mlb__fill mlb__fill--drink"
          :class="`mlb__fill--drink-${i % 4}`"
          :style="grow(p)"
        />
        <div v-if="drinkRest > 0" class="mlb__spacer" :style="grow(drinkRest)" />
      </div>
      <span class="mlb__cap">
        <span class="mlb__cap-text">{{ bars.drinkLitersLabel || "\u00a0" }}</span>
      </span>
    </div>
    <div class="mlb__col">
      <div class="mlb__track mlb__track--stack">
        <div
          v-for="(p, i) in bars.eatParts"
          :key="i"
          class="mlb__fill"
          :class="`mlb__fill--${p.course}`"
          :style="grow(p.ratio)"
        />
        <div v-if="eatRest > 0" class="mlb__spacer" :style="grow(eatRest)" />
      </div>
      <span class="mlb__cap">
        <span class="mlb__cap-text">{{ bars.eatSpanLabel || "\u00a0" }}</span>
      </span>
    </div>
    <div class="mlb__col">
      <div class="mlb__track mlb__track--stack">
        <div
          v-for="(p, i) in bars.activityParts"
          :key="i"
          class="mlb__fill mlb__fill--act"
          :class="`mlb__fill--act-${i % 4}`"
          :style="grow(p)"
        />
        <div v-if="actRest > 0" class="mlb__spacer" :style="grow(actRest)" />
      </div>
      <span class="mlb__cap">
        <span class="mlb__cap-text">{{ bars.activityMinutes > 0 ? `${bars.activityMinutes}'` : "\u00a0" }}</span>
      </span>
    </div>
    <div class="mlb__col">
      <div class="mlb__track mlb__track--stack">
        <div v-for="(p, i) in bars.sleepParts" :key="i" class="mlb__fill mlb__fill--sleep" :style="grow(p)" />
        <div v-if="sleepRest > 0" class="mlb__spacer" :style="grow(sleepRest)" />
      </div>
      <span class="mlb__cap">
        <span class="mlb__cap-text">{{ bars.sleepBedLabel || "\u00a0" }}</span>
      </span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { hasMonthLifeBarData, type MonthLifeBarView } from "@/services/lifeRecord/monthLifeBars";

const props = defineProps<{ bars: MonthLifeBarView }>();
const hasData = computed(() => hasMonthLifeBarData(props.bars));
const drinkRest = computed(() => restOf(props.bars.drinkParts));
const eatRest = computed(() => restOf(props.bars.eatParts.map((p) => p.ratio)));
const actRest = computed(() => restOf(props.bars.activityParts));
const sleepRest = computed(() => restOf(props.bars.sleepParts));

function restOf(parts: number[]): number {
  return Math.max(0, 1 - parts.reduce((s, p) => s + p, 0));
}

function grow(v: number) {
  return { flexGrow: Math.max(0, v), flexShrink: 0, flexBasis: "0%" };
}
</script>
<style scoped>
.mlb {
  display: flex;
  align-items: stretch;
  align-self: stretch;
  flex: 1 1 0%;
  gap: 3px;
  width: 100%;
  max-width: 130px;
  min-height: 0;
  margin-inline: auto;
  padding: 2px 4px 4px;
  box-sizing: border-box;
  overflow: visible;
}
.mlb__col {
  flex: 1 1 0%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.mlb__track {
  position: relative;
  flex: 1 1 0%;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column-reverse;
  background: transparent;
  border: none;
  border-radius: 2px;
  box-sizing: border-box;
  overflow: hidden;
}
.mlb__track--drink {
  overflow: visible;
}
.mlb__goal {
  position: absolute;
  inset: 0;
  z-index: 1;
  box-sizing: border-box;
  border: 1px solid rgba(90, 170, 230, 0.75);
  border: 1px solid oklch(0.7 0.14 250 / 0.75);
  border-radius: 2px;
  pointer-events: none;
  transform-origin: bottom center;
}
.mlb__spacer {
  width: 100%;
  min-height: 0;
  flex-basis: 0;
  flex-shrink: 0;
}
.mlb__fill {
  width: 100%;
  min-height: 0;
  flex-basis: 0;
  flex-shrink: 0;
}
.mlb__fill--drink {
  position: relative;
  z-index: 0;
  min-height: 2px;
}
.mlb__fill--drink-0 {
  background: rgba(64, 152, 252, 0.8);
  background: oklch(0.82 0.2 250 / 0.8);
}
.mlb__fill--drink-1 {
  background: rgba(100, 176, 252, 0.7);
  background: oklch(0.86 0.18 250 / 0.7);
}
.mlb__fill--drink-2 {
  background: rgba(140, 196, 252, 0.6);
  background: oklch(0.9 0.16 250 / 0.6);
}
.mlb__fill--drink-3 {
  background: rgba(176, 214, 252, 0.58);
  background: oklch(0.93 0.14 250 / 0.58);
}
.mlb__fill--sleep {
  background: rgba(160, 160, 160, 0.52);
  background: oklch(0.86 0 0 / 0.52);
}
.mlb__fill--meal,
.mlb__fill--dessert,
.mlb__fill--apple {
  min-height: 2px;
}
.mlb__fill--meal {
  background: rgba(214, 72, 100, 0.8);
  background: oklch(0.82 0.2 22 / 0.8);
}
.mlb__fill--apple {
  background: rgba(230, 110, 120, 0.66);
  background: oklch(0.86 0.19 22 / 0.66);
}
.mlb__fill--dessert {
  background: rgba(240, 160, 160, 0.62);
  background: oklch(0.92 0.16 22 / 0.62);
}
.mlb__fill--act {
  min-height: 2px;
}
.mlb__fill--act-0 {
  background: rgba(44, 169, 103, 0.8);
  background: oklch(0.82 0.2 155 / 0.8);
}
.mlb__fill--act-1 {
  background: rgba(80, 188, 130, 0.7);
  background: oklch(0.86 0.18 155 / 0.7);
}
.mlb__fill--act-2 {
  background: rgba(120, 208, 160, 0.6);
  background: oklch(0.9 0.16 155 / 0.6);
}
.mlb__fill--act-3 {
  background: rgba(160, 224, 190, 0.58);
  background: oklch(0.93 0.14 155 / 0.58);
}
.mlb__cap {
  flex-shrink: 0;
  width: 100%;
  margin-top: 2px;
  font-size: 9px;
  line-height: 1;
  text-align: center;
  color: var(--color-text-secondary);
  font-family: Consolas, "Courier New", Courier, monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: clip;
}
@media (max-width: 430px) {
  .mlb {
    gap: 2px;
    padding: 2px 4px 3px;
  }
  .mlb__cap {
    height: 25px;
    font-size: 8px;
    margin-top: 2px;
    overflow: visible;
    display: flex;
    justify-content: center;
    align-items: flex-start;
  }
  .mlb__cap-text {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
    transform-origin: center center;
    line-height: 1;
  }
}
</style>
