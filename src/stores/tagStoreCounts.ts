import { computed, type Ref } from "vue";
import { useDataStore } from "./useDataStore";
import type { Tag } from "@/core/types/Tag";

export type TagWithCount = Tag & { count: number };

/** 主应用：按 activity 引用计算 tag count */
export function useTagsWithActivityCounts(rawTags: Ref<Tag[]>) {
  const dataStore = useDataStore();

  return computed<TagWithCount[]>(() => {
    const countMap = new Map<number, number>();

    for (const activity of dataStore.activeActivities) {
      if (activity.deleted || !activity.tagIds) continue;
      for (const tagId of activity.tagIds) {
        countMap.set(tagId, (countMap.get(tagId) || 0) + 1);
      }
    }

    return rawTags.value
      .filter((tag) => !tag.deleted)
      .map((tag) => ({
        ...tag,
        count: countMap.get(tag.id) || 0,
      }));
  });
}
