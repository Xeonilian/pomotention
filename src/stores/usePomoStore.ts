import { defineStore } from "pinia";
import { STORAGE_KEYS } from "@/core/constants";
import type { Todo } from "@/core/types/Todo";

export interface DailyPomoData {
  count: number; // 番茄钟总数
  diff?: number; // 和上次相比的增量
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

    /**
     * 用于从文件导入场景：直接增加指定日期的番茄钟数量。
     * 这个 action 只做增量，不影响当天的 todos 数组，且同时负责持久化。
     * @param dailyIncrements - 一个记录了每日增量的对象，格式为 { 'YYYY-MM-DD': count }
     */
    importAndIncrementPomos(dailyIncrements: Record<string, number>) {
      console.log("[Pinia Action]: 开始执行 importAndIncrementPomos。");
      let totalIncrement = 0;

      for (const [dateKey, increment] of Object.entries(dailyIncrements)) {
        if (increment > 0) {
          // 1. 更新 dailyPomos
          const oldData = this.dailyPomos[dateKey] || { count: 0 };
          this.dailyPomos[dateKey] = {
            count: oldData.count + increment,
            // diff 可以在这里不设置，或设为 increment
            diff: increment,
          };
          totalIncrement += increment;
        }
      }

      // 2. 更新 globalPomoCount
      if (totalIncrement > 0) {
        this.globalPomoCount += totalIncrement;
        console.log(
          `[Pinia Action]: 全局番茄钟总数增加了 ${totalIncrement}，新值为 ${this.globalPomoCount}`
        );
      }

      // 3. !!! 最关键的一步：手动持久化变更 !!!
      localStorage.setItem(
        STORAGE_KEYS.DAILY_POMOS,
        JSON.stringify(this.dailyPomos)
      );
      localStorage.setItem(
        STORAGE_KEYS.GLOBAL_POMO_COUNT,
        this.globalPomoCount.toString()
      );

      console.log(
        "[Pinia Action]: dailyPomos 和 globalPomoCount 已成功持久化到 localStorage。"
      );
    },
  },
});
