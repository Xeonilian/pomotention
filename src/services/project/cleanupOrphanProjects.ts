import type { Project } from "@/core/types/Project";

export type ProjectCleanupReport = {
  /** 因父缺失/已删而软删的文件夹数（含级联子孙） */
  removedProjectCount: number;
  removedProjectIds: number[];
  /** 指向已失效 Project 的 Activity 数（清 projectId 前统计） */
  danglingActivityCount: number;
};

/**
 * 找出「活着但父已删/不存在」的森林根（其子仍挂在活父上，不单独进列表）。
 */
export function findOrphanForestRoots(projects: Project[]): number[] {
  const byId = new Map(projects.map((p) => [p.id, p]));
  const roots: number[] = [];
  for (const p of projects) {
    if (p.deleted) continue;
    if (p.parentId == null) continue;
    const parent = byId.get(p.parentId);
    if (!parent || parent.deleted) roots.push(p.id);
  }
  return roots;
}

/** 收集 root 及未删子孙（与 store.collectDescendantIds 同语义，便于单测） */
export function collectLiveDescendantIds(projects: Project[], rootId: number): number[] {
  const ids: number[] = [];
  const walk = (id: number) => {
    ids.push(id);
    for (const p of projects) {
      if (p.deleted || p.parentId !== id) continue;
      walk(p.id);
    }
  };
  walk(rootId);
  return ids;
}

/**
 * 统计将受清理影响的 Activity：projectId 指向已删/缺失 Project。
 * dry 用；真正清引用仍走 dataStore.stripProjectIdFromReferences。
 */
export function countActivitiesOnDeadProjects(
  activities: { projectId?: number | null }[],
  projects: Project[],
): { count: number; deadProjectIds: number[] } {
  const live = new Set(projects.filter((p) => !p.deleted).map((p) => p.id));
  const dead = new Set<number>();
  let count = 0;
  for (const act of activities) {
    if (act.projectId == null) continue;
    if (live.has(act.projectId)) continue;
    count++;
    dead.add(act.projectId);
  }
  return { count, deadProjectIds: [...dead] };
}
