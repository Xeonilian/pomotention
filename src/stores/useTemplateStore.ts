// src/stores/useTemplateStore.ts

import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { loadTemplates, saveTemplates } from "@/services/localStorageService";
import type { Template } from "@/core/types/Template";

export const useTemplateStore = defineStore("template", () => {
  // ================================================================
  // 状态
  // ================================================================
  const rawTemplates = ref<Template[]>(loadTemplates());
  // 每当原始数据变化时，自动保存到 localStorage
  watch(
    rawTemplates,
    (templates) => {
      saveTemplates(templates);
    },
    { deep: true }
  );

  // ================================================================
  // Computed
  // ================================================================

  /** 所有未删除的模板 */
  const allTemplates = computed<Template[]>(() => {
    return rawTemplates.value.filter((t) => !t.deleted);
  });

  /**
   * ✅ 为同步服务提供的 Getter，用于获取所有本地未同步的变更。
   */
  const unsyncedTemplates = computed(() => rawTemplates.value.filter((t) => !t.synced));
  // ================================================================
  // 方法
  // ================================================================

  function findTemplateIndex(id: number): number {
    return rawTemplates.value.findIndex((t) => t.id === id);
  }

  /** 新增模板 */
  function addTemplate(title: string, content: string): Template {
    const template: Template = {
      id: Date.now(),
      title,
      content,
      synced: false,
      deleted: false,
      lastModified: Date.now(),
    };
    rawTemplates.value.push(template);
    return template;
  }

  /** 更新模板名字和内容 */
  function updateTemplate(id: number, updates: Partial<Pick<Template, "title" | "content">>): void {
    const template = rawTemplates.value.find((t) => t.id === id);
    if (template) {
      Object.assign(template, updates);
      template.synced = false;
      template.lastModified = Date.now();
    }
  }

  /**
   * 更新一个 template 的信息。
   * 所有更新都会自动将 `synced` 设为 false 并更新 `lastModified`。
   */
  function updateTemplateById(id: number, patch: Partial<Omit<Template, "id">>) {
    const index = findTemplateIndex(id);
    if (index !== -1) {
      rawTemplates.value[index] = {
        ...rawTemplates.value[index],
        ...patch,
        lastModified: Date.now(),
        synced: false,
      };
    }
  }

  /** 软删除模板 */
  function removeTemplate(id: number): void {
    updateTemplateById(id, { deleted: true, synced: false, lastModified: Date.now() });
  }

  /** 根据 ID 查找模板 */
  function findById(id: number): Template | undefined {
    return allTemplates.value.find((t) => t.id === id);
  }

  /**
   * 清空模板数据
   */
  function clearData() {
    rawTemplates.value = [];
  }

  // ================================================================
  // 返回
  // ================================================================
  return {
    // 状态
    rawTemplates,
    allTemplates,
    unsyncedTemplates,
    templateById: computed(() => new Map(rawTemplates.value.map((t) => [t.id, t]))),

    // 方法
    clearData,
    addTemplate,
    updateTemplateById,
    updateTemplate,
    removeTemplate,
    findById,
    findTemplateIndex,

    // 保存到 localStorage
    saveTemplates,
  };
});
