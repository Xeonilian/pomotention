<template>
  <div class="timer-bg-star__field" aria-hidden="true" :style="fieldStyle">
    <div
      v-for="(item, index) in items"
      :key="`${colorSeed}-${index}`"
      class="timer-bg-star__item"
      :class="[
        { 'timer-bg-star__item--tomato': item.kind === 'tomato' },
        item.kind === 'tomato' && item.tomatoDepth ? `timer-bg-star__item--tomato-${item.tomatoDepth}` : '',
      ]"
      :style="starItemCssVars(item)"
    >
      <template v-if="item.kind === 'tomato'">🍅</template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useDevice } from "@/composables/platform/useDevice";
import {
  STAR_COUNT,
  STAR_COUNT_MOBILE,
  TOMATO_COUNT,
  TOMATO_COUNT_MOBILE,
  STAR_DURATION_SCALE_MOBILE,
  buildStarItems,
  starColorFromSeed,
  starItemCssVars,
} from "@/background/star/config";

const props = defineProps<{
  colorSeed: number;
}>();

const { isMobile } = useDevice();

const items = computed(() =>
  buildStarItems(props.colorSeed, {
    starCount: isMobile.value ? STAR_COUNT_MOBILE : STAR_COUNT,
    tomatoCount: isMobile.value ? TOMATO_COUNT_MOBILE : TOMATO_COUNT,
    durationScale: isMobile.value ? STAR_DURATION_SCALE_MOBILE : 1,
  }),
);

const fieldStyle = computed(() => ({
  "--star-color": starColorFromSeed(props.colorSeed),
}));
</script>
