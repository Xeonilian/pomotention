import type { TimerSessionRecord } from "@/core/types/TimerSession";

export function sessionMatchesTagFilter(session: TimerSessionRecord, filterTagIds: number[]): boolean {
  if (!filterTagIds.length) return true;
  const ids = session.tagIds ?? [];
  return filterTagIds.every((id) => ids.includes(id));
}

export function filterSessionsByTags(sessions: TimerSessionRecord[], filterTagIds: number[]): TimerSessionRecord[] {
  if (!filterTagIds.length) return sessions;
  return sessions.filter((s) => sessionMatchesTagFilter(s, filterTagIds));
}
