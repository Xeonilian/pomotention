<template>
  <n-button text :type="active ? 'info' : 'default'" class="ledger-filter-toggle" :title="resolvedTitle" @click.stop="emit('toggle')">
    <template #icon>
      <n-icon>
        <Gift20Filled v-if="active" />
        <Gift20Regular v-else />
      </n-icon>
    </template>
  </n-button>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NButton, NIcon } from "naive-ui";
import { Gift20Filled, Gift20Regular } from "@vicons/fluent";

const props = withDefaults(
  defineProps<{
    active: boolean;
    title?: string;
  }>(),
  {},
);

const emit = defineEmits<{
  toggle: [];
}>();

const resolvedTitle = computed(
  () => props.title ?? (props.active ? "仅看含收支：开" : "仅看含收支：关"),
);
</script>

<style scoped>
.ledger-filter-toggle {
  flex-shrink: 0;
  padding: 0 2px;
}
</style>
