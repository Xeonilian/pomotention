<template>
  <n-popover trigger="click" placement="bottom-end" :z-index="10001" @click.stop>
    <template #trigger>
      <n-button text class="ledger-entry-suffix" :title="triggerTitle" @click.stop>
        <template #icon>
          <n-icon size="16">
            <Gift20Regular />
          </n-icon>
        </template>
      </n-button>
    </template>
    <div class="ledger-entry-panel">
      <div class="ledger-entry-panel__title">收支 {{ entries.length }} 笔</div>
      <table class="ledger-entry-table">
        <thead>
          <tr>
            <th>方向</th>
            <th>金额</th>
            <th>备注</th>
            <th>分类</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="entry in entries" :key="entry.id">
            <td :class="entry.direction === 'income' ? 'ledger-income' : 'ledger-expense'">
              {{ entry.direction === "income" ? "收入" : "支出" }}
            </td>
            <td>{{ formatAmount(entry) }}</td>
            <td>{{ entry.memo || "—" }}</td>
            <td>{{ categoryNames(entry.categoryTagIds) }}</td>
            <td>
              <n-button text type="error" size="tiny" title="删除" @click.stop="emit('delete', entry.id)">删</n-button>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-if="summaryLine" class="ledger-entry-panel__summary">{{ summaryLine }}</div>
    </div>
  </n-popover>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NButton, NIcon, NPopover } from "naive-ui";
import { Gift20Regular } from "@vicons/fluent";
import type { LedgerEntry } from "@/core/types/LedgerEntry";
import { formatLedgerSummaryBracket } from "@/core/ledger/parseLedgerSegments";
import { useTagStore } from "@/stores/useTagStore";

const props = defineProps<{
  entries: LedgerEntry[];
}>();

const emit = defineEmits<{
  delete: [entryId: number];
}>();

const tagStore = useTagStore();

const triggerTitle = computed(() => `已录入 ${props.entries.length} 笔收支，点击查看`);

const summaryLine = computed(() => {
  const bracket = formatLedgerSummaryBracket(props.entries);
  return bracket ? `合计 ${bracket}` : "";
});

function formatAmount(entry: LedgerEntry): string {
  const sign = entry.direction === "income" ? "+" : "-";
  const cur = entry.currency && entry.currency !== "CNY" ? ` ${entry.currency}` : "";
  return `${sign}${entry.amount}${cur}`;
}

function categoryNames(tagIds?: number[]): string {
  if (!tagIds || tagIds.length === 0) return "—";
  return tagIds.map((id) => tagStore.getTag(id)?.name ?? `#${id}`).join(", ");
}
</script>

<style scoped>
.ledger-entry-suffix {
  flex-shrink: 0;
  padding: 0 2px;
  margin-left: 2px;
  vertical-align: middle;
}

.ledger-entry-panel__title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--color-text-secondary);
}

.ledger-entry-panel__summary {
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-secondary);
}

.ledger-entry-table {
  border-collapse: collapse;
  font-size: 12px;
  min-width: 260px;
}

.ledger-entry-table th,
.ledger-entry-table td {
  padding: 4px 8px;
  text-align: left;
  border-bottom: 1px solid var(--n-border-color);
  white-space: nowrap;
}

.ledger-entry-table th {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.ledger-income {
  color: var(--color-green-dark, #18a058);
}

.ledger-expense {
  color: var(--color-red-dark, #d03050);
}
</style>
