import { computed, toValue, type ComputedRef } from "vue";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/stores/useDataStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { useTagStore } from "@/stores/useTagStore";
import { addDays, getDayStartTimestamp } from "@/core/utils";
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

/** 兼容 ComputedRef 与 Pinia 外链路偶尔已 unwrap 的情况 */
function unwrapRefLike<T>(x: { value?: T } | T | undefined): T | undefined {
  if (x === undefined || x === null) return undefined;
  if (typeof x === "object" && x !== null && "value" in x && (x as { value: T }).value !== undefined) {
    return (x as { value: T }).value;
  }
  return x as T;
}

function resolveVisibleRange(dataStore: ReturnType<typeof useDataStore>): { start: number; end: number } {
  const ds = dataStore.dateService;
  const vr = unwrapRefLike<{ start: number; end: number }>(ds?.visibleRange);
  if (vr && typeof vr.start === "number" && typeof vr.end === "number" && vr.end > vr.start) {
    return vr;
  }
  const appTs = unwrapRefLike<number>(ds?.appDateTimestamp);
  const dayStart = typeof appTs === "number" && !Number.isNaN(appTs) ? getDayStartTimestamp(appTs) : getDayStartTimestamp();
  return { start: dayStart, end: addDays(dayStart, 1) };
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
  const { ledgerList, filterTagIds, filterStarredOnly, todoById, todoByActivityId, scheduleById, scheduleByActivityId } = storeToRefs(dataStore);

  const viewScale = computed(() => settingStore.settings.viewSet as LedgerViewScale);
  const scaleLabel = computed(() => SCALE_LABEL[viewScale.value] ?? "日");

  const aggregate = computed<LedgerAggregateResult>(() => {
    const range = resolveVisibleRange(dataStore);
    const activityMap = toValue(dataStore.activityById);
    const todoMap = toValue(todoById);
    const scheduleMap = toValue(scheduleById);
    return aggregateLedger(
      {
        entries: ledgerList.value ?? [],
        rangeStart: range.start,
        rangeEnd: range.end,
        viewScale: viewScale.value,
        filterTagIds: filterTagIds.value,
        filterStarredOnly: filterStarredOnly.value,
        getTodoById: (todoId) => todoMap.get(todoId),
        getTodoByActivityId: (activityId) => todoByActivityId.value.get(activityId),
        getScheduleById: (scheduleId) => scheduleMap.get(scheduleId),
        getScheduleByActivityId: (activityId) => scheduleByActivityId.value.get(activityId),
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
