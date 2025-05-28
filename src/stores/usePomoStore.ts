import { defineStore } from "pinia";
import { STORAGE_KEYS } from "@/core/constants";
import type { Todo } from "@/core/types/Todo";

export const usePomoStore = defineStore("pomo", {
  state: () => {
    console.log("=== 初始化 PomoStore ===");
    console.log(
      "STORAGE_KEYS.GLOBAL_POMO_COUNT:",
      STORAGE_KEYS.GLOBAL_POMO_COUNT
    );
    const storedCount = localStorage.getItem(STORAGE_KEYS.GLOBAL_POMO_COUNT);
    console.log("从 localStorage 读取的原始值:", storedCount);
    console.log("localStorage 中的所有键:", Object.keys(localStorage));

    let initialCount = 0;
    if (storedCount !== null) {
      try {
        initialCount = parseInt(storedCount, 10);
        console.log("解析后的数值:", initialCount);
        if (isNaN(initialCount)) {
          console.warn("解析存储值失败，使用默认值 0");
          initialCount = 0;
        }
      } catch (e) {
        console.warn("解析存储值出错，使用默认值 0", e);
        initialCount = 0;
      }
    }

    console.log("最终使用的初始值:", initialCount);
    return {
      globalPomoCount: initialCount,
      todayTodos: [] as Todo[],
      lastTodayCount: 0,
    };
  },

  getters: {
    todayPomoCount: (state) => {
      const count = state.todayTodos.reduce((total, todo) => {
        if (todo.realPomo && todo.realPomo.length > 0) {
          return total + todo.realPomo.reduce((sum, pomo) => sum + pomo, 0);
        }
        return total;
      }, 0);
      console.log("今日番茄钟计数:", count);
      return count;
    },

    globalRealPomo: (state): number => {
      console.log("获取全局番茄钟计数:", state.globalPomoCount);
      return state.globalPomoCount;
    },
  },

  actions: {
    setTodayTodos(todos: Todo[]) {
      console.log("设置今日待办事项:", todos);
      this.todayTodos = todos;

      const todayCount = this.todayPomoCount;
      console.log("当前今日番茄钟总数:", todayCount);

      if (todayCount > this.lastTodayCount) {
        const diff = todayCount - this.lastTodayCount;
        console.log("检测到今日番茄钟增加:", {
          lastCount: this.lastTodayCount,
          currentCount: todayCount,
          diff,
        });

        const newGlobalCount = this.globalPomoCount + diff;
        console.log("更新全局计数:", {
          oldCount: this.globalPomoCount,
          newCount: newGlobalCount,
        });

        this.globalPomoCount = newGlobalCount;
        localStorage.setItem(
          STORAGE_KEYS.GLOBAL_POMO_COUNT,
          newGlobalCount.toString()
        );
        console.log("已保存到 localStorage:", {
          key: STORAGE_KEYS.GLOBAL_POMO_COUNT,
          value: newGlobalCount.toString(),
        });
      }

      this.lastTodayCount = todayCount;
    },

    updateGlobalPomoCount(todo: Todo) {
      this.setTodayTodos(this.todayTodos);
    },

    resetGlobalPomoCount() {
      console.log("=== 重置全局番茄钟计数 ===");
      this.globalPomoCount = 0;
      this.lastTodayCount = 0;
      localStorage.setItem(STORAGE_KEYS.GLOBAL_POMO_COUNT, "0");
      console.log("已重置并保存到 localStorage");
      console.log(
        "重置后立即读取验证:",
        localStorage.getItem(STORAGE_KEYS.GLOBAL_POMO_COUNT)
      );
    },
  },
});
