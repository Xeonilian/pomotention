import { SPECIAL_PRIORITIES } from "@/core/priorityCategories";

/** DayTodo 列表展示序模式（全局设置） */
export type DayTodoSortMode = "priority" | "startTime";

/** DayTodo 列表展示序：正常优先级 → 未完成特殊 → 已完成特殊（与肉眼上下键一致） */
export function sortTodosForDayDisplay<T extends { priority: number; status?: string; startTime?: number | null }>(
  todos: readonly T[],
  mode: DayTodoSortMode = "priority",
): T[] {
  if (mode === "startTime") {
    return [...todos].sort((a, b) => {
      if (!a.startTime && !b.startTime) return 0;
      if (!a.startTime) return 1;
      if (!b.startTime) return -1;
      return Number(a.startTime) - Number(b.startTime);
    });
  }

  const specialPriorities = SPECIAL_PRIORITIES;
  const normalTodos: T[] = [];
  const specialTodosNotDone: T[] = [];
  const specialTodosDone: T[] = [];

  for (const todo of todos) {
    if (specialPriorities.includes(todo.priority)) {
      if (todo.status === "done") specialTodosDone.push(todo);
      else specialTodosNotDone.push(todo);
    } else {
      normalTodos.push(todo);
    }
  }

  normalTodos.sort((a, b) => {
    if (a.priority === 0 && b.priority === 0) return 0;
    if (a.priority === 0) return 1;
    if (b.priority === 0) return -1;
    return a.priority - b.priority;
  });

  specialTodosNotDone.sort((a, b) => specialPriorities.indexOf(a.priority) - specialPriorities.indexOf(b.priority));

  specialTodosDone.sort((a, b) => {
    if (!a.startTime && !b.startTime) return 0;
    if (!a.startTime) return 1;
    if (!b.startTime) return -1;
    return String(a.startTime).localeCompare(String(b.startTime));
  });

  return [...normalTodos, ...specialTodosNotDone, ...specialTodosDone];
}
