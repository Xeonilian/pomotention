import type { Todo } from "@/core/types/Todo";

type WorkTodo = Pick<Todo, "pomoType" | "startTime" | "doneTime" | "deleted">;

/** 番茄类 todo 的实际工作时长（ms）；需有 startTime + doneTime */
export function calcTodoWorkMs(todo: WorkTodo): number {
  if (todo.deleted || !todo.pomoType || !todo.startTime || !todo.doneTime) return 0;
  return Math.max(0, todo.doneTime - todo.startTime);
}

/** 毫秒 → "2.9 h" / "12 h" */
export function formatWorkHours(ms: number): string {
  const h = ms / 3_600_000;
  if (h >= 10) return `${Math.round(h)} h`;
  return `${h.toFixed(1)} h`;
}

/** 毫秒 → "10.5h" / "12h"（紧凑，无空格） */
export function formatWorkHoursCompact(ms: number): string {
  const h = ms / 3_600_000;
  if (h <= 0) return "0.0h";
  if (h >= 10) return `${Math.round(h)}h`;
  return `${h.toFixed(1)}h`;
}
