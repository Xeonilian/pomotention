// 完整性探测：只比较未删除条数，软删不参与「漏没漏」判断

export type ActiveCountRow = { name: string; cloud: number; local: number };

/** 云端未删除数多于本地 → 视为漏下 */
export function findActiveCountLeaks(rows: ActiveCountRow[]): ActiveCountRow[] {
  return rows.filter((row) => row.cloud > row.local);
}
