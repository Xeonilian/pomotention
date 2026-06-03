<template>
  <div class="timer-bg-flake__stage" aria-hidden="true" :style="stageStyle">
    <div v-for="index in FLAKE_COUNT" :key="index" class="timer-bg-flake__item">
      <span />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { FLAKE_COUNT, flakeHueShiftDeg } from "@/background/flake/config";

const props = defineProps<{
  hueSeed: number;
}>();

const stageStyle = computed(() => ({
  "--hue-shift": flakeHueShiftDeg(props.hueSeed),
}));
</script>
