// src/core/lifeRecord.ts
// 生活记录（lifeRecord）领域常量与 tag 判定：core 层，无 Vue 依赖
import type { Activity } from "@/core/types/Activity";
import type { DrinkKind, EatCourse } from "@/core/types/Task";
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
  { kind: "toilet", tagId: TAG_ID_LIFE_TOILET, title: "活动", emoji: "🚪", tagColor: "#8040f0", tagBackgroundColor: "rgba(232, 206, 252, 0.4)" },
  { kind: "sleep", tagId: TAG_ID_LIFE_SLEEP, title: "睡觉", emoji: "😴", tagColor: "#8e44ad", tagBackgroundColor: "rgba(232, 222, 252, 0.5)" },
];

const DEF_BY_KIND = new Map(LIFE_RECORD_DEFS.map((d) => [d.kind, d]));
const KIND_BY_TAG_ID = new Map(LIFE_RECORD_DEFS.map((d) => [d.tagId, d.kind]));

export function getLifeRecordDef(kind: LifeRecordKind): LifeRecordDef {
  return DEF_BY_KIND.get(kind)!;
}

/** task/activity 占位：daily_eat_<当日零点>，便于裸数据辨认 */
export function lifeRecordPlaceholderTitle(kind: LifeRecordKind, dayStartTs: number): string {
  return dailyPlaceholderTitle(kind, dayStartTs);
}

const LIFE_PLACEHOLDER_RE = /^(?:daily_)?(drink|eat|toilet|sleep)_(\d+)$/i;

/** 从 daily_<kind>_<日零点> 取日键；对不上返回 null */
export function parseLifeRecordPlaceholder(title?: string | null): { kind: LifeRecordKind; dayStart: number } | null {
  if (!title) return null;
  const matched = LIFE_PLACEHOLDER_RE.exec(title);
  if (!matched) return null;
  const kind = matched[1].toLowerCase() as LifeRecordKind;
  if (!DEF_BY_KIND.has(kind)) return null;
  const dayStart = Number(matched[2]);
  if (!Number.isFinite(dayStart)) return null;
  return { kind, dayStart };
}

/** 日键在标题里，和精力桶 dayEnergyDayOf 同一套路 */
export function lifeRecordDayOf(task: Pick<{ activityTitle?: string | null }, "activityTitle">): number | null {
  return parseLifeRecordPlaceholder(task.activityTitle)?.dayStart ?? null;
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

/** 是否生活记录系统 tag id */
export function isLifeRecordTagId(tagId: number): boolean {
  return KIND_BY_TAG_ID.has(tagId);
}

/**
 * 取色/展示用：跳过生活系统 tag，返回第一个普通 tag。
 * 全是生活 tag 或空 → undefined（视为无展示色）。
 */
export function pickFirstNonLifeRecordTagId(tagIds?: number[] | null): number | undefined {
  if (!tagIds?.length) return undefined;
  for (const id of tagIds) {
    if (!isLifeRecordTagId(id)) return id;
  }
  return undefined;
}

/** activity 是否生活记录行——唯一收口判定，显示/统计都走这里 */
export function getLifeRecordKind(activity: Pick<Activity, "tagIds"> | null | undefined): LifeRecordKind | null {
  return getLifeRecordKindByTagIds(activity?.tagIds);
}

export function isLifeRecordActivity(activity: Pick<Activity, "tagIds"> | null | undefined): boolean {
  return getLifeRecordKind(activity) !== null;
}

export const EAT_COURSE_CYCLE: readonly EatCourse[] = ["meal", "dessert", "apple", "supplement"];

export function normalizeEatCourse(course?: EatCourse | null): EatCourse {
  if (course === "dessert" || course === "apple" || course === "supplement") return course;
  return "meal";
}

export function eatCourseLabel(course?: EatCourse | null): string {
  switch (normalizeEatCourse(course)) {
    case "dessert":
      return "甜点";
    case "apple":
      return "水果";
    case "supplement":
      return "补剂";
    default:
      return "正餐";
  }
}

export function nextEatCourse(course?: EatCourse | null): EatCourse {
  const cur = normalizeEatCourse(course);
  const i = EAT_COURSE_CYCLE.indexOf(cur);
  return EAT_COURSE_CYCLE[(i + 1) % EAT_COURSE_CYCLE.length];
}

export type { DrinkKind };

export const DRINK_KIND_DEFS: readonly { kind: DrinkKind; label: string }[] = [
  { kind: "beverage", label: "饮品" },
  { kind: "water", label: "水" },
  { kind: "coffee", label: "咖啡" },
  { kind: "wine", label: "酒" },
];

const DRINK_KIND_CYCLE: readonly DrinkKind[] = DRINK_KIND_DEFS.map((d) => d.kind);

export function drinkKindLabel(kind: DrinkKind): string {
  return DRINK_KIND_DEFS.find((d) => d.kind === kind)?.label ?? "水";
}

export function normalizeDrinkKind(kind?: DrinkKind | null): DrinkKind {
  if (kind === "beverage" || kind === "coffee" || kind === "wine") return kind;
  return "water";
}

/** 空或未识别按外带杯（水）；旧数据曾把种类写在 description */
export function drinkKindFromDescription(text?: string | null): DrinkKind {
  const t = (text ?? "").trim();
  if (t === "饮品") return "beverage";
  if (t === "咖啡") return "coffee";
  if (t === "酒") return "wine";
  return "water";
}

/** 有 drinkKind 用字段；否则认旧备注标签 */
export function drinkKindOf(record: { drinkKind?: DrinkKind | null; description?: string | null }): DrinkKind {
  if (record.drinkKind != null) return normalizeDrinkKind(record.drinkKind);
  return drinkKindFromDescription(record.description);
}

export function nextDrinkKind(kind?: DrinkKind | null): DrinkKind {
  const cur = normalizeDrinkKind(kind);
  const i = DRINK_KIND_CYCLE.indexOf(cur);
  return DRINK_KIND_CYCLE[(i + 1) % DRINK_KIND_CYCLE.length];
}
