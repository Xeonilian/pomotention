// src/services/realPomoState.ts
// realPomo 扁平三态工具（0 未做 / 1 完成 / -1 作废）
// 保持 estPomo 与云端 real_pomo 为 number[] 不变，集中迁移/统计逻辑
// 代码注释使用中文

import type { Todo } from "@/core/types/Todo";

/**
 * 计算 todo 的总槽位数（totalSlots）
 * - 普通 🍅/🍇 ：sum(estPomo)
 * - 樱桃 🍒 ：estPomo[0] （通常为 4，对应 4 个 15min 槽位）
 */
export function totalSlots(todo: Todo): number {
  if (!todo.estPomo || !Array.isArray(todo.estPomo) || todo.estPomo.length === 0) {
    return 0;
  }
  const sum = todo.estPomo.reduce((acc, v) => acc + (typeof v === "number" && Number.isFinite(v) ? v : 0), 0);
  if (todo.pomoType === "🍒") {
    return Math.max(4, sum); // 樱桃固定 4 槽位（或根据 est[0]）
  }
  return sum;
}

/**
 * 判断是否为旧格式（legacy）：realPomo.length === estPomo.length 且与 totalSlots 不等
 * 旧格式下每个 est[i] 表示该段的前缀完成数
 */
function isLegacyFormat(todo: Todo): boolean {
  if (!todo.realPomo || !Array.isArray(todo.realPomo) || !todo.estPomo || !Array.isArray(todo.estPomo)) {
    return false;
  }
  const estLen = todo.estPomo.length;
  const realLen = todo.realPomo.length;
  return realLen === estLen && realLen !== totalSlots(todo);
}

/**
 * 将旧格式展开为扁平新格式
 * 旧 [v1, v2] + estPomo=[3,2] → 前 v1 个 1，后补 0；第二段前 v2 个 1
 */
function expandLegacyToFlat(todo: Todo): number[] {
  if (!todo.realPomo || !todo.estPomo) return [];
  const flat: number[] = [];
  let slotIdx = 0;

  for (let i = 0; i < todo.estPomo.length; i++) {
    const est = typeof todo.estPomo[i] === "number" ? todo.estPomo[i]! : 0;
    const completedInSeg = typeof todo.realPomo[i] === "number" ? Math.max(0, Math.min(todo.realPomo[i]!, est)) : 0;

    for (let j = 0; j < est; j++) {
      flat[slotIdx++] = j < completedInSeg ? 1 : 0;
    }
  }
  return flat;
}

/**
 * 确保 realPomo 是扁平格式（长度 = totalSlots），旧数据自动迁移
 * 写路径始终产生新格式
 */
export function ensureFlatRealPomo(todo: Todo): number[] {
  if (!todo.realPomo || !Array.isArray(todo.realPomo)) {
    return new Array(totalSlots(todo)).fill(0);
  }

  const slots = totalSlots(todo);
  if (todo.realPomo.length === slots) {
    // 已为新格式，钳制值到合法范围
    return todo.realPomo.map((v) => {
      if (v === 1 || v === -1) return v;
      return 0;
    });
  }

  if (isLegacyFormat(todo)) {
    return expandLegacyToFlat(todo);
  }

  // 其他情况（长度不匹配或空）返回全 0 扁平数组
  return new Array(slots).fill(0);
}

/**
 * 获取指定槽位的状态（0/1/-1）
 * slotIndex = sum(estPomo[0..estIndex-1]) + (pomoIndex-1)
 */
export function getRealPomoState(todo: Todo, slotIndex: number): number {
  const flat = ensureFlatRealPomo(todo);
  if (slotIndex < 0 || slotIndex >= flat.length) return 0;
  const v = flat[slotIndex];
  return v === 1 || v === -1 ? v : 0;
}

/**
 * 设置指定槽位的状态，并返回更新后的 realPomo 数组（始终扁平）
 */
export function setPomoState(todo: Todo, slotIndex: number, state: 0 | 1 | -1): number[] {
  const flat = ensureFlatRealPomo(todo);
  if (slotIndex < 0 || slotIndex >= flat.length) return flat;

  flat[slotIndex] = state;
  return [...flat]; // 返回副本供 emit 使用
}

/**
 * 计算完成番茄数（仅计 1 的个数，-1 不计入）
 * - 樱桃：仍保持 /2 以兼容旧时间轴逻辑（ones / 2）
 */
export function countCompletedPomos(todo: Todo): number {
  const flat = ensureFlatRealPomo(todo);
  const ones = flat.filter((v) => v === 1).length;

  if (todo.pomoType === "🍒") {
    return Math.floor(ones / 2); // 保持与旧 sum(realPomo)/2 一致
  }
  return ones;
}

/**
 * 判断 todo 是否已有进度（用于 !realPomo 提示逻辑）
 * 有任意 1 或 -1 即视为已开始
 */
export function hasAnyProgress(todo: Todo): boolean {
  const flat = ensureFlatRealPomo(todo);
  return flat.some((v) => v === 1 || v === -1);
}

/**
 * 计算指定 estIndex 段的起始 slotIndex（供 DayTodo 扁平索引使用）
 */
export function getSlotIndexForEst(todo: Todo, estIndex: number, pomoIndex: number): number {
  if (!todo.estPomo || estIndex < 0) return 0;
  let sum = 0;
  for (let i = 0; i < estIndex; i++) {
    sum += typeof todo.estPomo[i] === "number" ? todo.estPomo[i]! : 0;
  }
  return sum + (pomoIndex - 1);
}
