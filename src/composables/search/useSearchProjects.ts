import { computed, ref, type Ref } from "vue";
import { storeToRefs } from "pinia";
import { useProjectStore } from "@/stores/useProjectStore";
import { useDataStore } from "@/stores/useDataStore";
import type { Project } from "@/core/types/Project";
import type { ActivityRow } from "@/composables/search/useSearchFilter";
import { gatherUnassignedBySmartTags } from "@/services/project/smartGather";

export type ProjectTreeRow =
  | {
      kind: "project";
      key: string;
      project: Project;
      depth: number;
      expanded: boolean;
      hasChildProjects: boolean;
      hitCount: number;
      monthGrouped: boolean;
    }
  | {
      kind: "month";
      key: string;
      projectId: number;
      depth: number;
      label: string;
    }
  | {
      kind: "activity";
      key: string;
      row: ActivityRow;
      depth: number;
    };

function naturalTitle(a: string, b: string) {
  return a.localeCompare(b, "zh", { numeric: true });
}

function monthKeyFromTs(ts?: number): string {
  if (!ts) return "未知";
  const d = new Date(ts);
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${yy}/${mm}`;
}

/**
 * 数据页 Project 树：开合 / 改名 / 建子 / 升层 / 删 / 收子树 / 绑 tag / 按月视图 / 命中数。
 * 拖拽另片再加。
 */
export function useSearchProjects(filteredActivities: Ref<ActivityRow[]>) {
  const projectStore = useProjectStore();
  const dataStore = useDataStore();
  const { allProjects } = storeToRefs(projectStore);

  const selectedProjectId = ref<number | null>(null);
  const expandedIds = ref<Set<number>>(new Set());
  const monthGroupIds = ref<Set<number>>(new Set());

  const editingProjectId = ref<number | null>(null);
  const editingTitle = ref("");

  const bindTagProjectId = ref<number | null>(null);
  const tagPickerShow = ref(false);
  const tagSearchTerm = ref("");

  const projectById = computed(() => {
    const m = new Map<number, Project>();
    for (const p of allProjects.value) m.set(p.id, p);
    return m;
  });

  const childrenByParent = computed(() => {
    const m = new Map<number | null, Project[]>();
    for (const p of allProjects.value) {
      const key = p.parentId;
      const list = m.get(key) ?? [];
      list.push(p);
      m.set(key, list);
    }
    for (const [, list] of m) list.sort((a, b) => naturalTitle(a.title, b.title));
    return m;
  });

  function depthOf(id: number): number {
    let d = 0;
    let cur = projectById.value.get(id);
    const guard = new Set<number>();
    while (cur?.parentId != null && !guard.has(cur.parentId)) {
      guard.add(cur.parentId);
      d++;
      cur = projectById.value.get(cur.parentId);
    }
    return d;
  }

  function descendantIds(rootId: number): number[] {
    const ids: number[] = [];
    const walk = (id: number) => {
      ids.push(id);
      for (const c of childrenByParent.value.get(id) ?? []) walk(c.id);
    };
    walk(rootId);
    return ids;
  }

  /** 读 projectId 快照，保证归堆后树/平铺会重算 */
  const activityProjectIds = computed(() => {
    const m = new Map<number, number | undefined>();
    for (const a of dataStore.activityList) {
      if (a.deleted) continue;
      m.set(a.id, a.projectId);
    }
    return m;
  });

  /** 当前筛选下，挂在某 P（含子树）上的 3in1 */
  function activitiesForProjectTree(rootId: number): ActivityRow[] {
    const idSet = new Set(descendantIds(rootId));
    const pids = activityProjectIds.value;
    return filteredActivities.value.filter((r) => {
      const pid = pids.get(r.activityId);
      return pid != null && idSet.has(pid);
    });
  }

  function activitiesDirect(projectId: number): ActivityRow[] {
    const pids = activityProjectIds.value;
    return filteredActivities.value.filter((r) => pids.get(r.activityId) === projectId);
  }

  const projectTreeRows = computed<ProjectTreeRow[]>(() => {
    void activityProjectIds.value; // 依赖归堆结果
    const out: ProjectTreeRow[] = [];

    const pushProject = (p: Project, depth: number) => {
      const childProjects = childrenByParent.value.get(p.id) ?? [];
      const hasChildProjects = childProjects.length > 0;
      const expanded = expandedIds.value.has(p.id);
      const monthGrouped = monthGroupIds.value.has(p.id) && !hasChildProjects;
      out.push({
        kind: "project",
        key: `proj-${p.id}`,
        project: p,
        depth,
        expanded,
        hasChildProjects,
        hitCount: activitiesForProjectTree(p.id).length,
        monthGrouped,
      });

      if (!expanded) return;

      for (const c of childProjects) pushProject(c, depth + 1);

      // 展开后始终挂本 P 的直接成员（有子 P 时仍显示，避免归堆后「看不见」）
      const members = activitiesDirect(p.id).slice().sort((a, b) => (b.primaryTime ?? 0) - (a.primaryTime ?? 0));
      if (monthGrouped) {
        const buckets = new Map<string, ActivityRow[]>();
        for (const row of members) {
          const mk = monthKeyFromTs(row.primaryTime);
          const list = buckets.get(mk) ?? [];
          list.push(row);
          buckets.set(mk, list);
        }
        const keys = [...buckets.keys()].sort((a, b) => b.localeCompare(a));
        for (const mk of keys) {
          out.push({
            kind: "month",
            key: `month-${p.id}-${mk}`,
            projectId: p.id,
            depth: depth + 1,
            label: mk,
          });
          for (const row of buckets.get(mk)!) {
            out.push({
              kind: "activity",
              key: `act-${row.activityId}`,
              row,
              depth: depth + 2,
            });
          }
        }
      } else {
        for (const row of members) {
          out.push({
            kind: "activity",
            key: `act-${row.activityId}`,
            row,
            depth: depth + 1,
          });
        }
      }
    };

    for (const p of childrenByParent.value.get(null) ?? []) pushProject(p, 0);
    return out;
  });

  /** 未归入任何现存 Project 的筛选结果（仍在下方平铺） */
  const orphanActivities = computed(() => {
    const alive = projectById.value;
    const pids = activityProjectIds.value;
    return filteredActivities.value.filter((r) => {
      const pid = pids.get(r.activityId);
      if (pid == null) return true;
      return !alive.has(pid);
    });
  });

  function selectProject(id: number) {
    // 再点同一行取消选中 → 工具条 Folder 回到「建根」
    selectedProjectId.value = selectedProjectId.value === id ? null : id;
  }

  function toggleExpand(id: number) {
    const next = new Set(expandedIds.value);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    expandedIds.value = next;
  }

  function createRootProject() {
    const parentId = selectedProjectId.value;
    const p = projectStore.addProject({
      title: "未命名",
      parentId: parentId != null && projectById.value.has(parentId) ? parentId : null,
    });
    if (p.parentId != null) {
      const next = new Set(expandedIds.value);
      next.add(p.parentId);
      expandedIds.value = next;
    }
    selectedProjectId.value = p.id;
    startRename(p.id);
  }

  function createChildProject(parentId: number) {
    const p = projectStore.addProject({ title: "未命名", parentId });
    const next = new Set(expandedIds.value);
    next.add(parentId);
    expandedIds.value = next;
    // 有子 P 时关掉按月（契约：仅无子 P）
    if (monthGroupIds.value.has(parentId)) {
      const m = new Set(monthGroupIds.value);
      m.delete(parentId);
      monthGroupIds.value = m;
    }
    selectedProjectId.value = p.id;
    startRename(p.id);
  }

  function promoteProject(id: number) {
    const p = projectById.value.get(id);
    if (!p || p.parentId == null) return;
    const parent = projectById.value.get(p.parentId);
    projectStore.updateProjectById(id, { parentId: parent?.parentId ?? null });
  }

  function collapseSubtree(id: number) {
    // 收起内层全部子 folder，本层保持展开
    const next = new Set(expandedIds.value);
    for (const d of descendantIds(id)) {
      if (d !== id) next.delete(d);
    }
    next.add(id);
    expandedIds.value = next;
  }

  function removeProjectById(id: number) {
    const p = projectById.value.get(id);
    if (!p) return;
    const doomed = descendantIds(id);
    projectStore.removeProject(id);
    if (selectedProjectId.value != null && doomed.includes(selectedProjectId.value)) {
      selectedProjectId.value = null;
    }
    const next = new Set(expandedIds.value);
    for (const d of doomed) next.delete(d);
    expandedIds.value = next;
  }

  function startRename(id: number) {
    const p = projectById.value.get(id);
    if (!p) return;
    editingProjectId.value = id;
    editingTitle.value = p.title;
  }

  function commitRename() {
    const id = editingProjectId.value;
    if (id == null) return;
    const title = editingTitle.value.trim() || "未命名";
    projectStore.updateProjectById(id, { title });
    editingProjectId.value = null;
    editingTitle.value = "";
  }

  function cancelRename() {
    editingProjectId.value = null;
    editingTitle.value = "";
  }

  function toggleMonthGroup(id: number) {
    const childProjects = childrenByParent.value.get(id) ?? [];
    if (childProjects.length > 0) return;
    const next = new Set(monthGroupIds.value);
    if (next.has(id)) next.delete(id);
    else {
      next.add(id);
      const exp = new Set(expandedIds.value);
      exp.add(id);
      expandedIds.value = exp;
    }
    monthGroupIds.value = next;
  }

  function openBindTag(id: number) {
    bindTagProjectId.value = id;
    tagSearchTerm.value = "";
    tagPickerShow.value = true;
    selectedProjectId.value = id;
  }

  /** 按当前全部智能绑定向无归属条目做一次收纳 */
  function runSmartGatherOnce(): number {
    return gatherUnassignedBySmartTags({
      activities: dataStore.activityList,
      projects: allProjects.value,
      depthOf,
      assign: (activityId, projectId) => {
        dataStore.updateActivityById(activityId, {
          projectId,
          lastModified: Date.now(),
          synced: false,
        });
      },
    });
  }

  function onBindTagSelected(tagId: number) {
    const pid = bindTagProjectId.value;
    if (pid == null) return;
    // 同一 tag 全局最多绑一个：清掉其它占用
    for (const p of allProjects.value) {
      if (p.tagId === tagId && p.id !== pid) {
        projectStore.updateProjectById(p.id, { tagId: undefined });
      }
    }
    projectStore.updateProjectById(pid, { tagId });
    // 绑定 = 对现有无归属数据跑一次智能收纳（更深优先）
    runSmartGatherOnce();
    const next = new Set(expandedIds.value);
    next.add(pid);
    expandedIds.value = next;
    tagPickerShow.value = false;
    bindTagProjectId.value = null;
  }

  function clearProjectTag(id: number) {
    // 清绑不踢出已归入的条目（契约：智能不改已有 projectId）
    projectStore.updateProjectById(id, { tagId: undefined });
  }

  return {
    selectedProjectId,
    projectTreeRows,
    orphanActivities,
    editingProjectId,
    editingTitle,
    bindTagProjectId,
    tagPickerShow,
    tagSearchTerm,
    selectProject,
    toggleExpand,
    createRootProject,
    createChildProject,
    promoteProject,
    collapseSubtree,
    removeProjectById,
    startRename,
    commitRename,
    cancelRename,
    toggleMonthGroup,
    openBindTag,
    onBindTagSelected,
    clearProjectTag,
    depthOf,
  };
}
