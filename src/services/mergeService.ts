// 不再有用，我不做增量了
import { STORAGE_KEYS } from "@/core/constants";
import { loadData, saveData } from "@/services/localStorageService";

// 合并策略枚举
export const MERGE_STRATEGIES = {
  ARRAY_WITH_ID: "ARRAY_WITH_ID", // 时间戳ID数组合并
  ARRAY_MERGE_DEDUP: "ARRAY_MERGE_DEDUP", // 数组合并+按名称去重
} as const;

// 合并配置
export const MERGE_KEYS = {
  // 策略1：数组合并（时间戳ID，几乎不会冲突）
  [STORAGE_KEYS.ACTIVITY]: {
    strategy: MERGE_STRATEGIES.ARRAY_WITH_ID,
    idField: "id",
  },
  [STORAGE_KEYS.TODO]: {
    strategy: MERGE_STRATEGIES.ARRAY_WITH_ID,
    idField: "id",
    afterMerge: "RECALCULATE_DAILY_POMOS",
  },
  [STORAGE_KEYS.SCHEDULE]: {
    strategy: MERGE_STRATEGIES.ARRAY_WITH_ID,
    idField: "id",
  },
  [STORAGE_KEYS.TASK]: {
    strategy: MERGE_STRATEGIES.ARRAY_WITH_ID,
    idField: "id",
  },

  // 策略2：数组合并+去重（ID+名称双重验证）
  [STORAGE_KEYS.WRITING_TEMPLATE]: {
    strategy: MERGE_STRATEGIES.ARRAY_MERGE_DEDUP,
    idField: "id",
    dedupeBy: "name",
  },
  [STORAGE_KEYS.TAG]: {
    strategy: MERGE_STRATEGIES.ARRAY_MERGE_DEDUP,
    idField: "id",
    dedupeBy: "name",
  },
} as const;

// 合并结果类型
interface MergeResult {
  success: boolean;
  mergedData: Record<string, any>;
  conflicts: Array<{
    key: string;
    localCount: number;
    cloudCount: number;
    mergedCount: number;
  }>;
  needsRecalculation: string[]; // 需要重新计算的数据类型
}

// 主要的合并服务类
class MergeService {
  /**
   * 合并本地和云端数据
   * @param localData 本地数据
   * @param cloudData 云端数据
   * @returns 合并结果
   */
  public mergeData(
    localData: Record<string, any>,
    cloudData: Record<string, any>
  ): MergeResult {
    const mergedData: Record<string, any> = {};
    const conflicts: MergeResult["conflicts"] = [];
    const needsRecalculation: string[] = [];

    // 遍历所有需要合并的键
    for (const [storageKey, config] of Object.entries(MERGE_KEYS)) {
      const localValue = localData[storageKey];
      const cloudValue = cloudData[storageKey];

      try {
        const mergeResult = this.mergeByStrategy(
          localValue,
          cloudValue,
          config.strategy,
          config
        );

        mergedData[storageKey] = mergeResult.data;

        // 记录冲突信息
        if (mergeResult.hasConflict) {
          conflicts.push({
            key: storageKey,
            localCount: this.getDataCount(localValue),
            cloudCount: this.getDataCount(cloudValue),
            mergedCount: this.getDataCount(mergeResult.data),
          });
        }

        // 检查是否需要重新计算
        if ((config as any).afterMerge === "RECALCULATE_DAILY_POMOS") {
          needsRecalculation.push("DAILY_POMOS");
        }
      } catch (error) {
        console.error(`合并 ${storageKey} 时出错:`, error);
        // 出错时优先使用本地数据
        mergedData[storageKey] = localValue || cloudValue || [];
      }
    }

    return {
      success: true,
      mergedData,
      conflicts,
      needsRecalculation,
    };
  }

  /**
   * 根据策略合并数据
   */
  private mergeByStrategy(
    localValue: any,
    cloudValue: any,
    strategy: string,
    config: any
  ): { data: any; hasConflict: boolean } {
    // 处理空值情况
    const local = Array.isArray(localValue) ? localValue : [];
    const cloud = Array.isArray(cloudValue) ? cloudValue : [];

    switch (strategy) {
      case MERGE_STRATEGIES.ARRAY_WITH_ID:
        return this.mergeArrayWithId(local, cloud, config.idField);

      case MERGE_STRATEGIES.ARRAY_MERGE_DEDUP:
        return this.mergeArrayWithDedup(
          local,
          cloud,
          config.idField,
          config.dedupeBy
        );

      default:
        console.warn(`未知的合并策略: ${strategy}`);
        return { data: local, hasConflict: false };
    }
  }

  /**
   * 按ID合并数组（时间戳ID策略）
   */
  private mergeArrayWithId(
    localArray: any[],
    cloudArray: any[],
    idField: string
  ): { data: any[]; hasConflict: boolean } {
    const merged: any[] = [...localArray];
    const localIds = new Set(localArray.map((item) => item[idField]));
    let hasConflict = false;

    // 添加云端独有的项目
    for (const cloudItem of cloudArray) {
      if (!localIds.has(cloudItem[idField])) {
        merged.push(cloudItem);
        hasConflict = true; // 有新数据算作冲突
      }
    }

    return {
      data: merged,
      hasConflict: hasConflict || cloudArray.length !== localArray.length,
    };
  }

  /**
   * 按ID合并数组并按名称去重
   */
  private mergeArrayWithDedup(
    localArray: any[],
    cloudArray: any[],
    idField: string,
    dedupeField: string
  ): { data: any[]; hasConflict: boolean } {
    // 先按ID合并
    const { data: merged, hasConflict: idConflict } = this.mergeArrayWithId(
      localArray,
      cloudArray,
      idField
    );

    // 再按名称去重（保留第一个出现的）
    const seenNames = new Set<string>();
    const dedupedData: any[] = [];
    let hasNameConflict = false;

    for (const item of merged) {
      const nameValue = item[dedupeField];
      if (!seenNames.has(nameValue)) {
        seenNames.add(nameValue);
        dedupedData.push(item);
      } else {
        hasNameConflict = true;
      }
    }

    return {
      data: dedupedData,
      hasConflict: idConflict || hasNameConflict,
    };
  }

  /**
   * 获取数据项数量（用于冲突报告）
   */
  private getDataCount(data: any): number {
    if (Array.isArray(data)) {
      return data.length;
    }
    return data ? 1 : 0;
  }

  /**
   * 将合并后的数据保存到本地存储
   */
  public async saveMergedData(mergedData: Record<string, any>): Promise<void> {
    for (const [storageKey, data] of Object.entries(mergedData)) {
      try {
        saveData(storageKey, data);
      } catch (error) {
        console.error(`保存 ${storageKey} 到本地存储时出错:`, error);
      }
    }
  }

  /**
   * 触发重新计算（如 dailyPomos）
   */
  public async triggerRecalculations(
    needsRecalculation: string[]
  ): Promise<void> {
    for (const calcType of needsRecalculation) {
      switch (calcType) {
        case "DAILY_POMOS":
          await this.recalculateDailyPomos();
          break;
        default:
          console.warn(`未知的重计算类型: ${calcType}`);
      }
    }
  }

  /**
   * 重新计算 dailyPomos
   */
  private async recalculateDailyPomos(): Promise<void> {
    try {
      // 动态导入 pomo store，避免循环依赖
      // const { usePomoStore } = await import("@/stores/usePomoStore");
      // const pomoStore = usePomoStore();

      // 这里需要根据你的实际逻辑来重新计算
      // 可能需要重新加载所有日期的 todos 并调用 setTodosForDate
      console.log("重新计算 dailyPomos...");

      // 示例：如果你有方法可以获取所有日期的 todos
      // for (const [dateStr, todos] of Object.entries(allTodosByDate)) {
      //   pomoStore.setTodosForDate(dateStr, todos);
      // }
    } catch (error) {
      console.error("重新计算 dailyPomos 时出错:", error);
    }
  }

  /**
   * 获取当前本地所有需要同步的数据
   */
  public getCurrentLocalData(): Record<string, any> {
    const localData: Record<string, any> = {};

    for (const storageKey of Object.keys(MERGE_KEYS)) {
      localData[storageKey] = loadData(storageKey, []);
    }

    return localData;
  }
}

// 导出单例实例
export const mergeService = new MergeService();
