<template>
  <div class="ledger-entry-panel">
    <div v-if="!hideTitle" class="ledger-entry-panel__title">收支 {{ entries.length }} 笔</div>
    <table class="ledger-entry-table">
      <colgroup>
        <col class="ledger-entry-table__col-action" />
        <col class="ledger-entry-table__col-tags" />
        <col class="ledger-entry-table__col-memo" />
        <col class="ledger-entry-table__col-amount" />
      </colgroup>
      <thead>
        <tr>
          <th class="ledger-entry-table__col-action" aria-hidden="true"></th>
          <th>分类</th>
          <th>备注</th>
          <th class="ledger-entry-table__col-amount">金额</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="entry in entries" :key="entry.id">
          <td class="ledger-entry-table__col-action">
            <button type="button" class="ledger-entry-table__delete" title="删除" @click.stop="emit('delete', entry.id)">
              <n-icon :size="14">
                <Delete24Regular />
              </n-icon>
            </button>
          </td>
          <td class="ledger-entry-table__tags">{{ categoryNames(entry.categoryTagIds) }}</td>
          <td class="ledger-entry-table__memo">{{ entry.memo || "—" }}</td>
          <td class="ledger-entry-table__col-amount" :class="entry.direction === 'income' ? 'ledger-income' : 'ledger-expense'">
            {{ formatAmount(entry) }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { NIcon } from "naive-ui";
import { Delete24Regular } from "@vicons/fluent";
import type { LedgerEntry } from "@/core/types/LedgerEntry";
import { formatLedgerMoneyFixed } from "@/services/ledger/ledgerQueryService";
import { useTagStore } from "@/stores/useTagStore";

defineProps<{
  entries: LedgerEntry[];
  /** modal 已有标题时隐藏面板内标题 */
  hideTitle?: boolean;
}>();

const emit = defineEmits<{
  delete: [entryId: number];
}>();

const tagStore = useTagStore();

function formatAmount(entry: LedgerEntry): string {
  const sign = entry.direction === "income" ? "+" : "-";
  const cur = entry.currency && entry.currency !== "CNY" ? ` ${entry.currency}` : "";
  return `${sign}${formatLedgerMoneyFixed(entry.amount)}${cur}`;
}

function categoryNames(tagIds?: number[]): string {
  if (!tagIds || tagIds.length === 0) return "—";
  return tagIds.map((id) => tagStore.getTag(id)?.name ?? `#${id}`).join(", ");
}
</script>

<style scoped>
.ledger-entry-panel__title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--color-text-secondary);
}

.ledger-entry-table {
  border-collapse: collapse;
  font-size: 12px;
  width: max-content;
  max-width: 100%;
  table-layout: fixed;
}

.ledger-entry-table__col-tags {
  width: 124px;
}

.ledger-entry-table__col-memo {
  width: 72px;
}

.ledger-entry-table th,
.ledger-entry-table td {
  padding: 4px 6px;
  text-align: left;
  border-bottom: 1px solid var(--n-border-color);
  vertical-align: middle;
}

.ledger-entry-table th {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.ledger-entry-table__memo,
.ledger-entry-table__tags {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ledger-entry-table th.ledger-entry-table__col-amount,
.ledger-entry-table td.ledger-entry-table__col-amount {
  width: 72px;
  padding-left: 4px;
  padding-right: 2px;
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ledger-entry-table__col-action {
  width: 18px;
  min-width: 18px;
  max-width: 18px;
  padding: 0 2px 0 0;
  text-align: center;
  overflow: visible;
}

.ledger-entry-table col.ledger-entry-table__col-action {
  width: 18px;
}

.ledger-entry-table__delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-red-dark, #d03050);
  cursor: pointer;
  line-height: 0;
  vertical-align: middle;
}

.ledger-entry-table__delete:hover {
  opacity: 0.85;
}

.ledger-income {
  color: var(--color-green-dark, #18a058);
}

.ledger-expense {
  color: var(--color-red-dark, #d03050);
}
</style>
