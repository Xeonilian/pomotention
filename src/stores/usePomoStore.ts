import { defineStore } from "pinia";
import { STORAGE_KEYS } from "@/core/constants";
import type { Todo } from "@/core/types/Todo";

export interface DailyPomoData {
  count: number; // 番茄钟总数
  diff: number; // 和上次相比的增量
}

export const usePomoStore = defineStore("pomo", {
  state: () => {
    // 从localStorage获取
    let globalPomoCount = 0;
    const storedGlobal = localStorage.getItem(STORAGE_KEYS.GLOBAL_POMO_COUNT);
    if (storedGlobal) {
      globalPomoCount = parseInt(storedGlobal, 10) || 0;
    }

    // 所有天的pomo信息
    let dailyPomos: Record<string, DailyPomoData> = {};
    const storedDaily = localStorage.getItem(STORAGE_KEYS.DAILY_POMOS);
    if (storedDaily) {
      try {
        dailyPomos = JSON.parse(storedDaily);
      } catch {}
    }

    return {
      globalPomoCount,
      dailyPomos, // { [dateStr]: { count, diff } }
      todosByDate: {} as Record<string, Todo[]>, // { [dateStr]: Todo[] }
    };
  },

  getters: {
    // 获取当前视图日期的番茄钟数
    getPomoCountByDate: (state) => (dateString: string) => {
      return state.dailyPomos[dateString]?.count || 0;
    },
    // 全局累计
    globalRealPomo: (state): number => state.globalPomoCount,
  },

  actions: {
    // 设置某天的todos，并自动计算count/diff
    setTodosForDate(dateString: string, todos: Todo[]) {
      // 保留当天的 todos
      this.todosByDate[dateString] = todos;

      // 计算今日总番茄钟数
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

      // 上次保存的数量
      const last = this.dailyPomos[dateString]?.count || 0;
      const diff = newCount - last;

      // 保存每日计数及diff
      this.dailyPomos[dateString] = { count: newCount, diff };

      // 累计/调整全局
      if (diff !== 0) {
        this.globalPomoCount = Math.max(0, this.globalPomoCount + diff);
        localStorage.setItem(
          STORAGE_KEYS.GLOBAL_POMO_COUNT,
          this.globalPomoCount.toString()
        );
      }

      // 持久化dailyPomos
      localStorage.setItem(
        STORAGE_KEYS.DAILY_POMOS,
        JSON.stringify(this.dailyPomos)
      );
    },

    // 支持获取任意视图日期当日todos
    getTodosForDate(dateStr: string): Todo[] {
      return this.todosByDate[dateStr] || [];
    },

    // 重置全局累计
    resetGlobalPomoCount() {
      this.globalPomoCount = 0;
      localStorage.setItem(STORAGE_KEYS.GLOBAL_POMO_COUNT, "0");
    },

    // 设置初始全局计数（用于导入历史数据）
    setInitialGlobalCount(initialCount: number) {
      this.globalPomoCount = Math.max(0, initialCount);
      localStorage.setItem(
        STORAGE_KEYS.GLOBAL_POMO_COUNT,
        this.globalPomoCount.toString()
      );
    },

    // 重置并设置新的初始值
    resetAndSetInitial(newInitialCount: number = 0) {
      // 清空日常数据（可选）
      this.dailyPomos = {};
      this.todosByDate = {};

      // 设置新的全局起始值
      this.setInitialGlobalCount(newInitialCount);

      // 清理localStorage
      localStorage.setItem(STORAGE_KEYS.DAILY_POMOS, "{}");
    },
  },
});
