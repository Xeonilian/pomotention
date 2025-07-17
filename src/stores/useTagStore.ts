// src/stores/useTagStore.ts
import { ref, computed } from "vue";
import { loadTags, saveTags, generateTagId } from "@/services/storageService";
import type { Tag } from "@/core/types/Tag";

export function useTagStore() {
  const tags = ref<Tag[]>(loadTags());

  function addTag(name: string, color: string, backgroundColor: string) {
    const exist = tags.value.find(
      (tag) => tag.name.trim().toLowerCase() === name.trim().toLowerCase()
    );
    if (exist) return exist;
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

  // **修改 updateTag 方法**
  function updateTag(id: number, patch: Partial<Omit<Tag, "id" | "count">>) {
    const index = tags.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      // 创建新的 Tag 对象，保留旧属性并应用补丁
      const updatedTag = { ...tags.value[index], ...patch };
      // 使用 splice 替换数组中的旧对象，触发响应式更新
      tags.value.splice(index, 1, updatedTag);
      saveTags(tags.value);
    }
  }

  function removeTag(id: number) {
    const idx = tags.value.findIndex((t) => t.id === id);
    if (idx >= 0) {
      tags.value.splice(idx, 1);
      saveTags(tags.value);
    }
  }

  function findByName(keyword: string) {
    return tags.value.filter((t) =>
      t.name.toLowerCase().includes(keyword.trim().toLowerCase())
    );
  }

  function getTag(id: number) {
    return tags.value.find((t) => t.id === id) || null;
  }

  // **修改 setTagCount 方法**
  function setTagCount(id: number, count: number) {
    const index = tags.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      // 创建新的 Tag 对象，更新 count 属性
      const updatedTag = { ...tags.value[index], count: count };
      // 使用 splice 替换数组中的旧对象，触发响应式更新
      tags.value.splice(index, 1, updatedTag);
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
