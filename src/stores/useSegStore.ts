// src/stores/useSegStore.ts
import { defineStore } from "pinia";
import type { PomodoroSegment, TodoSegment } from "@/core/types/Block";
import { Todo } from "@/core/types/Todo";
import { generateEstimatedTodoSegments } from "@/services/pomoSegService";

export const useSegStore = defineStore("seg", {
  state: () => ({
    pomodoroSegments: [] as PomodoroSegment[],
    todoSegments: [] as TodoSegment[],
  }),
  actions: {
    // 这个 action 保持不变，用于设置基础的时间块
    setPomodoroSegments(segments: PomodoroSegment[]) {
      this.pomodoroSegments = segments;
    },

    // --- 修改点 2: 创建一个更通用的 setTodoSegments action ---
    // 这个 action 用于一次性、原子地替换所有分配好的 todo-segments。
    // 这是 Pinia/Vuex 中的标准实践，比 clear+push 更推荐。
    setTodoSegments(segments: TodoSegment[]) {
      this.todoSegments = segments;
    },

    // --- 修改点 3: 重构 allocateTodos action ---
    // 这个 action 现在变得非常高效和简洁。
    /**
     * 根据传入的 todos 列表，重新计算并更新整个 todoSegments 状态。
     * @param todos - 最新的 todos 数组 (包含正确的 positionIndex)
     * @param appDateTimestamp - 当天的起始时间戳
     */
    recalculateTodoAllocations(todos: Todo[], appDateTimestamp: number) {
      // 1. 检查前提条件
      if (this.pomodoroSegments.length === 0 || todos.length === 0) {
        this.todoSegments = []; // 如果没有可分配的段或没有任务，则清空
        return;
      }

      // 2. 只需一次调用，计算出所有结果
      const allAllocatedSegments = generateEstimatedTodoSegments(
        appDateTimestamp,
        todos,
        this.pomodoroSegments
      );

      // 3. 使用新的 action 一次性更新状态
      this.setTodoSegments(allAllocatedSegments);
    },
  },
});
