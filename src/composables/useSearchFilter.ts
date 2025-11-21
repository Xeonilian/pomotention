// src/composables/useSearchFilter.ts

import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useDataStore } from "@/stores/useDataStore";
import { useSearchUiStore } from "@/stores/useSearchUiStore";
import type { TabType } from "@/stores/useSearchUiStore";

// 定义这个 composable 返回的行类型，这与 Search.vue 中的类型一致
export type ActivityRow = {
  activityId: number;
  title: string;
  class: "S" | "T";
  currentId?: number;
  primaryTime?: number;
  hasStarred: boolean;
  tagIds?: number[];
  openKey: string;
};

export function useSearchFilter() {
  // 1. 实例化 stores
  const dataStore = useDataStore();
  const searchUiStore = useSearchUiStore();

  // 2. 解构，保持不变
  const { activeActivities, todoByActivityId, scheduleByActivityId, taskByActivityId } = storeToRefs(dataStore);
  const { searchQuery, filterStarredOnly, filterTagIds } = storeToRefs(searchUiStore);

  const norm = (s?: string) => (s ?? "").toLowerCase();

  // 3. 核心计算属性
  const filteredActivities = computed<ActivityRow[]>(() => {
    const rows: ActivityRow[] = [];
    const q = norm(searchQuery.value);

    // 遍历所有原始活动
    for (const act of activeActivities.value) {
      // --- 筛选条件 1: 关键字搜索 (保持你原来的深入搜索逻辑) ---
      // ... 这部分逻辑完全不变 ...
      const title = act.title || "（无标题）";
      const relatedTask = taskByActivityId.value.get(act.id);

      let passedQuery = !q;
      if (q) {
        const searchableTexts = [title];
        if (relatedTask) {
          searchableTexts.push(relatedTask.activityTitle, relatedTask.projectName ?? "", relatedTask.description ?? "");
        }
        passedQuery = searchableTexts.some((text) => norm(text).includes(q));
      }
      if (!passedQuery) continue;

      // --- 筛选条件 2: 星标过滤 (保持你原来的动态计算逻辑) ---
      const hasStarred = dataStore.hasStarredTaskForActivity(act.id);
      if (filterStarredOnly.value && !hasStarred) {
        continue;
      }

      // --- 【核心修改】 ---
      // --- 筛选条件 3: 标签过滤 (AND 逻辑) ---
      if (filterTagIds.value.length > 0) {
        // 使用 .every() 来确保活动包含了 *所有* 被选中的筛选标签
        const passedTagFilter = filterTagIds.value.every((filterId) => act.tagIds?.includes(filterId));
        if (!passedTagFilter) {
          continue; // 如果不满足所有标签条件，则跳过
        }
      }

      // --- 行数据构造和排序  ---
      const isTodo = act.class === "T";
      const isSch = act.class === "S";
      const td = isTodo ? todoByActivityId.value.get(act.id) : undefined;
      const sch = isSch ? scheduleByActivityId.value.get(act.id) : undefined;

      const getPrimaryTime = () => {
        if (isTodo && td) return td.startTime ?? td.id;
        if (isSch && sch) return sch.activityDueRange?.[0] ?? sch.id;
        return act.id;
      };

      const type: TabType = act.class === "T" ? "todo" : act.class === "S" ? "sch" : "activity";
      const entityId = isTodo ? td?.id : isSch ? sch?.id : act.id;

      rows.push({
        activityId: act.id,
        title,
        class: act.class,
        currentId: entityId,
        primaryTime: getPrimaryTime(),
        hasStarred,
        tagIds: act.tagIds,
        openKey: searchUiStore._makeKey(type, entityId),
      });
    }

    rows.sort((a, b) => (b.primaryTime ?? 0) - (a.primaryTime ?? 0));

    return rows;
  });

  return {
    filteredActivities,
  };
}
