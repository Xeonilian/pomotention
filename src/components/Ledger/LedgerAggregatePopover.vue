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
          <LedgerMiniChart
            kind="trend"
            :trend-buckets="aggregateData.trend"
            :trend-day-clickable="trendDayClickable"
            :highlight-day-start="trendHighlightDayStart"
            :height="chartHeight"
            :fill="!isMobile"
            @trend-day-click="onTrendDayClick"
          />
        </section>
      </div>

      <section class="ledger-aggregate__table-wrap">
        <div class="ledger-aggregate__table-head">
          <span class="ledger-aggregate__chart-title">明细</span>
          <n-button size="tiny" text :type="showHelp ? 'primary' : 'default'" title="帮助" @click="showHelp = !showHelp">
            <template #icon>
              <n-icon><QuestionCircle20Regular /></n-icon>
            </template>
          </n-button>
        </div>
        <div ref="tableScrollRef" class="ledger-aggregate__table-scroll" @scroll="onTableScroll">
          <table class="ledger-aggregate-table">
            <colgroup>
              <col class="ledger-aggregate-table__col-action" />
              <col class="ledger-aggregate-table__col-date" />
              <col />
              <col />
              <col class="ledger-aggregate-table__col-amount" />
            </colgroup>
            <thead>
              <tr>
                <th class="ledger-aggregate-table__col-action" aria-hidden="true"></th>
                <th class="ledger-aggregate-table__col-date">
                  <button
                    type="button"
                    class="ledger-aggregate-table__sort-head"
                    :class="{ 'ledger-aggregate-table__sort-head--active': tableSort === 'time' }"
                    title="按时序排序"
                    @click="tableSort = 'time'"
                  >
                    日期
                    <n-icon :size="12"><ArrowSortDownLines24Regular /></n-icon>
                  </button>
                </th>
                <th class="ledger-aggregate-table__tags">
                  <button
                    type="button"
                    class="ledger-aggregate-table__sort-head"
                    :class="{ 'ledger-aggregate-table__sort-head--active': tableSort === 'tag' }"
                    title="按分类排序"
                    @click="tableSort = 'tag'"
                  >
                    分类
                    <n-icon :size="12"><TextSortAscending16Regular /></n-icon>
                  </button>
                </th>
                <th>备注</th>
                <th class="ledger-aggregate-table__col-amount">
                  <button
                    type="button"
                    class="ledger-aggregate-table__sort-head ledger-aggregate-table__sort-head--amount"
                    :class="{ 'ledger-aggregate-table__sort-head--active': tableSort === 'amount' }"
                    title="按金额从多到少"
                    @click="tableSort = 'amount'"
                  >
                    金额
                    <n-icon :size="12"><ArrowSortDown24Filled /></n-icon>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="showHelp">
                <td colspan="5" class="ledger-aggregate-table__guide">
                  <div class="ledger-guide">
                    <section class="ledger-guide__section">
                      <div class="ledger-guide__title">本表追加</div>
                      <p class="ledger-guide__body">最下行点 +，填金额后失焦或回车入账；点分类选标签，备注可选。</p>
                      <p class="ledger-guide__body">
                        追加行的日期跟 APP 当前选中日期一致；日 / 周视图可点「收支趋势」里的日期切换，或在 APP 里切换日期。
                      </p>
                    </section>
                    <section class="ledger-guide__section">
                      <div class="ledger-guide__title">Todo 标题</div>
                      <p class="ledger-guide__body">日视图编辑 Todo 标题，以 -金额 / +金额 开头，用 ￥ / $ / % 结束一笔。</p>
                      <p class="ledger-guide__body">可用 #标签 作分类；同段多笔用 ; /空格 分隔。结束编辑后入账。</p>
                      <p class="ledger-guide__example">+5000 奖金 #salary; -25 午饭 #lunch%</p>
                    </section>
                  </div>
                </td>
              </tr>
              <tr v-for="row in visibleRows" :key="row.id">
                <td class="ledger-aggregate-table__col-action">
                  <button type="button" class="ledger-aggregate-table__delete" title="删除" @click.stop="onDeleteRow(row)">
                    <n-icon :size="14">
                      <Delete24Regular />
                    </n-icon>
                  </button>
                </td>
                <td class="ledger-aggregate-table__col-date">{{ formatRowDate(row.recordedAt) }}</td>
                <td class="ledger-aggregate-table__tags">
                  <TagPickerPopover
                    :show="tagPickerShowByRow[row.id] ?? false"
                    @update:show="(open) => (tagPickerShowByRow[row.id] = open)"
                    v-model:search-term="tagSearchTerm"
                    input-mode="internal"
                    :rank-tags="rankLedgerTagsLimited"
                    placement="bottom-start"
                    :teleport-disabled="false"
                    internal-input-placeholder="筛选分类…"
                    @select-tag="(id) => onSelectCategory(row, id)"
                    @create-tag="(name) => onCreateCategory(row, name)"
                  >
                    <template #trigger>
                      <button type="button" class="ledger-aggregate-table__tag-btn" @click.stop="openTagPicker(row.id)">
                        {{ row.categoryLabels.join(" ") }}
                      </button>
                    </template>
                  </TagPickerPopover>
                </td>
                <td class="ledger-aggregate-table__memo">
                  <input
                    class="ledger-aggregate-table__input"
                    :value="row.memo ?? ''"
                    @change="onMemoChange(row, ($event.target as HTMLInputElement).value)"
                    @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
                  />
                </td>
                <td class="ledger-aggregate-table__col-amount" :class="row.direction === 'income' ? 'ledger-income' : 'ledger-expense'">
                  <input
                    class="ledger-aggregate-table__input ledger-aggregate-table__input--amount"
                    :value="formatAmountInput(row)"
                    placeholder="-0.00"
                    @change="onAmountChange(row, ($event.target as HTMLInputElement).value)"
                    @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
                  />
                </td>
              </tr>
              <tr class="ledger-aggregate-table__append-row">
                <td class="ledger-aggregate-table__col-action">
                  <button type="button" class="ledger-aggregate-table__add" title="追加" @click.stop="focusNewAmount">
                    <n-icon :size="14">
                      <Add20Filled />
                    </n-icon>
                  </button>
                </td>
                <td class="ledger-aggregate-table__col-date ledger-aggregate-table__append-date ledger-aggregate-table__date--app-day">
                  {{ appendDateLabel }}
                </td>
                <td class="ledger-aggregate-table__tags">
                  <TagPickerPopover
                    v-model:show="newRowTagPickerShow"
                    v-model:search-term="newRowTagSearch"
                    input-mode="internal"
                    :rank-tags="rankLedgerTagsLimited"
                    placement="bottom-start"
                    internal-input-placeholder="筛选分类…"
                    @select-tag="onNewRowSelectTag"
                    @create-tag="onNewRowCreateTag"
                  >
                    <template #trigger>
                      <button type="button" class="ledger-aggregate-table__tag-btn" @click.stop="newRowTagPickerShow = true">
                        {{ newRowCategoryLabel }}
                      </button>
                    </template>
                  </TagPickerPopover>
                </td>
                <td class="ledger-aggregate-table__memo">
                  <input v-model="newRowDraft.memo" class="ledger-aggregate-table__input" />
                </td>
                <td class="ledger-aggregate-table__col-amount">
                  <input
                    ref="newAmountInputRef"
                    v-model="newRowDraft.amount"
                    class="ledger-aggregate-table__input ledger-aggregate-table__input--amount"
                    placeholder="-0.00"
                    @change="commitNewRow"
                    @keydown.enter.prevent="commitNewRow"
                  />
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
import { computed, nextTick, reactive, ref, watch } from "vue";
import { NButton, NIcon, NModal } from "naive-ui";
import {
  Add20Filled,
  ArrowSortDown24Filled,
  ArrowSortDownLines24Regular,
  Delete24Regular,
  QuestionCircle20Regular,
  TextSortAscending16Regular,
  Wallet20Regular,
} from "@vicons/fluent";
import { useDevice } from "@/composables/platform/useDevice";
import { useLedgerAggregatePanel } from "@/composables/ledger/useLedgerAggregatePanel";
import { useLedgerAggregateEdit } from "@/composables/ledger/useLedgerAggregateEdit";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useTagStore } from "@/stores/useTagStore";
import { getDayStartTimestamp } from "@/core/utils";
import type { LedgerTableRow, LedgerTableSort } from "@/services/ledger/ledgerQueryService";
import { formatLedgerMoneyFixed } from "@/services/ledger/ledgerQueryService";
import type { LedgerDirection } from "@/core/types/LedgerEntry";
import LedgerMiniChart from "@/components/Ledger/LedgerMiniChart.vue";
import TagPickerPopover from "@/components/TagSystem/TagPickerPopover.vue";

const { isMobile } = useDevice();
const dataStore = useDataStore();
const settingStore = useSettingStore();
const tagStore = useTagStore();
const { rankLedgerTags, deleteEntry, patchEntry, appendStandalone, resolveTagId } = useLedgerAggregateEdit();

/** 账本分类浮层最多展示 5 个选项（创建项另算） */
function rankLedgerTagsLimited(tags: Parameters<typeof rankLedgerTags>[0]) {
  return rankLedgerTags(tags).slice(0, 5);
}

const showModal = ref(false);
const showHelp = ref(false);
const tableSort = ref<LedgerTableSort>("time");
const tableScrollRef = ref<HTMLElement>();
const visibleLimit = ref(40);
const tagPickerShowByRow = reactive<Record<number, boolean>>({});
const tagSearchTerm = ref("");
const newRowTagPickerShow = ref(false);
const newRowTagSearch = ref("");
const newRowCategoryIds = ref<number[]>([]);
const newAmountInputRef = ref<HTMLInputElement | null>(null);
const newRowDraft = ref({ memo: "", amount: "" });

const { aggregateData, scaleLabel, formatLedgerMoney, viewScale } = useLedgerAggregatePanel(computed(() => tableSort.value));

const trendDayClickable = computed(() => viewScale.value === "day" || viewScale.value === "week");

/** 日/周趋势轴高亮 APP 选中日；月及以上不传 */
const appSelectedDayStart = computed(() => getDayStartTimestamp(appDateTimestamp()));

const trendHighlightDayStart = computed(() =>
  viewScale.value === "day" || viewScale.value === "week" ? appSelectedDayStart.value : null,
);

const chartHeight = computed(() => (isMobile.value ? 160 : 220));

const modalTitle = computed(() => `收支统计 · ${scaleLabel.value}视图`);

const modalStyle = computed(() =>
  isMobile.value
    ? {
        width: "100vw",
        maxWidth: "100vw",
        margin: "0",
        height: "calc(100dvh - env(safe-area-inset-top, 0px))",
        maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px))",
        display: "flex",
        flexDirection: "column",
      }
    : { width: "min(1100px, 98vw)" },
);

const modalContentStyle = computed(() =>
  isMobile.value
    ? {
        flex: "1",
        minHeight: "0",
        overflow: "auto",
        overscrollBehavior: "contain",
        backgroundColor: "var(--n-color-modal)",
        paddingBottom: "12px",
      }
    : { maxHeight: "min(90vh, 840px)", overflow: "hidden" },
);

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

const visibleRows = computed(() => aggregateData.value.tableRows.slice(0, visibleLimit.value));

const appendDateLabel = computed(() => {
  const raw = dataStore.dateService?.appDateTimestamp;
  const ts =
    typeof raw === "number" ? raw : typeof raw === "object" && raw && "value" in raw ? (raw as { value: number }).value : Date.now();
  return formatRowDate(ts);
});

const newRowCategoryLabel = computed(() => {
  if (!newRowCategoryIds.value.length) return "";
  return newRowCategoryIds.value.map((id) => tagStore.getTag(id)?.name ?? `#${id}`).join(" ");
});

const pageSize = computed(() => (isMobile.value ? 40 : 80));

function formatRowDate(ts: number): string {
  const d = new Date(ts);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${mm}-${dd}`;
}

function formatAmountInput(row: LedgerTableRow): string {
  const sign = row.direction === "income" ? "+" : "-";
  return `${sign}${formatLedgerMoneyFixed(row.amount)}`;
}

function parseAmountInput(raw: string, fallbackDirection: LedgerDirection): { amount: number; direction: LedgerDirection } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("+")) {
    const amount = Number.parseFloat(trimmed.slice(1));
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return { amount, direction: "income" };
  }
  if (trimmed.startsWith("-")) {
    const amount = Number.parseFloat(trimmed.slice(1));
    if (!Number.isFinite(amount) || amount <= 0) return null;
    return { amount, direction: "expense" };
  }
  const amount = Number.parseFloat(trimmed);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { amount, direction: fallbackDirection };
}

function resetNewRowDraft() {
  newRowDraft.value = { memo: "", amount: "" };
  newRowCategoryIds.value = [];
  newRowTagSearch.value = "";
}

function openTagPicker(rowId: number) {
  Object.keys(tagPickerShowByRow).forEach((k) => {
    tagPickerShowByRow[Number(k)] = Number(k) === rowId;
  });
  tagSearchTerm.value = "";
  tagPickerShowByRow[rowId] = true;
}

function onDeleteRow(row: LedgerTableRow) {
  deleteEntry(row.id, row.sourceActivityId);
}

function onMemoChange(row: LedgerTableRow, memo: string) {
  patchEntry(row.id, row.sourceActivityId, { memo });
}

function onAmountChange(row: LedgerTableRow, raw: string) {
  const parsed = parseAmountInput(raw, row.direction);
  if (!parsed) return;
  patchEntry(row.id, row.sourceActivityId, { amount: parsed.amount, direction: parsed.direction });
}

function onSelectCategory(row: LedgerTableRow, tagId: number) {
  patchEntry(row.id, row.sourceActivityId, { categoryTagIds: [tagId] });
  tagPickerShowByRow[row.id] = false;
}

function onCreateCategory(row: LedgerTableRow, name: string) {
  const tagId = resolveTagId(name);
  patchEntry(row.id, row.sourceActivityId, { categoryTagIds: [tagId] });
  tagPickerShowByRow[row.id] = false;
}

function onNewRowSelectTag(tagId: number) {
  newRowCategoryIds.value = [tagId];
  newRowTagPickerShow.value = false;
}

function onNewRowCreateTag(name: string) {
  newRowCategoryIds.value = [resolveTagId(name)];
  newRowTagPickerShow.value = false;
}

function appDateTimestamp(): number {
  const raw = dataStore.dateService?.appDateTimestamp;
  if (typeof raw === "number") return raw;
  if (raw && typeof raw === "object" && "value" in raw) return (raw as { value: number }).value;
  return Date.now();
}

function commitNewRow() {
  const parsed = parseAmountInput(newRowDraft.value.amount, "expense");
  if (!parsed) return;
  appendStandalone({
    appDateTimestamp: appDateTimestamp(),
    defaultCurrency: settingStore.settings.defaultCurrency,
    amount: parsed.amount,
    direction: parsed.direction,
    memo: newRowDraft.value.memo.trim() || undefined,
    categoryTagIds: newRowCategoryIds.value.length ? [...newRowCategoryIds.value] : undefined,
  });
  resetNewRowDraft();
}

function focusNewAmount() {
  void nextTick(() => newAmountInputRef.value?.focus());
}

function onTrendDayClick(dayStart: number) {
  dataStore.dateService?.setAppDate(dayStart);
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
  if (!open) {
    visibleLimit.value = pageSize.value;
    showHelp.value = false;
    resetNewRowDraft();
    Object.keys(tagPickerShowByRow).forEach((k) => {
      tagPickerShowByRow[Number(k)] = false;
    });
  }
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

.ledger-aggregate-table col.ledger-aggregate-table__col-action {
  width: 22px;
}

.ledger-aggregate-table col.ledger-aggregate-table__col-date {
  width: 3.5rem;
}

.ledger-aggregate-table th.ledger-aggregate-table__col-date,
.ledger-aggregate-table td.ledger-aggregate-table__col-date {
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.ledger-aggregate-table col.ledger-aggregate-table__col-amount {
  width: 5.5rem;
}

.ledger-aggregate-table td.ledger-aggregate-table__col-action {
  position: relative;
  text-align: center;
  padding: 5px 0;
}

.ledger-aggregate-table__delete,
.ledger-aggregate-table__add {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  line-height: 0;
}

.ledger-aggregate-table__delete :deep(.n-icon),
.ledger-aggregate-table__add :deep(.n-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  line-height: 1;
}

.ledger-aggregate-table__delete {
  color: var(--color-red-dark, #d03050);
}

.ledger-aggregate-table__add {
  color: var(--color-text-secondary);
}

.ledger-aggregate-table__append-row td {
  border-bottom: none;
}

.ledger-aggregate-table__append-date {
  color: var(--color-text-secondary);
}

.ledger-aggregate-table__date--app-day {
  color: var(--color-blue);
}

.ledger-aggregate-table__tags :deep(.tag-picker__trigger) {
  display: block;
  width: 100%;
}

.ledger-aggregate-table__tag-btn {
  display: block;
  width: calc(100% + 12px);
  min-height: 1.5em;
  margin: -5px -6px;
  padding: 5px 6px;
  box-sizing: border-box;
  border: none;
  background: transparent;
  text-align: left;
  color: inherit;
  font: inherit;
  line-height: inherit;
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ledger-aggregate-table__input {
  width: 100%;
  box-sizing: border-box;
  border: none;
  background: transparent;
  font: inherit;
  color: inherit;
  padding: 0;
  outline: none;
}

.ledger-aggregate-table__input--amount {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.ledger-aggregate-table__input:focus {
  outline: 1px solid var(--n-border-color);
  border-radius: 2px;
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
  padding: 5px 6px;
  text-align: left;
  border-bottom: 1px solid var(--n-border-color);
  vertical-align: middle;
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

.ledger-aggregate-table__sort-head {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  font: inherit;
  font-weight: 500;
  color: inherit;
  cursor: pointer;
  white-space: nowrap;
}

.ledger-aggregate-table__sort-head--active {
  color: var(--n-primary-color, #2080f0);
}

.ledger-aggregate-table__sort-head--amount {
  justify-content: flex-end;
  width: 100%;
}

.ledger-aggregate-table__sort-head :deep(.n-icon) {
  display: flex;
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

.ledger-guide {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.ledger-guide__section + .ledger-guide__section {
  padding-top: 12px;
  border-top: 1px solid var(--n-border-color);
}

.ledger-guide__title {
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.ledger-guide__body {
  margin: 0;
  color: var(--color-text-secondary);
}

.ledger-guide__body + .ledger-guide__body {
  margin-top: 4px;
}

.ledger-guide__example {
  margin: 6px 0 0;
  color: var(--color-text-secondary);
  font-family: ui-monospace, monospace;
  font-size: 11px;
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

<style>
@media (max-width: 768px) {
  .n-modal-body-wrapper .ledger-aggregate-modal {
    align-self: flex-start !important;
    margin-top: env(safe-area-inset-top, 0px) !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    width: 100vw !important;
    max-width: 100vw !important;
    height: calc(100dvh - env(safe-area-inset-top, 0px)) !important;
    max-height: calc(100dvh - env(safe-area-inset-top, 0px)) !important;
    display: flex !important;
    flex-direction: column !important;
    background-color: var(--n-color-modal) !important;
    border-radius: 0 !important;
  }

  .ledger-aggregate-modal .n-card-header {
    flex-shrink: 0;
    background-color: var(--n-color-modal) !important;
  }

  .ledger-aggregate-modal .n-card__content {
    flex: 1;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    background-color: var(--n-color-modal) !important;
  }

  .ledger-aggregate-modal .ledger-aggregate {
    min-height: 100%;
    background-color: var(--n-color-modal);
  }

  .ledger-aggregate-modal .ledger-aggregate__table-scroll {
    max-height: none;
    flex: 1;
    min-height: 160px;
    background-color: var(--n-color-modal);
  }

  /* 明细表：压缩金额列，分类限宽，备注吃剩余 */
  .ledger-aggregate-modal .ledger-aggregate-table col.ledger-aggregate-table__col-amount {
    width: 4rem;
  }

  .ledger-aggregate-modal .ledger-aggregate-table col:nth-child(3) {
    width: 24%;
  }
}

.ledger-aggregate-modal .n-base-close::before {
  background-color: transparent !important;
}

.ledger-aggregate-modal .n-base-close:not(.n-base-close--disabled):hover::before {
  background-color: transparent !important;
}
</style>
