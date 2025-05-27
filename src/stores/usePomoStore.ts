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

    // 从 localStorage 获取 lastTodayCount
    const storedLastCount = localStorage.getItem(STORAGE_KEYS.LAST_TODAY_COUNT);
    let initialLastCount = 0;

    if (storedLastCount !== null) {
      try {
        initialLastCount = parseInt(storedLastCount, 10);
        if (isNaN(initialLastCount)) {
          initialLastCount = 0;
        }
      } catch (e) {
        initialLastCount = 0;
      }
    }

    return {
      globalPomoCount: initialCount,
      todayTodos: [] as Todo[],
      lastTodayCount: initialLastCount,
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
      console.log("setTodayTodos 被调用");
      console.log("当前 lastTodayCount:", this.lastTodayCount);
      console.log("当前 globalPomoCount:", this.globalPomoCount);

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

      console.log("计算得到的新计数 newCount:", newCount);

      // 计算与上次计数的差值
      const diff = newCount - this.lastTodayCount;
      console.log("计算得到的差值 diff:", diff);

      // 更新全局计数
      if (diff !== 0) {
        this.globalPomoCount = Math.max(0, this.globalPomoCount + diff);
        console.log("更新后的 globalPomoCount:", this.globalPomoCount);
        localStorage.setItem(
          STORAGE_KEYS.GLOBAL_POMO_COUNT,
          this.globalPomoCount.toString()
        );
      }

      // 更新状态
      this.todayTodos = todos;
      this.lastTodayCount = newCount;
      // 保存 lastTodayCount 到 localStorage
      localStorage.setItem(
        STORAGE_KEYS.LAST_TODAY_COUNT,
        this.lastTodayCount.toString()
      );
      console.log("更新后的 lastTodayCount:", this.lastTodayCount);
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
