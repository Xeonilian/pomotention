import { defineStore } from "pinia";
import { STORAGE_KEYS } from "@/core/constants";
import type { Todo } from "@/core/types/Todo";

export const usePomoStore = defineStore("pomo", {
  state: () => {
    // 从 localStorage 获取 globalPomoCount，如果不存在则初始化为 0
    const storedCount = localStorage.getItem(STORAGE_KEYS.GLOBAL_POMO_COUNT);
    console.log(
      "STORAGE_KEYS.GLOBAL_POMO_COUNT:",
      STORAGE_KEYS.GLOBAL_POMO_COUNT
    );
    console.log("从 localStorage 获取的原始值:", storedCount);

    let initialCount = 0;
    if (storedCount !== null) {
      try {
        initialCount = parseInt(storedCount, 10);
        if (isNaN(initialCount)) {
          console.warn("解析存储值失败，使用默认值 0");
          initialCount = 0;
        }
      } catch (e) {
        console.warn("解析存储值出错，使用默认值 0");
        initialCount = 0;
      }
    }
    console.log("解析后的初始值:", initialCount);

    // 确保存储初始值
    if (storedCount === null) {
      console.log("未找到存储值，设置初始值:", initialCount);
      localStorage.setItem(
        STORAGE_KEYS.GLOBAL_POMO_COUNT,
        initialCount.toString()
      );
    }

    return {
      globalPomoCount: initialCount,
      todayTodos: [] as Todo[],
    };
  },

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
        console.log("更新全局番茄钟计数:", {
          todoId: todo.id,
          oldTodo: oldTodo ? "存在" : "不存在",
          realPomo: todo.realPomo,
          currentGlobalCount: this.globalPomoCount,
        });

        // 如果是新任务，不更新全局计数
        if (!oldTodo) {
          console.log("新任务，不更新全局计数");
          return;
        }

        // 只计算新增的番茄钟数
        const oldCount = oldTodo.realPomo
          ? oldTodo.realPomo.reduce((sum, pomo) => sum + pomo, 0)
          : 0;
        const newCount = todo.realPomo.reduce((sum, pomo) => sum + pomo, 0);
        const diff = newCount - oldCount;

        console.log("番茄钟计数变化:", {
          oldCount,
          newCount,
          diff,
          currentGlobalCount: this.globalPomoCount,
        });

        if (diff > 0) {
          this.globalPomoCount += diff;
          console.log("更新后的全局计数:", this.globalPomoCount);
          this.saveGlobalPomoCount();
        }
      }
    },

    saveGlobalPomoCount() {
      console.log("保存全局番茄钟计数到 localStorage:", this.globalPomoCount);
      localStorage.setItem(
        STORAGE_KEYS.GLOBAL_POMO_COUNT,
        this.globalPomoCount.toString()
      );
    },

    // 添加重置方法
    resetGlobalPomoCount() {
      this.globalPomoCount = 0;
      this.saveGlobalPomoCount();
    },
  },
});
