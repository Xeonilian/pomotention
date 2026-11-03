import { ref, computed, watch } from "vue";
import { defineStore } from "pinia";
import { loadProjects, saveProjects } from "@/services/data/localStorageService";
import { scheduleDebouncedCloudUpload } from "@/core/utils";
import { useDataStore } from "./useDataStore";
import type { Project } from "@/core/types/Project";

export const useProjectStore = defineStore("projectStore", () => {
  const rawProjects = ref<Project[]>(loadProjects());
  const _projectById = new Map<number, Project>();

  watch(
    rawProjects,
    (list) => {
      _projectById.clear();
      for (const p of list) {
        _projectById.set(p.id, p);
      }
    },
    { deep: true, immediate: true },
  );

  watch(
    rawProjects,
    (projects) => {
      saveProjects(projects);
    },
    { deep: true },
  );

  const allProjects = computed(() => rawProjects.value.filter((p) => !p.deleted));

  const unsyncedProjects = computed(() => rawProjects.value.filter((p) => !p.synced));

  function findProjectIndex(id: number): number {
    return rawProjects.value.findIndex((p) => p.id === id);
  }

  function allocateNextProjectId(): number {
    const used = new Set(rawProjects.value.map((p) => p.id));
    let candidate = Date.now();
    while (used.has(candidate)) candidate++;
    return candidate;
  }

  /** 收集自身及未删除子孙 id（嵌套文件夹） */
  function collectDescendantIds(rootId: number): number[] {
    const ids: number[] = [];
    const walk = (id: number) => {
      ids.push(id);
      for (const p of rawProjects.value) {
        if (p.deleted || p.parentId !== id) continue;
        walk(p.id);
      }
    };
    walk(rootId);
    return ids;
  }

  function addProject(input: {
    title: string;
    description?: string;
    status?: Project["status"];
    dueDate?: number;
    parentId?: number | null;
    tagId?: number;
  }): Project {
    const id = allocateNextProjectId();
    const newProject: Project = {
      id,
      title: input.title.trim(),
      description: input.description,
      status: input.status ?? "",
      dueDate: input.dueDate,
      parentId: input.parentId ?? null,
      tagId: input.tagId,
      deleted: false,
      synced: false,
      lastModified: id,
    };
    rawProjects.value.push(newProject);
    scheduleDebouncedCloudUpload();
    return newProject;
  }

  function updateProjectById(id: number, patch: Partial<Omit<Project, "id">>) {
    const index = findProjectIndex(id);
    if (index === -1) return;
    rawProjects.value[index] = {
      ...rawProjects.value[index],
      ...patch,
      lastModified: Date.now(),
      synced: false,
    };
    scheduleDebouncedCloudUpload();
  }

  /**
   * 软删项目树；挂在其上的 Activity 只清 projectId（不删 Activity）
   */
  function removeProject(id: number) {
    const ids = collectDescendantIds(id);
    const now = Date.now();
    for (const pid of ids) {
      const index = findProjectIndex(pid);
      if (index === -1) continue;
      rawProjects.value[index] = {
        ...rawProjects.value[index],
        deleted: true,
        lastModified: now,
        synced: false,
      };
    }
    useDataStore().stripProjectIdFromReferences(ids);
    scheduleDebouncedCloudUpload();
  }

  function getProject(id: number): Project | undefined {
    return allProjects.value.find((p) => p.id === id);
  }

  function clearData() {
    rawProjects.value.length = 0;
  }

  function updateSyncedStatus(ids: number[], synced: boolean) {
    for (const id of ids) {
      const index = findProjectIndex(id);
      if (index !== -1 && rawProjects.value[index].synced !== synced) {
        rawProjects.value[index].synced = synced;
      }
    }
  }

  return {
    rawProjects,
    allProjects,
    unsyncedProjects,
    projectById: computed(() => new Map(rawProjects.value.map((p) => [p.id, p]))),
    _projectById,
    addProject,
    updateProjectById,
    removeProject,
    getProject,
    clearData,
    updateSyncedStatus,
    saveProjects,
  };
});
