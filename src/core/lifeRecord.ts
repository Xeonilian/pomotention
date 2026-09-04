// src/core/lifeRecord.ts
// 生活记录（lifeRecord）领域常量与 tag 判定：core 层，无 Vue 依赖
import type { Activity } from "@/core/types/Activity";
import { TAG_ID_LIFE_DRINK, TAG_ID_LIFE_EAT, TAG_ID_LIFE_TOILET, TAG_ID_LIFE_SLEEP } from "@/core/constants";
import { dailyPlaceholderTitle } from "@/core/dailyPlaceholder";

export type LifeRecordKind = "drink" | "eat" | "toilet" | "sleep";

export interface LifeRecordDef {
  kind: LifeRecordKind;
  /** 固定系统 tag id（多端一致，见 constants.ts） */
  tagId: number;
  /** activity 标题，兼作 tag 名与按钮文案 */
  title: string;
  emoji: string;
  tagColor: string;
  tagBackgroundColor: string;
}

export const LIFE_RECORD_DEFS: readonly LifeRecordDef[] = [
  { kind: "drink", tagId: TAG_ID_LIFE_DRINK, title: "喝水", emoji: "💧", tagColor: "#2080f0", tagBackgroundColor: "rgba(206, 227, 252, 0.5)" },
  { kind: "eat", tagId: TAG_ID_LIFE_EAT, title: "吃饭", emoji: "🍚", tagColor: "#d07050", tagBackgroundColor: "rgba(252, 234, 206, 0.5)" },
  { kind: "toilet", tagId: TAG_ID_LIFE_TOILET, title: "上厕所", emoji: "🚽", tagColor: "#8040f0", tagBackgroundColor: "rgba(232, 206, 252, 0.4)" },
  { kind: "sleep", tagId: TAG_ID_LIFE_SLEEP, title: "睡觉", emoji: "😴", tagColor: "#8e44ad", tagBackgroundColor: "rgba(232, 222, 252, 0.5)" },
];

const DEF_BY_KIND = new Map(LIFE_RECORD_DEFS.map((d) => [d.kind, d]));
const KIND_BY_TAG_ID = new Map(LIFE_RECORD_DEFS.map((d) => [d.tagId, d.kind]));

export function getLifeRecordDef(kind: LifeRecordKind): LifeRecordDef {
  return DEF_BY_KIND.get(kind)!;
}

/** task/todo/activity 占位：daily_eat_<当日零点>，便于裸数据辨认 */
export function lifeRecordPlaceholderTitle(kind: LifeRecordKind, dayStartTs: number): string {
  return dailyPlaceholderTitle(kind, dayStartTs);
}

/** 从 tagIds 判定生活记录 kind；非生活记录返回 null */
export function getLifeRecordKindByTagIds(tagIds?: number[]): LifeRecordKind | null {
  if (!tagIds) return null;
  for (const id of tagIds) {
    const kind = KIND_BY_TAG_ID.get(id);
    if (kind) return kind;
  }
  return null;
}

/** activity 是否生活记录行——唯一收口判定，显示/统计都走这里 */
export function getLifeRecordKind(activity: Pick<Activity, "tagIds"> | null | undefined): LifeRecordKind | null {
  return getLifeRecordKindByTagIds(activity?.tagIds);
}

export function isLifeRecordActivity(activity: Pick<Activity, "tagIds"> | null | undefined): boolean {
  return getLifeRecordKind(activity) !== null;
}
