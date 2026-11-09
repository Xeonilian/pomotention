import type { Activity } from "@/core/types/Activity";
import type { Project } from "@/core/types/Project";
import { isLedgerDayStubActivity } from "@/core/ledger/ledgerDayStub";
import { isLifeRecordActivity } from "@/core/lifeRecord";
import { isDailyPlaceholderTitle } from "@/core/dailyPlaceholder";

/** 候选 Project 中：更深优先；同深按 activity.tagIds 更靠前 */
export function pickSmartProjectId(
  tagIds: number[] | undefined,
  projectsWithTag: Project[],
  depthOf: (projectId: number) => number,
): number | null {
  if (!tagIds?.length || !projectsWithTag.length) return null;
  const tagSet = new Set(tagIds);
  const candidates = projectsWithTag.filter((p) => p.tagId != null && tagSet.has(p.tagId));
  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const byDepth = depthOf(b.id) - depthOf(a.id);
    if (byDepth !== 0) return byDepth;
    // 同深：activity.tagIds 更靠前的绑 tag 优先；同 tag 脏数据再按 id 稳定决胜
    const byTagOrder = tagIds.indexOf(a.tagId!) - tagIds.indexOf(b.tagId!);
    if (byTagOrder !== 0) return byTagOrder;
    return a.id - b.id;
  });
  return candidates[0]!.id;
}

export function isGatherableActivity(act: Activity): boolean {
  if (act.deleted) return false;
  if (isLedgerDayStubActivity(act)) return false;
  if (isLifeRecordActivity(act)) return false;
  if (isDailyPlaceholderTitle(act.title)) return false;
  return act.class === "T" || act.class === "S";
}

/**
 * 一次性收纳：仅处理尚无 projectId 的计划侧 Activity。
 * 返回写入条数。
 */
export function gatherUnassignedBySmartTags(opts: {
  activities: Activity[];
  projects: Project[];
  depthOf: (projectId: number) => number;
  assign: (activityId: number, projectId: number) => void;
}): number {
  const smartProjects = opts.projects.filter((p) => !p.deleted && p.tagId != null);
  if (!smartProjects.length) return 0;

  let n = 0;
  for (const act of opts.activities) {
    if (act.projectId != null) continue;
    if (!isGatherableActivity(act)) continue;
    const pid = pickSmartProjectId(act.tagIds, smartProjects, opts.depthOf);
    if (pid == null) continue;
    opts.assign(act.id, pid);
    n++;
  }
  return n;
}
