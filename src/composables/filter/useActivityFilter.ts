/** 活动列表筛选：标签 AND + 可选加星，供 Planner / Search 共用 */

export function matchesTagFilter(filterTagIds: readonly number[], activityTagIds?: number[] | null): boolean {
  if (!filterTagIds.length) return true;
  const tags = activityTagIds ?? [];
  return filterTagIds.every((filterId) => tags.includes(filterId));
}

export function matchesStarFilter(
  filterStarredOnly: boolean,
  activityId: number | null | undefined,
  hasStarredTaskForActivity: (activityId: number) => boolean,
): boolean {
  if (!filterStarredOnly) return true;
  if (activityId == null) return false;
  return hasStarredTaskForActivity(activityId);
}

export function matchesActivityFilter(options: {
  filterTagIds: readonly number[];
  filterStarredOnly: boolean;
  activityId?: number | null;
  activityTagIds?: number[] | null;
  hasStarredTaskForActivity: (activityId: number) => boolean;
}): boolean {
  const { filterTagIds, filterStarredOnly, activityId, activityTagIds, hasStarredTaskForActivity } = options;
  return (
    matchesTagFilter(filterTagIds, activityTagIds) &&
    matchesStarFilter(filterStarredOnly, activityId, hasStarredTaskForActivity)
  );
}

export function hasActiveActivityFilter(filterTagIds: readonly number[], filterStarredOnly: boolean): boolean {
  return filterTagIds.length > 0 || filterStarredOnly;
}
