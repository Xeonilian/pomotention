// src/stores/useTagStore.ts
import { ref, computed } from "vue";
import { loadTags, saveTags, generateTagId } from "@/services/storageService";
import type { Tag } from "@/core/types/Tag";

export function useTagStore() {
  // 全部tag（响应式，初始化加载本地）
  const tags = ref<Tag[]>(loadTags());

  // 新增tag，name唯一（忽略大小写）
  function addTag(name: string, color: string, backgroundColor: string) {
    const exist = tags.value.find(
      (tag) => tag.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (exist) return exist; // 已有不重复添加
    const tag: Tag = {
      id: generateTagId(),
      name: name.trim(),
      color,
      backgroundColor,
      count: 0,
    };
    tags.value.push(tag);
    saveTags(tags.value);
    return tag;
  }

  // 编辑tag（支持改名/颜色）
  function updateTag(id: number, patch: Partial<Omit<Tag, "id" | "count">>) {
    const tag = tags.value.find((t) => t.id === id);
    if (tag) {
      Object.assign(tag, patch);
      saveTags(tags.value);
    }
  }

  // 删除tag
  function removeTag(id: number) {
    const idx = tags.value.findIndex((t) => t.id === id);
    if (idx >= 0) {
      tags.value.splice(idx, 1);
      saveTags(tags.value);
    }
  }

  // 查询tag
  function findByName(keyword: string) {
    return tags.value.filter((t) =>
      t.name.toLowerCase().includes(keyword.trim().toLowerCase())
    );
  }

  // 查询单个
  function getTag(id: number) {
    return tags.value.find((t) => t.id === id) || null;
  }

  // 设置计数（主要在业务中维护引用数，不在本store内部）
  function setTagCount(id: number, count: number) {
    const tag = getTag(id);
    if (tag) {
      tag.count = count;
      saveTags(tags.value);
    }
  }

  function getTagsByIds(tagIds: number[]): Tag[] {
    if (!tagIds || tagIds.length === 0) return [];

    return tagIds
      .map((id) => tags.value.find((t) => t.id === id))
      .filter((tag) => tag !== undefined) as Tag[];
  }

  function getTagNamesByIds(tagIds: number[]): string {
    return getTagsByIds(tagIds)
      .map((tag) => tag.name)
      .join(", ");
  }

  // 所有
  const allTags = computed(() => tags.value);

  return {
    tags,
    allTags,
    addTag,
    updateTag,
    removeTag,
    findByName,
    getTag,
    setTagCount,
    getTagNamesByIds,
  };
}
