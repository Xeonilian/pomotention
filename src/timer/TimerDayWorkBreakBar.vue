<template>
  <n-tooltip trigger="hover" placement="top" raw>
    <template #trigger>
      <div class="timer-wb-bar" :class="{ 'timer-wb-bar--empty': !hasData }" role="img" :aria-label="ariaLabel">
        <template v-if="hasData">
          <span v-if="workMinutes > 0" class="timer-wb-bar__work" :style="{ flexGrow: workMinutes }" />
          <span v-if="breakMinutes > 0" class="timer-wb-bar__break" :style="{ flexGrow: breakMinutes }" />
        </template>
      </div>
    </template>
    <div class="timer-stats-tip-panel timer-wb-bar__tooltip">
      <span class="timer-wb-bar__tooltip-label">work</span>
      <span class="timer-wb-bar__tooltip-value">{{ workMinutes }} min</span>
      <span class="timer-wb-bar__tooltip-label">break</span>
      <span class="timer-wb-bar__tooltip-value">{{ breakMinutes }} min</span>
      <span class="timer-wb-bar__tooltip-label">W:B</span>
      <span class="timer-wb-bar__tooltip-value">{{ ratioLabel }}</span>
    </div>
  </n-tooltip>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NTooltip } from "naive-ui";

const props = defineProps<{
  workMinutes: number;
  breakMinutes: number;
}>();

const hasData = computed(() => props.workMinutes > 0 || props.breakMinutes > 0);

const ratioLabel = computed(() => formatWorkBreakRatio(props.workMinutes, props.breakMinutes));

const ariaLabel = computed(() => {
  if (!hasData.value) return "无工作/休息数据";
  return `工作 ${props.workMinutes} 分钟，休息 ${props.breakMinutes} 分钟，比例 ${ratioLabel.value}`;
});

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y !== 0) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

function formatWorkBreakRatio(workMinutes: number, breakMinutes: number): string {
  if (workMinutes <= 0 && breakMinutes <= 0) return "—";
  if (breakMinutes <= 0) return `${Math.round(workMinutes)}:0`;
  if (workMinutes <= 0) return `0:${Math.round(breakMinutes)}`;
  const g = gcd(workMinutes, breakMinutes);
  return `${Math.round(workMinutes / g)}:${Math.round(breakMinutes / g)}`;
}
</script>

<style scoped>
.timer-wb-bar {
  display: flex;
  width: 72px;
  height: 10px;
  border-radius: 1px;
  overflow: hidden;
  box-sizing: border-box;
  flex-shrink: 0;
}

.timer-wb-bar--empty {
  background: var(--color-background-light);
}

.timer-wb-bar__work {
  flex-shrink: 0;
  min-width: 0;
  background: var(--color-red-light);
}

.timer-wb-bar__break {
  flex-shrink: 0;
  min-width: 0;
  background: var(--color-blue-light);
}

.timer-wb-bar__tooltip {
  display: grid;
  grid-template-columns: 42px 1fr;
  column-gap: 8px;
  row-gap: 2px;
  font-family: ui-monospace, "Cascadia Code", "Consolas", monospace;
  font-size: 11px;
  line-height: 1.35;
  font-variant-numeric: tabular-nums;
}

.timer-wb-bar__tooltip-label {
  text-align: left;
}

.timer-wb-bar__tooltip-value {
  text-align: right;
  justify-self: end;
}
</style>
