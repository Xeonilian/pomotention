// src/stores/useSegStore.ts
import { defineStore } from "pinia";
import type { PomodoroSegment, TodoSegment } from "@/core/types/Block";
import type { Todo } from "@/core/types/Todo";
import { generateEstimatedTodoSegments } from "@/services/pomoSegService";

export const useSegStore = defineStore("seg", {
  state: () => ({
    pomodoroSegments: [] as PomodoroSegment[],
    todoSegments: [] as TodoSegment[],
  }),

  actions: {
    // 基础 setter：设置所有番茄时间块
    setPomodoroSegments(segments: PomodoroSegment[]) {
      this.pomodoroSegments = segments;
    },

    // 基础 setter：原子替换所有 todoSegments
    setTodoSegments(segments: TodoSegment[]) {
      this.todoSegments = segments;
    },

    // 私有工具：从当前/传入的 segments，把 globalIndex 回填到 todos（仅在 todo.globalIndex 为 undefined 时）
    // 注意：这是一段副作用逻辑，会修改传入的 todos 引用
    _syncTodoGlobalIndexFromSegments(
      todos: Todo[],
      todoSegments: TodoSegment[]
    ) {
      if (!Array.isArray(todos) || todos.length === 0) return;
      if (!Array.isArray(todoSegments) || todoSegments.length === 0) return;

      const todoMap = new Map<number, Todo>(todos.map((t) => [t.id, t]));

      for (const seg of todoSegments) {
        if (seg.globalIndex === undefined) continue;
        const originalTodo = todoMap.get(seg.todoId);
        if (originalTodo && originalTodo.globalIndex === undefined) {
          originalTodo.globalIndex = seg.globalIndex;
        }
      }
    },

    /**
     * 根据传入的 todos 列表，重新计算并更新 todoSegments，
     * 并在计算完成后把 globalIndex 写回到 todos（仅当 todo.globalIndex 尚未定义）。
     * @param todos - 最新的 todos 数组（包含正确的 positionIndex）
     * @param appDateTimestamp - 当天的起始时间戳
     */
    recalculateTodoAllocations(todos: Todo[], appDateTimestamp: number) {
      // 1) 前提校验
      if (this.pomodoroSegments.length === 0 || todos.length === 0) {
        this.todoSegments = [];
        return;
      }

      // 2) 纯计算：估算分配（保持 generateEstimatedTodoSegments 为纯函数）
      const allAllocatedSegments = generateEstimatedTodoSegments(
        appDateTimestamp,
        todos,
        this.pomodoroSegments
      );

      // 3) 原子地更新 store 中的 todoSegments
      this.setTodoSegments(allAllocatedSegments);

      // 4) 在 store 内部集中进行副作用：把 globalIndex 回写到传入的 todos
      //    仅在 originalTodo.globalIndex 尚未定义时赋值，避免覆盖用户锁定值
      this._syncTodoGlobalIndexFromSegments(todos, allAllocatedSegments);
    },
  },
});
