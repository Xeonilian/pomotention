import { ref, computed, watch } from "vue";
import { defineStore } from "pinia";
import { loadTags, saveTags } from "@/services/localStorageService";
import { useDataStore } from "./useDataStore"; // 依赖 activity 数据
import type { Tag } from "@/core/types/Tag";

export type TagWithCount = Tag & { count: number };

export const useTagStore = defineStore("tagStore", () => {
  // ----------------------------------------------------------------
  // STATE
  // ----------------------------------------------------------------

  // 原始 tag 数据（单一数据源），从 localStorage 加载
  const rawTags = ref<Tag[]>(loadTags());

  // 每当原始数据变化时，自动保存到 localStorage
  watch(
    rawTags,
    (tags) => {
      saveTags(tags);
    },
    { deep: true }
  );

  // ----------------------------------------------------------------
  // GETTERS (COMPUTED)
  // ----------------------------------------------------------------

  const dataStore = useDataStore();

  /**
   * ✅ 主要的响应式 Getter，供所有 UI 使用。
   * 它会自动关联 aсtivity 数据，计算出每个 tag 的 `count`。
   * 当 aсtivities 或 tags 变化时，它会自动更新。
   */
  const allTags = computed(() => {
    const countMap = new Map<number, number>();

    // 1. 响应式地计算所有 tag 的引用计数
    for (const activity of dataStore.activeActivities) {
      if (activity.deleted || !activity.tagIds) continue;
      for (const tagId of activity.tagIds) {
        countMap.set(tagId, (countMap.get(tagId) || 0) + 1);
      }
    }

    // 2. 将计算出的 count 合并到 tag 对象上，并过滤掉已删除的 tag
    return rawTags.value
      .filter((tag) => !tag.deleted)
      .map((tag) => ({
        ...tag,
        count: countMap.get(tag.id) || 0,
      }));
  });

  /**
   * ✅ 为同步服务提供的 Getter，用于获取所有本地未同步的变更。
   */
  const unsyncedTags = computed(() => rawTags.value.filter((t) => !t.synced));

  // ----------------------------------------------------------------
  // ACTIONS
  // ----------------------------------------------------------------

  function findTagIndex(id: number): number {
    return rawTags.value.findIndex((t) => t.id === id);
  }

  /**
   * 添加一个新 tag。
   */
  function addTag(name: string, color: string, backgroundColor: string): Tag {
    const trimmedName = name.trim();
    const existing = rawTags.value.find((t) => !t.deleted && t.name.toLowerCase() === trimmedName.toLowerCase());
    if (existing) {
      return allTags.value.find((t) => t.id === existing.id)!;
    }

    const newTag: Tag = {
      id: Date.now(),
      name: trimmedName,
      color,
      backgroundColor,
      deleted: false,
      synced: false, // 标记为需要同步
      lastModified: Date.now(),
    };

    rawTags.value.push(newTag);
    return newTag;
  }

  /**
   * 更新一个 tag 的信息。
   * 所有更新都会自动将 `synced` 设为 false 并更新 `lastModified`。
   */
  function updateTag(id: number, patch: Partial<Omit<Tag, "id">>) {
    const index = findTagIndex(id);
    if (index !== -1) {
      rawTags.value[index] = {
        ...rawTags.value[index],
        ...patch,
        lastModified: Date.now(),
        synced: false,
      };
    }
  }

  /**
   * 软删除一个 tag。
   */
  function removeTag(id: number) {
    updateTag(id, { deleted: true });
  }

  /**
   * 如果本地没有 tags，加载一套初始默认 tags。
   */
  function loadInitialTags(defaultTags: Tag[]) {
    if (rawTags.value.length === 0) {
      rawTags.value = defaultTags.map((t) => ({
        ...t,
        lastModified: Date.now(),
        synced: true, // 初始 tags 认为是已同步状态
      }));
    }
  }

  // ----------------------------------------------------------------
  // GETTERS (FUNCTIONS)
  // ----------------------------------------------------------------

  function getTag(id: number): Tag | undefined {
    return allTags.value.find((t) => t.id === id);
  }

  function getTagsByIds(ids: number[]): Tag[] {
    if (!ids || ids.length === 0) return [];
    const tagMap = new Map(allTags.value.map((tag) => [tag.id, tag]));
    return ids.map((id) => tagMap.get(id)).filter((tag): tag is Tag & { count: number } => tag !== undefined);
  }

  function getTagNamesByIds(tagIds: number[]): string {
    return getTagsByIds(tagIds)
      .map((tag) => tag.name)
      .join(", ");
  }

  function findByName(keyword: string): TagWithCount[] {
    const trimmedKeyword = keyword.trim().toLowerCase();
    if (!trimmedKeyword) return allTags.value;
    return allTags.value.filter((t) => t.name.toLowerCase().includes(trimmedKeyword));
  }

  // ----------------------------------------------------------------
  // SYNC ACTIONS
  // ----------------------------------------------------------------

  /**
   * ✅ 合并从服务器拉取的数据。
   */
  function mergeTags(serverTags: Tag[]) {
    const localTagMap = new Map(rawTags.value.map((t) => [t.id, t]));

    for (const serverTag of serverTags) {
      const localTag = localTagMap.get(serverTag.id);

      if (!localTag) {
        // 本地不存在该 tag，直接添加并标记为已同步
        rawTags.value.push({ ...serverTag, synced: true });
      } else if (serverTag.lastModified > localTag.lastModified) {
        // 服务器版本更新，覆盖本地
        const index = findTagIndex(serverTag.id);
        if (index !== -1) {
          rawTags.value[index] = { ...serverTag, synced: true };
        }
      }
    }
  }

  /**
   * ✅ 更新指定 tags 的同步状态。
   * @param ids - 要更新的 tag ID 数组
   * @param synced - 新的同步状态
   */
  function updateSyncedStatus(ids: number[], synced: boolean) {
    for (const id of ids) {
      const index = findTagIndex(id);
      if (index !== -1 && rawTags.value[index].synced !== synced) {
        rawTags.value[index].synced = synced;
      }
    }
  }

  return {
    // State
    rawTags, // 内部状态管理
    // Getters
    allTags, // UI 使用
    unsyncedTags, // 同步服务使用
    // Actions
    addTag,
    updateTag,
    removeTag,
    loadInitialTags,
    getTag,
    getTagsByIds,
    getTagNamesByIds,
    findByName,
    // Sync Actions
    mergeTags,
    updateSyncedStatus,
  };
});
