// src/stores/useTagStore.ts

import { ref, computed, watch } from "vue";
import { defineStore } from "pinia"; // ✅ 1. 导入 defineStore
import {
  loadTags,
  saveTags,
  generateTagId,
} from "@/services/localStorageService";
import type { Tag } from "@/core/types/Tag";

// ✅ 2. 使用 defineStore 创建 store
// 第一个参数是 store 的唯一 ID
// 第二个参数是一个 setup 函数，和你之前的代码几乎一样
export const useTagStore = defineStore("tagStore", () => {
  // --- 你所有的 state, getters, actions 代码都放在这里 ---

  const tags = ref<Tag[]>(loadTags());

  // Getters (用 computed 实现)
  const allTags = computed(() => tags.value);

  // Actions (普通函数)
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

  function loadInitialTags(defaultTags: Tag[]) {
    // 关键判断：只有当 store 初始化后 tags 数组为空时才执行
    if (tags.value.length > 0) {
      // console.log("[TagStore] 本地已存在标签，跳过加载默认标签。");
      return;
    }

    // console.log("[TagStore] 本地无标签，正在加载默认标签...");

    // *** 核心修正 ***
    // 直接使用传入的、已经包含 ID 的默认标签数组
    tags.value = defaultTags;

    // 在所有默认标签都添加完毕后，进行一次性的保存
    saveTags(tags.value);
  }

  function updateTag(id: number, patch: Partial<Tag>) {
    const index = tags.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      const updated = { ...tags.value[index], ...patch };
      tags.value = [
        ...tags.value.slice(0, index),
        updated,
        ...tags.value.slice(index + 1),
      ];
      saveTags(tags.value);
    }
  }

  function setTagCount(id: number, count: number) {
    const index = tags.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      const updated = { ...tags.value[index], count };
      tags.value = [
        ...tags.value.slice(0, index),
        updated,
        ...tags.value.slice(index + 1),
      ];
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

  function decrementTagCount(id: number) {
    const tag = tags.value.find((t) => t.id === id);
    if (tag) setTagCount(id, Math.max(0, tag.count - 1));
  }

  function incrementTagCount(id: number) {
    const tag = tags.value.find((t) => t.id === id);
    if (tag) {
      // 直接调用 setTagCount，逻辑复用
      setTagCount(id, tag.count + 1);
    }
  }
  watch(
    tags,
    () => {
      console.log(`[TagStore] 标签数据更新。`);
    },
    { deep: true }
  );

  // ✅ 3. 返回所有需要暴露给外部的 state, getters, 和 actions
  return {
    // state
    tags,
    // getters
    allTags,
    // actions
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
