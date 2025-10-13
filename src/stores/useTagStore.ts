// src/stores/useTagStore.ts
import { ref, computed, watch } from "vue";
import { defineStore } from "pinia";
import { loadTags, saveTags } from "@/services/localStorageService";
import type { Tag } from "@/core/types/Tag";

export const useTagStore = defineStore("tagStore", () => {
  const tags = ref<Tag[]>(loadTags());

  const allTags = computed(() => tags.value);

  // 供外部在需要时手动重载本地标签（可选）
  function loadAllTags() {
    tags.value = loadTags();
    return tags.value;
  }

  // 批量设置计数：传入 Map<tagId, count>
  function recalculateTagCounts(countMap: Map<number, number>) {
    if (!countMap) return;
    const newArr = tags.value.map((t) => {
      const nextCount = countMap.get(t.id) ?? 0;
      if ((t.count || 0) !== nextCount) {
        return { ...t, count: nextCount };
      }
      return t;
    });
    tags.value = newArr;
    saveTags(tags.value);
  }

  // 兼容 useDataStore 中的 updateTagCount(tagId, delta)
  function updateTagCount(id: number, delta: number) {
    const tag = tags.value.find((t) => t.id === id);
    if (!tag) return;
    const next = Math.max(0, (tag.count || 0) + delta);
    setTagCount(id, next);
  }

  function addTag(name: string, color: string, backgroundColor: string) {
    const exist = tags.value.find((tag) => tag.name.trim().toLowerCase() === name.trim().toLowerCase());
    if (exist) return exist;
    const tag: Tag = {
      id: Date.now(),
      name: name.trim(),
      color,
      backgroundColor,
      count: 0,
    };
    tags.value.push(tag);
    saveTags(tags.value);
    return tag;
  }

  function loadInitialTags(defaultTags: Tag[]) {
    if (tags.value.length > 0) return;
    tags.value = defaultTags;
    saveTags(tags.value);
  }

  function updateTag(id: number, patch: Partial<Tag>) {
    const index = tags.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      const updated = { ...tags.value[index], ...patch };
      tags.value = [...tags.value.slice(0, index), updated, ...tags.value.slice(index + 1)];
      saveTags(tags.value);
    }
  }

  function setTagCount(id: number, count: number) {
    const index = tags.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      const updated = { ...tags.value[index], count };
      tags.value = [...tags.value.slice(0, index), updated, ...tags.value.slice(index + 1)];
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
    return tags.value.filter((t) => t.name.toLowerCase().includes(keyword.trim().toLowerCase()));
  }

  function getTag(id: number) {
    return tags.value.find((t) => t.id === id) || null;
  }

  function getTagsByIds(tagIds: number[]): Tag[] {
    if (!tagIds || tagIds.length === 0) return [];
    return tagIds.map((id) => tags.value.find((t) => t.id === id)).filter((tag) => tag !== undefined) as Tag[];
  }

  function getTagNamesByIds(tagIds: number[]): string {
    return getTagsByIds(tagIds)
      .map((tag) => tag.name)
      .join(", ");
  }

  function decrementTagCount(id: number) {
    const tag = tags.value.find((t) => t.id === id);
    if (tag) setTagCount(id, Math.max(0, tag.count - 1));
  }

  function incrementTagCount(id: number, amount: number = 1) {
    const tag = tags.value.find((t) => t.id === id);
    if (tag) {
      const newCount = (tag.count || 0) + amount;
      setTagCount(id, newCount);
    }
  }

  watch(
    tags,
    () => {
      console.log(`[TagStore] 标签数据更新。`);
    },
    { deep: true }
  );

  return {
    // state
    tags,
    // getters
    allTags,
    // actions
    loadAllTags, // 新增：兼容 useDataStore 的调用
    recalculateTagCounts, // 新增：供数据端重算计数
    updateTagCount, // 新增：供数据端按 delta 增减
    addTag,
    updateTag,
    removeTag,
    findByName,
    getTag,
    setTagCount,
    getTagsByIds,
    getTagNamesByIds,
    decrementTagCount,
    incrementTagCount,
    loadInitialTags,
  };
});
