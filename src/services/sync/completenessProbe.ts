// 完整性探测：只比较未删除条数，软删不参与「漏没漏」判断

export type ActiveCountRow = { name: string; cloud: number; local: number };

/** 云端未删除数多于本地 → 视为漏下 */
export function findActiveCountLeaks(rows: ActiveCountRow[]): ActiveCountRow[] {
  return rows.filter((row) => row.cloud > row.local);
}

/** 云端游标新于本地上次同步 → 本轮应先下后上（换机/落后机） */
export function shouldPullFirstByCursor(lastSync: number, cloudMaxModified: number): boolean {
  return cloudMaxModified > lastSync;
}
