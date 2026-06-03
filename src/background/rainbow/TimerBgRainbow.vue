<template>
  <div class="timer-bg-rainbow__stage" aria-hidden="true">
    <div
      v-for="(strip, index) in strips"
      :key="`${seed}-${index}`"
      class="timer-bg-rainbow__strip"
      :style="rainbowStripCssVars(strip)"
    />
    <div class="timer-bg-rainbow__h" />
    <div class="timer-bg-rainbow__v" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { buildRainbowStrips, rainbowStripCssVars } from "@/background/rainbow/config";

const props = defineProps<{
  seed: number;
}>();

const strips = computed(() => buildRainbowStrips(props.seed));
</script>
