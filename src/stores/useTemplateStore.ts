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

  // ================================================================
  // Computed
  // ================================================================

  /** 所有未删除的模板 */
  const allTemplates = computed<Template[]>(() => {
    return rawTemplates.value.filter((t) => !t.deleted);
  });

  // ================================================================
  // 方法
  // ================================================================

  /** 保存到 localStorage */
  function saveToLocal(): void {
    saveTemplates(rawTemplates.value);
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
    saveToLocal();
    return template;
  }

  /** 更新模板 */
  function updateTemplate(id: number, updates: Partial<Pick<Template, "title" | "content">>): void {
    const template = rawTemplates.value.find((t) => t.id === id);
    if (template) {
      Object.assign(template, updates);
      template.synced = false;
      template.lastModified = Date.now();
      saveToLocal();
    }
  }

  /** 软删除模板 */
  function removeTemplate(id: number): void {
    const template = rawTemplates.value.find((t) => t.id === id);
    if (template) {
      template.deleted = true;
      template.synced = false;
      template.lastModified = Date.now();
      saveToLocal();
    }
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

    // 方法
    addTemplate,
    clearData,
    updateTemplate,
    removeTemplate,
    findById,
    saveToLocal,
  };
});
