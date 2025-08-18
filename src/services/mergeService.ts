// services/mergeService.ts 导入并合并数据
import { STORAGE_KEYS } from "@/core/constants";
import { loadData, saveData } from "@/services/localStorageService";
import { usePomoStore } from "@/stores/usePomoStore";
import { Todo } from "@/core/types/Todo";

// 合并策略枚举
export const MERGE_STRATEGIES = {
  SKIP: "SKIP", // 跳过 跳过importDt
  REPLACE: "REPLACE", // 替换 importDt整体替换
  ARRAY_WITH_ID: "ARRAY_WITH_ID", // 时间戳ID数组合并
  ARRAY_MERGE_DEDUP: "ARRAY_MERGE_DEDUP", // 数组合并+按名称去重
} as const;

// 合并配置
export const MERGE_KEYS = {
  // 策略1：数组合并（时间戳ID，冲突就跳过）
  [STORAGE_KEYS.ACTIVITY]: {
    strategy: MERGE_STRATEGIES.ARRAY_WITH_ID,
    idField: "id",
  },
  [STORAGE_KEYS.SCHEDULE]: {
    strategy: MERGE_STRATEGIES.ARRAY_WITH_ID,
    idField: "id",
  },
  [STORAGE_KEYS.TASK]: {
    strategy: MERGE_STRATEGIES.ARRAY_WITH_ID,
    idField: "id",
  },

  // 策略2：数组合并（时间戳ID，冲突就跳过，合并就启动计算）
  [STORAGE_KEYS.TODO]: {
    strategy: MERGE_STRATEGIES.ARRAY_WITH_ID,
    idField: "id",
    afterMerge: "RECALCULATE_DAILY_POMOS",
  },

  // 策略3：数组合并+去重（ID+名称双重验证）
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

  // 策略4：跳过
  [STORAGE_KEYS.DAILY_POMOS]: {
    strategy: MERGE_STRATEGIES.SKIP,
  },
  [STORAGE_KEYS.GLOBAL_POMO_COUNT]: {
    strategy: MERGE_STRATEGIES.SKIP,
  },

  // 策略5：替换
  [STORAGE_KEYS.GLOBAL_SETTINGS]: {
    strategy: MERGE_STRATEGIES.REPLACE,
  },
  [STORAGE_KEYS.TIMETABLE_ENTERTAINMENT]: {
    strategy: MERGE_STRATEGIES.REPLACE,
  },
  [STORAGE_KEYS.TIMETABLE_WORK]: {
    strategy: MERGE_STRATEGIES.REPLACE,
  },
} as const;

// 合并结果类型
interface MergeResult {
  success: boolean;
  mergedData: Record<string, any>;
  conflicts: Array<{
    key: string;
    localCount: number;
    importCount: number;
    mergedCount: number;
  }>;
  needsRecalculation: string[]; // 需要重新计算的数据类型
}

// 文件名到 STORAGE_KEYS 的映射表（基于 STORAGE_KEYS 的实际值调整）
const FILE_TO_KEY_MAP: Record<string, string> = {
  "activitySheet.json": STORAGE_KEYS.ACTIVITY,
  "todaySchedule.json": STORAGE_KEYS.SCHEDULE,
  "taskTrack.json": STORAGE_KEYS.TASK,
  "todayTodo.json": STORAGE_KEYS.TODO,
  "writingTemplate.json": STORAGE_KEYS.WRITING_TEMPLATE,
  "tag.json": STORAGE_KEYS.TAG,
  "dailyPomos.json": STORAGE_KEYS.DAILY_POMOS, // 策略 SKIP
  "globalPomoCount.json": STORAGE_KEYS.GLOBAL_POMO_COUNT, // 策略 SKIP
  "globalSettings.json": STORAGE_KEYS.GLOBAL_SETTINGS,
  "timeTableBlocks_entertainment.json": STORAGE_KEYS.TIMETABLE_ENTERTAINMENT,
  "timeTableBlocks_work.json": STORAGE_KEYS.TIMETABLE_WORK,
  // 添加更多（如有其他 key）...
};

// 新增：根据 key 返回合适的 defaultValue
function getDefaultForKey(key: string): any {
  switch (key) {
    // 数组类型
    case STORAGE_KEYS.ACTIVITY:
    case STORAGE_KEYS.SCHEDULE:
    case STORAGE_KEYS.TASK:
    case STORAGE_KEYS.TODO:
    case STORAGE_KEYS.WRITING_TEMPLATE:
    case STORAGE_KEYS.TAG:
    case STORAGE_KEYS.TIMETABLE_ENTERTAINMENT:
    case STORAGE_KEYS.TIMETABLE_WORK:
      return [];
    // 对象类型
    case STORAGE_KEYS.DAILY_POMOS:
    case STORAGE_KEYS.GLOBAL_SETTINGS:
      return {};
    // 数字类型
    case STORAGE_KEYS.GLOBAL_POMO_COUNT:
      return 0;
    // 默认（未知 key）
    default:
      return null;
  }
}

// 主要的合并服务函数
export async function handleFileImport(
  files: Array<{ filename: string; content: string }>
): Promise<MergeResult> {
  const result: MergeResult = {
    success: true,
    mergedData: {},
    conflicts: [],
    needsRecalculation: [],
  };

  for (const file of files) {
    const key = FILE_TO_KEY_MAP[file.filename]; // 根据文件名映射 key
    if (!key) {
      console.warn(`Unknown file: ${file.filename}, skipping.`);
      continue;
    }

    let importData;
    try {
      importData = JSON.parse(file.content); // 解析文件内容
    } catch (e) {
      console.error(`Parse error for ${file.filename}: ${e}`);
      result.success = false;
      continue;
    }

    // 加载本地数据（提供 defaultValue，如果没有数据，直接返回 defaultValue）
    const defaultValue = getDefaultForKey(key);
    const localData = loadData(key, defaultValue);

    const config = MERGE_KEYS[key as keyof typeof MERGE_KEYS];
    if (!config) {
      console.warn(`No config for key: ${key}, skipping.`);
      continue;
    }

    // 应用合并策略
    const mergeResult = mergeByStrategy(
      localData,
      importData,
      config.strategy,
      config
    );

    // 检查并收集冲突
    if (mergeResult.hasConflict) {
      result.conflicts.push({
        key,
        localCount: getDataCount(localData),
        importCount: getDataCount(importData),
        mergedCount: getDataCount(mergeResult.data),
      });
    }

    // 保存合并结果
    saveData(key, mergeResult.data);
    result.mergedData[key] = mergeResult.data;

    // 收集 afterMerge
    if (config as any) {
      result.needsRecalculation.push((config as any).afterMerge);
    }
  }

  // 统一处理 afterMerge（如重算 Daily/Global）
  await triggerRecalculations(result.needsRecalculation);

  return result;
}

/**
 * 根据策略合并数据
 */
function mergeByStrategy(
  localValue: any,
  importValue: any,
  strategy: string,
  config: any
): { data: any; hasConflict: boolean } {
  // 处理空值情况
  const localDt = Array.isArray(localValue) ? localValue : [];
  const importDt = Array.isArray(importValue) ? importValue : [];

  switch (strategy) {
    case MERGE_STRATEGIES.SKIP:
      return { data: localDt, hasConflict: false };
    case MERGE_STRATEGIES.REPLACE:
      return {
        data: importDt,
        hasConflict: localDt.length !== importDt.length,
      };
    case MERGE_STRATEGIES.ARRAY_WITH_ID:
      return mergeArrayWithId(localDt, importDt, config.idField);
    case MERGE_STRATEGIES.ARRAY_MERGE_DEDUP:
      return mergeArrayWithDedup(
        localDt,
        importDt,
        config.idField,
        config.dedupeBy
      );
    default:
      console.warn(`未知的合并策略: ${strategy}`);
      return { data: localDt, hasConflict: false };
  }
}

/**
 * 按ID合并数组（时间戳ID策略）
 */
function mergeArrayWithId(
  localArray: any[],
  importArray: any[],
  idField: string
): { data: any[]; hasConflict: boolean } {
  const merged: any[] = [...localArray];
  const localIds = new Set(localArray.map((item) => item[idField]));
  let hasConflict = false;

  // 添加导入独有的项目
  for (const importItem of importArray) {
    if (!localIds.has(importItem[idField])) {
      merged.push(importItem);
      hasConflict = true; // 有新数据算作冲突
    }
  }

  return {
    data: merged,
    hasConflict: hasConflict || importArray.length !== localArray.length,
  };
}

/**
 * 按ID合并数组并按名称去重
 */
function mergeArrayWithDedup(
  localArray: any[],
  importArray: any[],
  idField: string,
  dedupeField: string
): { data: any[]; hasConflict: boolean } {
  // 先按ID合并
  const { data: merged, hasConflict: idConflict } = mergeArrayWithId(
    localArray,
    importArray,
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
function getDataCount(data: any): number {
  if (Array.isArray(data)) {
    return data.length;
  }
  return data ? 1 : 0;
}

/**
 * 触发重新计算（如 dailyPomos）
 */
async function triggerRecalculations(
  needsRecalculation: string[]
): Promise<void> {
  const uniqueNeeds = [...new Set(needsRecalculation)]; // 去重
  for (const calcType of uniqueNeeds) {
    switch (calcType) {
      case "RECALCULATE_DAILY_POMOS":
        await recalculateDailyPomos();
        break;
      default:
        console.warn(`未知的重计算类型: ${calcType}`);
    }
  }
}

/**
 * 重新计算 dailyPomos
 */
async function recalculateDailyPomos(): Promise<void> {
  try {
    const pomoStore = usePomoStore();
    const allTodos = loadData(STORAGE_KEYS.TODO, []) as Todo[];

    // 清空旧数据
    pomoStore.todosByDate = {};
    pomoStore.dailyPomos = {};

    // 按日期分组
    const grouped = groupByDate(allTodos);

    // 逐日更新（不触发 global 增量）
    for (const [dateStr, todos] of Object.entries(grouped)) {
      pomoStore.todosByDate[dateStr] = todos;
      const count = todos.filter((t) => t.pomoType === "🍅").length;
      pomoStore.dailyPomos[dateStr] = { count };
    }

    // 统一更新 global
    pomoStore.globalPomoCount = Object.values(pomoStore.dailyPomos).reduce(
      (s, d) => s + (d?.count || 0),
      0
    );

    // 持久化
    localStorage.setItem(
      STORAGE_KEYS.DAILY_POMOS,
      JSON.stringify(pomoStore.dailyPomos)
    );
    localStorage.setItem(
      STORAGE_KEYS.GLOBAL_POMO_COUNT,
      String(pomoStore.globalPomoCount)
    );

    console.log("dailyPomos 重新计算完成");
  } catch (error) {
    console.error("重新计算 dailyPomos 时出错:", error);
  }
}

// 示例 groupByDate 函数（自定义，根据 Todo 字段分组）
function groupByDate(todos: Todo[]): Record<string, Todo[]> {
  const grouped: Record<string, Todo[]> = {};
  for (const todo of todos) {
    // 假设使用 dueDate 或 startTime 转换为 dateStr (YYYY-MM-DD)
    const date = new Date(todo.dueDate || todo.startTime || Date.now());
    const dateStr = date.toISOString().split("T")[0];
    if (!grouped[dateStr]) grouped[dateStr] = [];
    grouped[dateStr].push(todo);
  }
  return grouped;
}

/**
 * 获取当前本地所有需要同步的数据
 */
export function getCurrentLocalData(): Record<string, any> {
  const localData: Record<string, any> = {};

  for (const storageKey of Object.keys(MERGE_KEYS)) {
    const defaultValue = getDefaultForKey(storageKey);
    localData[storageKey] = loadData(storageKey, defaultValue);
  }

  return localData;
}
