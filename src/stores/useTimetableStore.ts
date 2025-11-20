// src/stores/useTimetableStore.ts

import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { loadTimetableBlocks, saveTimetableBlocks } from "@/services/localStorageService";
import { WORK_BLOCKS, ENTERTAINMENT_BLOCKS } from "@/core/constants";
import type { Block } from "@/core/types/Block";

export const useTimetableStore = defineStore("timetable", () => {
  // ================================================================
  // 初始化
  // ================================================================
  function initializeBlocks(): Block[] {
    const loaded = loadTimetableBlocks();

    // 如果已有数据，直接返回
    if (loaded.length > 0) {
      return loaded;
    }

    // 否则初始化默认数据
    const now = Date.now();
    const defaultBlocks: Block[] = [];

    // 添加工作时间表
    WORK_BLOCKS.forEach((template, index) => {
      defaultBlocks.push({
        id: now + index,
        type: "work",
        category: template.category,
        start: template.start,
        end: template.end,
        synced: false,
        deleted: false,
        lastModified: now,
      });
    });

    // 添加娱乐时间表
    ENTERTAINMENT_BLOCKS.forEach((template, index) => {
      defaultBlocks.push({
        id: now + WORK_BLOCKS.length + index,
        type: "entertainment",
        category: template.category,
        start: template.start,
        end: template.end,
        synced: false,
        deleted: false,
        lastModified: now,
      });
    });

    return defaultBlocks;
  }

  // ================================================================
  // 状态
  // ================================================================
  const blocks = ref<Block[]>(initializeBlocks());

  // ================================================================
  // Computed
  // ================================================================

  const allWorkBlocks = computed<Block[]>(() => blocks.value.filter((b) => b.type === "work" && !b.deleted));

  const allEntertainmentBlocks = computed<Block[]>(() => blocks.value.filter((b) => b.type === "entertainment" && !b.deleted));

  const allBlocks = computed<Block[]>(() => blocks.value.filter((b) => !b.deleted));

  // ================================================================
  // 方法
  // ================================================================

  function saveToLocal(): void {
    saveTimetableBlocks(blocks.value);
  }

  function getBlocksByType(type: "work" | "entertainment"): Block[] {
    return blocks.value.filter((b) => b.type === type && !b.deleted);
  }

  function addBlock(type: "work" | "entertainment", category: "living" | "sleeping" | "working", start: string, end: string): Block {
    const block: Block = {
      id: Date.now(),
      type,
      category,
      start,
      end,
      synced: false,
      deleted: false,
      lastModified: Date.now(),
    };

    blocks.value.push(block);
    saveToLocal();
    return block;
  }

  function updateBlock(id: number, updates: Partial<Pick<Block, "category" | "start" | "end">>): void {
    const block = blocks.value.find((b) => b.id === id);

    if (block) {
      Object.assign(block, updates);
      block.synced = false;
      block.lastModified = Date.now();
      saveToLocal();
    }
  }

  function removeBlock(id: number): void {
    const block = blocks.value.find((b) => b.id === id);

    if (block) {
      block.deleted = true;
      block.synced = false;
      block.lastModified = Date.now();
      saveToLocal();
    }
  }

  function resetToDefaults(type: "work" | "entertainment"): void {
    // 软删除该类型的所有 blocks
    blocks.value.forEach((b) => {
      if (b.type === type && !b.deleted) {
        b.deleted = true;
        b.synced = false;
        b.lastModified = Date.now();
      }
    });

    // 添加默认 blocks
    const defaults = type === "work" ? WORK_BLOCKS : ENTERTAINMENT_BLOCKS;
    const now = Date.now();

    defaults.forEach((template, index) => {
      blocks.value.push({
        id: now + index,
        type,
        category: template.category,
        start: template.start,
        end: template.end,
        synced: false,
        deleted: false,
        lastModified: now,
      });
    });

    saveToLocal();
  }

  function findById(id: number): Block | undefined {
    return allBlocks.value.find((b) => b.id === id);
  }

  // ================================================================
  // 返回
  // ================================================================
  return {
    blocks,
    allWorkBlocks,
    allEntertainmentBlocks,
    allBlocks,
    getBlocksByType,
    addBlock,
    updateBlock,
    removeBlock,
    resetToDefaults,
    findById,
    saveToLocal,
  };
});
