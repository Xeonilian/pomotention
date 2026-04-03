<template>
  <div class="help-view">
    <iframe class="help-frame" :src="docsIframeSrc" title="帮助文档" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { getDocsIframeSrc } from "@/composables/useDocsUrl";

const docsIframeSrc = computed(() => getDocsIframeSrc());
</script>

<style scoped>
.help-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  min-height: 0;
}

.help-frame {
  flex: 1;
  width: 100%;
  min-height: 0;
  border: none;
  background: var(--color-background);
}
</style>
