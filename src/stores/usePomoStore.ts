import { defineStore } from "pinia";
import { STORAGE_KEYS } from "@/core/constants";
import type { Todo } from "@/core/types/Todo";

export const usePomoStore = defineStore("pomo", {
  state: () => {
    // 从 localStorage 获取 globalPomoCount
    const storedCount = localStorage.getItem(STORAGE_KEYS.GLOBAL_POMO_COUNT);
    let initialCount = 0;

    if (storedCount !== null) {
      try {
        initialCount = parseInt(storedCount, 10);
        if (isNaN(initialCount)) {
          initialCount = 0;
        }
      } catch (e) {
        initialCount = 0;
      }
    }

    return {
      globalPomoCount: initialCount,
      todayTodos: [] as Todo[],
      lastTodayCount: 0,
    };
  },

  getters: {
    todayPomoCount: (state) => {
      const count = state.todayTodos.reduce((total, todo) => {
        if (
          todo.realPomo &&
          todo.realPomo.length > 0 &&
          todo.pomoType === "🍅"
        ) {
          return total + todo.realPomo.reduce((sum, pomo) => sum + pomo, 0);
        }
        return total;
      }, 0);
      return count;
    },

    globalRealPomo: (state): number => {
      return state.globalPomoCount;
    },
  },

  actions: {
    setTodayTodos(todos: Todo[]) {
      // 计算新的番茄钟总数
      const newCount = todos.reduce((total, todo) => {
        if (
          todo.realPomo &&
          todo.realPomo.length > 0 &&
          todo.pomoType === "🍅"
        ) {
          return total + todo.realPomo.reduce((sum, pomo) => sum + pomo, 0);
        }
        return total;
      }, 0);

      // 计算与上次计数的差值
      const diff = newCount - this.lastTodayCount;

      // 更新全局计数
      if (diff !== 0) {
        this.globalPomoCount = Math.max(0, this.globalPomoCount + diff);
        localStorage.setItem(
          STORAGE_KEYS.GLOBAL_POMO_COUNT,
          this.globalPomoCount.toString()
        );
      }

      // 更新状态
      this.todayTodos = todos;
      this.lastTodayCount = newCount;
    },

    updateGlobalPomoCount(todo: Todo) {
      // 这个方法现在只用于设置今日待办事项
      this.setTodayTodos(this.todayTodos);
    },

    resetGlobalPomoCount() {
      this.globalPomoCount = 0;
      this.lastTodayCount = 0;
      localStorage.setItem(STORAGE_KEYS.GLOBAL_POMO_COUNT, "0");
    },
  },
});
