/**
 * title 以 activity 为准；无 activity 或空标题时才用下游副本（todo/schedule/task.activityTitle）。
 */
export function resolveActivityTitle(
  activity: { title?: string } | null | undefined,
  fallback?: string | null | undefined,
): string {
  if (activity?.title != null && activity.title !== "") return activity.title;
  return fallback ?? "";
}
