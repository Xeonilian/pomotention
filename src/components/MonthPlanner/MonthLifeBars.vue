<!-- 月格四条竖 bar：喝水 / 吃饭 / 活动 / 睡觉；吃从底到顶固定正餐→水果→甜食 -->
<template>
  <div v-if="hasData" class="mlb" aria-hidden="true">
    <div class="mlb__col">
      <div class="mlb__track">
        <div
          class="mlb__fill mlb__fill--drink"
          :class="{ 'mlb__fill--drink-met': bars.drinkMet }"
          :style="{ height: pct(bars.drinkRatio) }"
        />
      </div>
      <span class="mlb__cap">{{ bars.drinkCount > 0 ? `×${bars.drinkCount}` : "\u00a0" }}</span>
    </div>
    <div class="mlb__col">
      <div class="mlb__track mlb__track--eat">
        <div v-if="bars.eatMeal > 0" class="mlb__fill mlb__fill--meal" :style="{ height: pct(bars.eatMeal) }" />
        <div v-if="bars.eatApple > 0" class="mlb__fill mlb__fill--apple" :style="{ height: pct(bars.eatApple) }" />
        <div v-if="bars.eatDessert > 0" class="mlb__fill mlb__fill--dessert" :style="{ height: pct(bars.eatDessert) }" />
      </div>
      <span class="mlb__cap">{{ bars.eatCount > 0 ? `×${bars.eatCount}` : "\u00a0" }}</span>
    </div>
    <div class="mlb__col">
      <div class="mlb__track">
        <div
          v-for="(p, i) in bars.activityParts"
          :key="i"
          class="mlb__fill mlb__fill--act"
          :class="`mlb__fill--act-${i % 4}`"
          :style="{ height: pct(p) }"
        />
      </div>
      <span class="mlb__cap">{{ bars.activityMinutes > 0 ? `${bars.activityMinutes}'` : "\u00a0" }}</span>
    </div>
    <div class="mlb__col">
      <div class="mlb__track">
        <div v-for="(p, i) in bars.sleepParts" :key="i" class="mlb__fill mlb__fill--sleep" :style="{ height: pct(p) }" />
      </div>
      <span class="mlb__cap">{{ bars.sleepBedLabel || "\u00a0" }}</span>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { hasMonthLifeBarData, type MonthLifeBarView } from "@/services/lifeRecord/monthLifeBars";

const props = defineProps<{ bars: MonthLifeBarView }>();
const hasData = computed(() => hasMonthLifeBarData(props.bars));

function pct(v: number): string {
  const p = Math.min(100, Math.max(0, v * 100));
  return `${p.toFixed(2)}%`;
}
</script>
<style scoped>
.mlb {
  /* 同一 OKLCH 切片：高 L + 低不透明度，贴近应用 *-transparent */
  --mlb-l: 0.86;
  --mlb-c: 0.19;
  --mlb-a: 0.78;
  --mlb-drink-h: 250;
  --mlb-eat-h: 22;
  --mlb-act-h: 155;
  display: flex;
  align-items: stretch;
  align-self: center;
  flex: 1 1 0;
  gap: 3px;
  width: 100%;
  max-width: 130px;
  height: 100%;
  min-height: 0;
  margin-inline: auto;
  padding: 2px 4px 4px;
  box-sizing: border-box;
}
.mlb__col {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.mlb__track {
  flex: 1 1 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  background: transparent;
  border: none;
  border-radius: 2px;
  box-sizing: border-box;
  overflow: hidden;
}
.mlb__track--eat {
  flex-direction: column-reverse;
  justify-content: flex-start;
}
.mlb__fill {
  width: 100%;
  flex: 0 0 auto;
  min-height: 0;
}
.mlb__fill--drink {
  background: oklch(var(--mlb-l) var(--mlb-c) var(--mlb-drink-h) / var(--mlb-a));
}
.mlb__fill--drink-met {
  background: oklch(0.82 0.2 var(--mlb-drink-h) / 0.86);
}
.mlb__fill--sleep {
  background: oklch(0.86 0 0 / 0.52);
}
.mlb__fill--meal,
.mlb__fill--dessert,
.mlb__fill--apple {
  min-height: 2px;
}
.mlb__fill--meal {
  background: oklch(0.82 0.2 var(--mlb-eat-h) / 0.8);
}
.mlb__fill--apple {
  background: oklch(var(--mlb-l) var(--mlb-c) var(--mlb-eat-h) / 0.66);
}
.mlb__fill--dessert {
  background: oklch(0.92 0.16 var(--mlb-eat-h) / 0.62);
}
.mlb__fill--act {
  min-height: 2px;
}
.mlb__fill--act-0 {
  background: oklch(0.82 0.2 var(--mlb-act-h) / 0.8);
}
.mlb__fill--act-1 {
  background: oklch(0.86 0.18 var(--mlb-act-h) / 0.7);
}
.mlb__fill--act-2 {
  background: oklch(0.9 0.16 var(--mlb-act-h) / 0.6);
}
.mlb__fill--act-3 {
  background: oklch(0.93 0.14 var(--mlb-act-h) / 0.58);
}
.mlb__cap {
  flex-shrink: 0;
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
    padding: 1px 2px 2px;
  }
  .mlb__cap {
    font-size: 8px;
  }
}
</style>
