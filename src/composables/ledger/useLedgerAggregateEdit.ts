import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/stores/useDataStore";
import { useTagStore, type TagWithCount } from "@/stores/useTagStore";
import type { LedgerDirection, LedgerEntry } from "@/core/types/LedgerEntry";
import {
  createStandaloneLedgerEntry,
  deleteLedgerEntryFromAggregate,
  updateLedgerEntry,
} from "@/services/ledger/ledgerService";
import { isLedgerDayStubActivity } from "@/core/ledger/ledgerDayStub";

/** 按 ledger categoryTagIds[0] 统计频次，供 TagSelector 排序 */
export function buildLedgerCategoryUsageCounts(entries: readonly LedgerEntry[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const entry of entries) {
    if (entry.deleted) continue;
    const tagId = entry.categoryTagIds?.[0];
    if (tagId == null) continue;
    map.set(tagId, (map.get(tagId) ?? 0) + 1);
  }
  return map;
}

export function rankTagsByLedgerUsage(tags: TagWithCount[], usage: Map<number, number>): TagWithCount[] {
  return [...tags]
    .sort((a, b) => {
      const diff = (usage.get(b.id) ?? 0) - (usage.get(a.id) ?? 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name, "zh-CN");
    })
    .map((tag) => ({ ...tag, count: usage.get(tag.id) ?? 0 }));
}

export function useLedgerAggregateEdit() {
  const dataStore = useDataStore();
  const tagStore = useTagStore();
  const { ledgerList, activityById, activityList } = storeToRefs(dataStore);

  const ledgerCategoryUsage = computed(() => buildLedgerCategoryUsageCounts(ledgerList.value ?? []));

  const rankLedgerTags = (tags: TagWithCount[]) => rankTagsByLedgerUsage(tags, ledgerCategoryUsage.value);

  function getActivity(activityId: number) {
    return activityById.value.get(activityId);
  }

  function getActivityTitle(activityId: number): string | undefined {
    return getActivity(activityId)?.title;
  }

  function isStubActivityId(activityId: number): boolean {
    const activity = getActivity(activityId);
    return activity != null && isLedgerDayStubActivity(activity);
  }

  function applyActivityTitle(activityId: number, title: string) {
    const activity = activityById.value.get(activityId);
    if (!activity) return;
    activity.title = title;
    activity.synced = false;
    activity.lastModified = Date.now();
  }

  function persist() {
    // 原地改 entry 字段时浅拷贝数组，驱动 aggregate 饼图/趋势重算
    ledgerList.value = [...ledgerList.value];
    dataStore.saveAllDebounced();
  }

  function deleteEntry(entryId: number, sourceActivityId: number) {
    const title = isStubActivityId(sourceActivityId) ? undefined : getActivityTitle(sourceActivityId);
    const result = deleteLedgerEntryFromAggregate(ledgerList.value, entryId, title, {
      activityList: activityList.value,
      getActivity,
    });
    if (!result.updated) return;
    if (result.activityId != null && result.title != null) {
      applyActivityTitle(result.activityId, result.title);
    }
    persist();
  }

  function patchEntry(
    entryId: number,
    sourceActivityId: number,
    patch: {
      amount?: number;
      direction?: LedgerDirection;
      memo?: string;
      categoryTagIds?: number[];
    },
  ) {
    const title = isStubActivityId(sourceActivityId) ? undefined : getActivityTitle(sourceActivityId);
    const result = updateLedgerEntry(ledgerList.value, entryId, patch, title, getActivity);
    if (!result.updated) return;
    if (result.activityId != null && result.title != null) {
      applyActivityTitle(result.activityId, result.title);
    }
    persist();
  }

  function appendStandalone(params: {
    appDateTimestamp: number;
    defaultCurrency: string;
    amount: number;
    direction: LedgerDirection;
    memo?: string;
    categoryTagIds?: number[];
  }) {
    createStandaloneLedgerEntry(ledgerList.value, activityList.value, params);
    persist();
  }

  function resolveTagId(name: string): number {
    return tagStore.addTag(name, "#2080f0", "rgba(206, 227, 252, 0.5)").id;
  }

  return {
    rankLedgerTags,
    deleteEntry,
    patchEntry,
    appendStandalone,
    resolveTagId,
  };
}
