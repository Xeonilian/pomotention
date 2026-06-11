<template>
  <n-button text type="warning" class="star-filter-toggle star-btn" :title="resolvedTitle" @click.stop="emit('toggle')">
    <template #icon>
      <n-icon>
        <Star20Filled v-if="active" />
        <Star20Regular v-else />
      </n-icon>
    </template>
  </n-button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NButton, NIcon } from "naive-ui";
import { Star20Filled, Star20Regular } from "@vicons/fluent";

const props = withDefaults(
  defineProps<{
    active: boolean;
    /** 覆盖默认 tooltip */
    title?: string;
  }>(),
  {},
);

const emit = defineEmits<{
  toggle: [];
}>();

const resolvedTitle = computed(
  () => props.title ?? (props.active ? "仅看加星任务：开" : "仅看加星任务：关"),
);
</script>

<style scoped>
.star-filter-toggle {
  flex-shrink: 0;
  padding: 0 2px;
}
</style>
