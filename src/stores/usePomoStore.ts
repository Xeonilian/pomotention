import { defineStore } from "pinia";
import { STORAGE_KEYS } from "@/core/constants";
import type { Todo } from "@/core/types/Todo";

export const usePomoStore = defineStore("pomo", {
  state: () => ({
    globalPomoCount: JSON.parse(
      localStorage.getItem(STORAGE_KEYS.GLOBAL_POMO_COUNT) || "0"
    ),
    todayTodos: [] as Todo[],
  }),

  getters: {
    todayPomoCount: (state) => {
      return state.todayTodos.reduce((total, todo) => {
        if (todo.realPomo && todo.realPomo.length > 0) {
          return total + todo.realPomo.reduce((sum, pomo) => sum + pomo, 0);
        }
        return total;
      }, 0);
    },

    globalRealPomo: (state): number => {
      const todayCount = state.todayTodos.reduce((total, todo) => {
        if (todo.realPomo && todo.realPomo.length > 0) {
          return total + todo.realPomo.reduce((sum, pomo) => sum + pomo, 0);
        }
        return total;
      }, 0);
      return state.globalPomoCount + todayCount;
    },
  },

  actions: {
    setTodayTodos(todos: Todo[]) {
      this.todayTodos = todos;
    },

    updateGlobalPomoCount(todo: Todo) {
      if (todo.realPomo && todo.realPomo.length > 0) {
        const oldTodo = this.todayTodos.find((t) => t.id === todo.id);
        // 如果是新任务，不更新全局计数
        if (!oldTodo) {
          return;
        }
        // 只计算新增的番茄钟数
        const oldCount = oldTodo.realPomo
          ? oldTodo.realPomo.reduce((sum, pomo) => sum + pomo, 0)
          : 0;
        const newCount = todo.realPomo.reduce((sum, pomo) => sum + pomo, 0);
        const diff = newCount - oldCount;
        if (diff > 0) {
          this.globalPomoCount += diff;
          this.saveGlobalPomoCount();
        }
      }
    },

    saveGlobalPomoCount() {
      localStorage.setItem(
        STORAGE_KEYS.GLOBAL_POMO_COUNT,
        JSON.stringify(this.globalPomoCount)
      );
    },
  },
});
