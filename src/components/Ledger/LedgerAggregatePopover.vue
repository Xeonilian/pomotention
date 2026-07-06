<template>
  <n-button size="small" text :type="showModal ? 'info' : 'default'" title="收支统计" @click.stop="openPanel">
    <template #icon>
      <n-icon>
        <Wallet20Regular />
      </n-icon>
    </template>
  </n-button>

  <n-modal
    v-model:show="showModal"
    preset="card"
    class="ledger-aggregate-modal"
    :title="modalTitle"
    :style="modalStyle"
    :content-style="modalContentStyle"
    :segmented="{ content: true }"
    :mask-closable="true"
    @after-enter="onModalShown"
  >
    <div v-if="showModal" class="ledger-aggregate" :class="{ 'ledger-aggregate--desktop': !isMobile }">
      <section class="ledger-aggregate__stats">
        <div class="ledger-stat">
          <span class="ledger-stat__label">笔数</span>
          <span class="ledger-stat__value">{{ aggregateData.stats.entryCount }}</span>
        </div>
        <div class="ledger-stat ledger-stat--expense">
          <span class="ledger-stat__label">支出</span>
          <span class="ledger-stat__value">-{{ formatLedgerMoney(aggregateData.stats.totalExpense) }}</span>
        </div>
        <div class="ledger-stat ledger-stat--income">
          <span class="ledger-stat__label">收入</span>
          <span class="ledger-stat__value">+{{ formatLedgerMoney(aggregateData.stats.totalIncome) }}</span>
        </div>
        <div class="ledger-stat">
          <span class="ledger-stat__label">结余</span>
          <span class="ledger-stat__value" :class="netClass">{{ netText }}</span>
        </div>
      </section>

      <div class="ledger-aggregate__charts">
        <section class="ledger-aggregate__chart">
          <div class="ledger-aggregate__chart-title">支出分类</div>
          <LedgerMiniChart kind="pie" :pie-slices="aggregateData.pie.slices" :height="chartHeight" :fill="!isMobile" />
        </section>

        <section class="ledger-aggregate__chart">
          <div class="ledger-aggregate__chart-title">收支趋势</div>
          <LedgerMiniChart kind="trend" :trend-buckets="aggregateData.trend" :height="chartHeight" :fill="!isMobile" />
        </section>
      </div>

      <section class="ledger-aggregate__table-wrap">
        <div class="ledger-aggregate__table-head">
          <span class="ledger-aggregate__chart-title">明细</span>
          <n-button-group size="tiny">
            <n-button :type="tableSort === 'time' ? 'primary' : 'default'" @click="tableSort = 'time'">时序</n-button>
            <n-button :type="tableSort === 'tag' ? 'primary' : 'default'" @click="tableSort = 'tag'">标签</n-button>
          </n-button-group>
        </div>
        <div ref="tableScrollRef" class="ledger-aggregate__table-scroll" @scroll="onTableScroll">
          <table class="ledger-aggregate-table">
            <thead>
              <tr>
                <th>日期</th>
                <th>分类</th>
                <th>备注</th>
                <th class="ledger-aggregate-table__col-amount">金额</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="isTableEmpty">
                <td colspan="4" class="ledger-aggregate-table__guide">
                  <div class="ledger-guide">
                    <div>
                      <strong>① 在哪写</strong>
                      <span class="ledger-guide__body">在日视图 → 点 Todo 标题进入编辑</span>
                    </div>
                    <div>
                      <strong>② 怎么写</strong>
                      <ul class="ledger-guide__body">
                        <span>-金额 / +金额 开始一笔，￥ 或 $ 结束</span>
                        <br />
                        <span>支持#标签 作分类</span>
                        <br />
                        <span>同段可多笔，分隔符为 ;</span>
                        <br />
                        <span>结束编辑后入账</span>
                      </ul>
                    </div>
                    <div>
                      <strong>③ 示例</strong>
                      <span class="ledger-guide__body">+5000 奖金 #salary; -25 午饭 #lunch￥</span>
                    </div>
                    <div>
                      <strong>④ 保存后</strong>
                      <span class="ledger-guide__body">
                        标题旁出现
                        <n-icon size="14"><Wallet20Regular /></n-icon>
                        → 点开逐笔删除
                        <br />
                        再编辑标题可追加新笔
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
              <tr v-for="row in visibleRows" v-else :key="row.id">
                <td>{{ formatRowDate(row.recordedAt) }}</td>
                <td class="ledger-aggregate-table__tags">{{ row.categoryLabels.join(" ") || "—" }}</td>
                <td class="ledger-aggregate-table__memo">{{ row.memo || "—" }}</td>
                <td class="ledger-aggregate-table__col-amount" :class="row.direction === 'income' ? 'ledger-income' : 'ledger-expense'">
                  {{ row.direction === "income" ? "+" : "-" }}{{ formatLedgerMoneyFixed(row.amount) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NButton, NButtonGroup, NIcon, NModal } from "naive-ui";
import { Wallet20Regular } from "@vicons/fluent";
import { useDevice } from "@/composables/platform/useDevice";
import { useLedgerAggregatePanel } from "@/composables/ledger/useLedgerAggregatePanel";
import type { LedgerTableSort } from "@/services/ledger/ledgerQueryService";
import { formatLedgerMoneyFixed } from "@/services/ledger/ledgerQueryService";
import LedgerMiniChart from "@/components/Ledger/LedgerMiniChart.vue";

const { isMobile } = useDevice();
const showModal = ref(false);
const tableSort = ref<LedgerTableSort>("time");
const tableScrollRef = ref<HTMLElement>();
const visibleLimit = ref(40);

const { aggregateData, scaleLabel, formatLedgerMoney } = useLedgerAggregatePanel(computed(() => tableSort.value));

const chartHeight = computed(() => (isMobile.value ? 160 : 220));

const modalTitle = computed(() => `收支统计 · ${scaleLabel.value}视图`);

const modalStyle = computed(() => (isMobile.value ? { width: "100vw", maxWidth: "100vw", margin: "0" } : { width: "min(1100px, 98vw)" }));

const modalContentStyle = computed(() => (isMobile.value ? undefined : { maxHeight: "min(90vh, 840px)", overflow: "hidden" }));

const netText = computed(() => {
  const n = aggregateData.value.stats.net;
  const prefix = n > 0 ? "+" : n < 0 ? "-" : "";
  return `${prefix}${formatLedgerMoney(Math.abs(n))}`;
});

const netClass = computed(() => {
  const n = aggregateData.value.stats.net;
  if (n > 0) return "ledger-stat--income";
  if (n < 0) return "ledger-stat--expense";
  return "";
});

const isTableEmpty = computed(() => aggregateData.value.tableRows.length === 0);

const visibleRows = computed(() => aggregateData.value.tableRows.slice(0, visibleLimit.value));

const pageSize = computed(() => (isMobile.value ? 40 : 80));

function formatRowDate(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

function openPanel() {
  visibleLimit.value = pageSize.value;
  showModal.value = true;
}

function onModalShown() {
  window.dispatchEvent(new Event("resize"));
}

function onTableScroll() {
  const el = tableScrollRef.value;
  if (!el) return;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
    visibleLimit.value = Math.min(visibleLimit.value + pageSize.value, aggregateData.value.tableRows.length);
  }
}

watch(showModal, (open) => {
  if (!open) visibleLimit.value = pageSize.value;
});

watch(
  () => aggregateData.value.tableRows.length,
  (len) => {
    if (visibleLimit.value > len) {
      visibleLimit.value = Math.max(pageSize.value, len);
    }
  },
);
</script>

<style scoped>
.ledger-aggregate {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.ledger-aggregate__charts {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

.ledger-aggregate__chart {
  min-height: 0;
}

.ledger-aggregate__chart-title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--color-text-secondary);
  flex-shrink: 0;
}

.ledger-aggregate__stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  flex-shrink: 0;
}

.ledger-stat {
  padding: 6px 10px;
  border-radius: 8px;
  background: var(--n-color-modal, rgba(0, 0, 0, 0.02));
  border: 1px solid var(--n-border-color);
}

.ledger-stat__label {
  display: block;
  font-size: 11px;
  color: var(--color-text-secondary);
}

.ledger-stat__value {
  font-size: 15px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.ledger-stat--expense .ledger-stat__value {
  color: var(--color-red);
}

.ledger-stat--income .ledger-stat__value {
  color: var(--color-green);
}

.ledger-aggregate__table-wrap {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.ledger-aggregate__table-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
  flex-shrink: 0;
}

.ledger-aggregate__table-scroll {
  flex: 1;
  min-height: 200px;
  max-height: min(50vh, 360px);
  overflow: auto;
  border: 1px solid var(--n-border-color);
  border-radius: 8px;
}

.ledger-aggregate-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  table-layout: fixed;
}

.ledger-aggregate-table th,
.ledger-aggregate-table td {
  width: 25%;
  padding: 5px 8px;
  text-align: left;
  border-bottom: 1px solid var(--n-border-color);
  vertical-align: top;
}

.ledger-aggregate-table__col-amount {
  text-align: right !important;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.ledger-aggregate-table__memo,
.ledger-aggregate-table__tags {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ledger-aggregate-table__tags {
  color: var(--color-text-secondary);
  font-size: 11px;
}

.ledger-aggregate-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--n-color-modal);
  color: var(--color-text-secondary);
  font-weight: 500;
}

.ledger-income {
  color: var(--color-green);
}

.ledger-expense {
  color: var(--color-red);
}

.ledger-aggregate-table__guide {
  border-bottom: none;
  padding: 12px 14px;
  font-size: 12px;
  color: var(--color-text-primary);
  line-height: 1.55;
}

.ledger-guide > div + div {
  margin-top: 10px;
}

.ledger-guide__body {
  display: block;
  padding-left: 1em;
  margin-top: 2px;
}

ul.ledger-guide__body {
  margin: 0;
  padding-left: 1.2em;
}

/* 桌面：左两图顶天，右统计 + 明细 */
.ledger-aggregate--desktop {
  display: grid;
  grid-template-columns: minmax(360px, 45%) 1fr;
  grid-template-rows: auto minmax(0, 1fr);
  grid-template-areas:
    "charts stats"
    "charts table";
  gap: 10px 20px;
  min-height: min(76vh, 720px);
  max-height: min(86vh, 800px);
}

.ledger-aggregate--desktop .ledger-aggregate__stats {
  grid-area: stats;
  grid-template-columns: repeat(4, 1fr);
}

.ledger-aggregate--desktop .ledger-aggregate__charts {
  grid-area: charts;
  min-height: 0;
  height: 100%;
  gap: 8px;
}

.ledger-aggregate--desktop .ledger-aggregate__chart {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.ledger-aggregate--desktop .ledger-aggregate__table-wrap {
  grid-area: table;
  min-height: 0;
}

.ledger-aggregate--desktop .ledger-aggregate__table-scroll {
  max-height: none;
  min-height: 0;
}

.ledger-aggregate--desktop .ledger-aggregate-table__memo,
.ledger-aggregate--desktop .ledger-aggregate-table__tags {
  white-space: normal;
  word-break: break-word;
}
</style>

<!-- modal teleport 到 body：iPhone 顶栏安全区 + 关闭 × 无灰底 -->
<style>
@media (max-width: 768px) {
  .n-modal-body-wrapper .ledger-aggregate-modal {
    align-self: flex-start !important;
    margin-top: env(safe-area-inset-top, 0px) !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    max-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)) !important;
  }
}

.ledger-aggregate-modal .n-base-close::before {
  background-color: transparent !important;
}

.ledger-aggregate-modal .n-base-close:not(.n-base-close--disabled):hover::before {
  background-color: transparent !important;
}
</style>
