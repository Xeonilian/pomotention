import { computed, toValue, type ComputedRef } from "vue";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useTagStore } from "@/stores/useTagStore";
import { getDayStartTimestamp } from "@/core/utils";
import {
  aggregateLedger,
  formatLedgerMoney,
  type LedgerAggregateResult,
  type LedgerTableSort,
  type LedgerViewScale,
} from "@/services/ledger/ledgerQueryService";

const EMPTY_AGGREGATE: LedgerAggregateResult = {
  stats: { entryCount: 0, totalExpense: 0, totalIncome: 0, net: 0 },
  pie: { show: true, slices: [] },
  trend: [],
  tableRows: [],
};

function resolveVisibleRange(dataStore: ReturnType<typeof useDataStore>): { start: number; end: number } {
  const raw = toValue(dataStore.dateService.visibleRange as { value?: { start: number; end: number } });
  if (raw && typeof raw.start === "number" && typeof raw.end === "number") {
    return raw;
  }
  const start = getDayStartTimestamp();
  return { start, end: start + 86_400_000 };
}

const SCALE_LABEL: Record<LedgerViewScale, string> = {
  day: "日",
  week: "周",
  month: "月",
  year: "年",
};

export function useLedgerAggregatePanel(tableSort: ComputedRef<LedgerTableSort>) {
  const dataStore = useDataStore();
  const settingStore = useSettingStore();
  const tagStore = useTagStore();
  const { ledgerList, filterTagIds, filterStarredOnly, todoById } = storeToRefs(dataStore);

  const viewScale = computed(() => settingStore.settings.viewSet as LedgerViewScale);
  const scaleLabel = computed(() => SCALE_LABEL[viewScale.value] ?? "日");

  const aggregate = computed<LedgerAggregateResult>(() => {
    const range = resolveVisibleRange(dataStore);
    const activityMap = toValue(dataStore.activityById);
    const todoMap = toValue(todoById);
    return aggregateLedger(
      {
        entries: ledgerList.value ?? [],
        rangeStart: range.start,
        rangeEnd: range.end,
        viewScale: viewScale.value,
        filterTagIds: filterTagIds.value,
        filterStarredOnly: filterStarredOnly.value,
        getTodoById: (todoId) => todoMap.get(todoId),
        getActivityTagIds: (activityId) => activityMap.get(activityId)?.tagIds,
        hasStarredTaskForActivity: (id) => dataStore.hasStarredTaskForActivity(id),
        getTagName: (id) => tagStore.getTag(id)?.name,
      },
      toValue(tableSort),
    );
  });

  return {
    aggregateData: computed(() => aggregate.value ?? EMPTY_AGGREGATE),
    viewScale,
    scaleLabel,
    formatLedgerMoney,
  };
}
