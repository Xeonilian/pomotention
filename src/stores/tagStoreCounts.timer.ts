import { computed, type Ref } from "vue";
import type { Tag } from "@/core/types/Tag";

export type TagWithCount = Tag & { count: number };

/** Timer 独立版：不依赖 activity 数据，count 固定为 0 */
export function useTagsWithActivityCounts(rawTags: Ref<Tag[]>) {
  return computed<TagWithCount[]>(() =>
    rawTags.value
      .filter((tag) => !tag.deleted)
      .map((tag) => ({
        ...tag,
        count: 0,
      })),
  );
}
