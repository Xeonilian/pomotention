<template>
  <template v-if="useCenteredPanel">
    <n-icon :size="12" class="ledger-entry-suffix ledger-entry-suffix--mobile" :title="triggerTitle" @click.stop="openPanel">
      <Wallet20Regular />
    </n-icon>
    <n-modal
      v-model:show="showPanel"
      preset="card"
      class="ledger-entry-modal"
      :title="`收支 ${entries.length} 笔`"
      :style="{ width: 'fit-content', maxWidth: 'min(340px, 92vw)' }"
      :mask-closable="true"
      @click.stop
    >
      <LedgerEntryPanel :entries="entries" hide-title @delete="onDelete" />
    </n-modal>
  </template>

  <n-popover
    v-else
    trigger="click"
    placement="bottom-end"
    to="body"
    :scrollable="true"
    :flip="true"
    :shift="true"
    class="ledger-entry-popover"
    :z-index="10001"
    @click.stop
  >
    <template #trigger>
      <n-button text class="ledger-entry-suffix" :title="triggerTitle" @click.stop>
        <template #icon>
          <n-icon :size="16">
            <Wallet20Regular />
          </n-icon>
        </template>
      </n-button>
    </template>
    <LedgerEntryPanel :entries="entries" @delete="onDelete" />
  </n-popover>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { NButton, NIcon, NModal, NPopover } from "naive-ui";
import { Wallet20Regular } from "@vicons/fluent";
import { useDevice } from "@/composables/platform/useDevice";
import type { LedgerEntry } from "@/core/types/LedgerEntry";
import LedgerEntryPanel from "@/components/Ledger/LedgerEntryPanel.vue";

const props = defineProps<{
  entries: LedgerEntry[];
}>();

const emit = defineEmits<{
  delete: [entryId: number];
}>();

const { isMobile, width } = useDevice();
const showPanel = ref(false);

/** 手机真机 + 窄屏预览：居中 modal，避免表格滚动区内 popover 偏移 */
const useCenteredPanel = computed(() => isMobile.value || width.value < 768);

const triggerTitle = computed(() => `已录入 ${props.entries.length} 笔收支，点击查看`);

function openPanel() {
  showPanel.value = true;
}

function onDelete(entryId: number) {
  emit("delete", entryId);
}
</script>

<style scoped>
.ledger-entry-popover {
  flex-shrink: 0;
  display: inline-flex;
  vertical-align: middle;
  line-height: 0;
}

.ledger-entry-suffix {
  flex-shrink: 0;
  padding: 0 2px;
  margin-left: 2px;
  vertical-align: middle;
}

.ledger-entry-suffix--mobile {
  margin: 0;
  padding: 0;
  cursor: pointer;
}
</style>

<!-- modal teleport 到 body，关闭按钮样式需全局 -->
<style>
.ledger-entry-modal .n-base-close::before {
  background-color: transparent !important;
}

.ledger-entry-modal .n-base-close:not(.n-base-close--disabled):hover::before {
  background-color: transparent !important;
}
</style>
