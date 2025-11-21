// services/mergeService.ts 导入并合并数据
import { STORAGE_KEYS } from "@/core/constants";
import { loadData, saveData } from "@/services/localStorageService";
import { readTextFile } from "@tauri-apps/plugin-fs";
import { deduplicateData, migrateTaskSource } from "@/services/migrationService";

// 定义文件处理结果的详细类型
export interface FileProcessResult {
  fileName: string; // 处理的文件名
  storageKey: string; // 对应的 localStorage Key
  status: "SUCCESS" | "SKIPPED" | "EMPTY" | "ERROR"; // 处理状态
  strategy: string; // 使用的合并策略
  addedCount: number; // 新增的项目数量
  skippedCount: number; // 因重复而跳过的项目数量
  idConflictCount: number; // 发生ID冲突并重新生成ID的数量
  message: string; // 一段总结信息
}

// 新增：定义整个导入操作的总结报告类型
export interface ImportReport {
  overallStatus: "COMPLETE" | "PARTIAL_ERROR" | "FATAL_ERROR"; // 总体状态
  results: FileProcessResult[]; // 每个文件的处理结果数组
  shouldReload: boolean; // 是否需要刷新UI
}

// 合并策略枚举
export const MERGE_STRATEGIES = {
  SKIP: "SKIP", // 跳过导入数据
  REPLACE: "REPLACE", // 替换
  ARRAY_WITH_ID: "ARRAY_WITH_ID", // 时间戳ID数组合并
  ARRAY_MERGE_DEDUP: "ARRAY_MERGE_DEDUP", // 数组合并+按名称去重
} as const;

// 合并配置
export const MERGE_KEYS = {
  // 策略1：跳过导入数据，保留本地
  [STORAGE_KEYS.GLOBAL_SETTINGS]: {
    strategy: MERGE_STRATEGIES.SKIP,
  },

  // 策略2：数组去重合并（ID+名称双重验证）
  // 优先保留本地数据：
  // - ID和名称都不同 → 添加
  // - ID和名称都相同 → 跳过
  // - ID不同但名称相同 → 跳过
  // - ID相同但名称不同 → 为导入项分配新ID后添加
  [STORAGE_KEYS.WRITING_TEMPLATE]: {
    strategy: MERGE_STRATEGIES.ARRAY_MERGE_DEDUP,
    idField: "id",
    dedupeBy: "title",
  },
  [STORAGE_KEYS.TAG]: {
    strategy: MERGE_STRATEGIES.ARRAY_MERGE_DEDUP,
    idField: "id",
    dedupeBy: "name",
  },

  // 策略3：时间戳ID数组合并（ID冲突则跳过）
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
  [STORAGE_KEYS.TODO]: {
    strategy: MERGE_STRATEGIES.ARRAY_WITH_ID,
    idField: "id",
  },
  [STORAGE_KEYS.TIMETABLE_BLOCKS]: {
    strategy: MERGE_STRATEGIES.ARRAY_WITH_ID,
    idField: "id",
  },
} as const;

// 文件名到 STORAGE_KEYS 的映射表
const FILE_TO_KEY_MAP: Record<string, string> = {
  "activitySheet.json": STORAGE_KEYS.ACTIVITY,
  "todaySchedule.json": STORAGE_KEYS.SCHEDULE,
  "taskTrack.json": STORAGE_KEYS.TASK,
  "todayTodo.json": STORAGE_KEYS.TODO,
  "writingTemplate.json": STORAGE_KEYS.WRITING_TEMPLATE,
  "tag.json": STORAGE_KEYS.TAG,
  "globalSettings.json": STORAGE_KEYS.GLOBAL_SETTINGS,
  "timeTableBlocks.json": STORAGE_KEYS.TIMETABLE_BLOCKS,
};

// 合并策略函数
async function mergeSkip(storageKey: string, _importData: any): Promise<void> {
  console.log(`[${storageKey}]: 策略为跳过 (SKIP)，不进行任何操作。`);
  return;
}

type DataItem = Record<string, any>;

async function mergeArrayWithId(
  storageKey: string,
  importData: any[],
  idField: string
): Promise<{ itemsToAdd: DataItem[]; itemsToSkip: DataItem[] }> {
  console.log(`[${storageKey}]: 策略为数组合并 (ARRAY_WITH_ID)，ID字段为 '${idField}'。`);
  const localData: DataItem[] = loadData<DataItem[]>(storageKey) || [];
  const existingIds = new Set(localData.map((item) => item[idField]));

  const itemsToAdd: DataItem[] = [];
  const itemsToSkip: DataItem[] = [];
  const now = Date.now();

  importData.forEach((importItem) => {
    const id = importItem[idField];
    if (id === undefined || existingIds.has(id)) {
      itemsToSkip.push(importItem);
    } else {
      // 补充必要字段（防止旧数据缺少 synced/deleted/lastModified）
      itemsToAdd.push({
        ...importItem,
        synced: false,
        deleted: importItem.deleted ?? false,
        lastModified: importItem.lastModified ?? now,
      });
    }
  });

  if (itemsToAdd.length > 0) {
    const mergedData = [...localData, ...itemsToAdd];
    saveData(storageKey, mergedData);
    console.log(`[${storageKey}]: 合并完成。新增 ${itemsToAdd.length} 项，总数变为 ${mergedData.length}。`);
  } else {
    console.log(`[${storageKey}]: 无新项目可合并。`);
  }
  return { itemsToAdd, itemsToSkip };
}

/**
 * 策略：数组去重合并。对比导入数据和本地数据，基于去重字段进行合并。
 * 处理两种核心冲突：
 * 1. 名称相同，ID不同 → 判定为同一项，保留本地项
 * 2. 名称不同，ID相同 → 判定为ID冲突，为导入项生成新ID后添加
 */
async function mergeArrayDedupe(
  storageKey: string,
  importData: DataItem[],
  idField: string,
  dedupeBy: string
): Promise<{
  itemsToAdd: DataItem[];
  itemsToSkip: DataItem[];
  idConflictCount: number;
}> {
  console.log(`[${storageKey}]: 执行数组去重合并策略，ID字段：'${idField}', 去重字段：'${dedupeBy}'。`);

  const localData: DataItem[] = loadData(storageKey, []);

  const localNameMap = new Map<string, DataItem>();
  const localIdSet = new Set<string>();

  for (const item of localData) {
    if (item[dedupeBy]) {
      localNameMap.set(item[dedupeBy], item);
    }
    if (item[idField]) {
      localIdSet.add(item[idField]);
    }
  }

  const itemsToAdd: DataItem[] = [];
  const itemsToSkip: DataItem[] = [];
  const now = Date.now();
  let idConflictCount = 0;

  for (const importItem of importData) {
    const importName = importItem[dedupeBy];
    const importId = importItem[idField];

    if (!importName || !importId) {
      console.warn(`[${storageKey}]: 发现一个导入项缺少'${dedupeBy}'或'${idField}'字段，已跳过。`, importItem);
      continue;
    }

    // 补充必要字段
    const normalizedItem: DataItem = {
      ...importItem,
      synced: false,
      deleted: importItem.deleted ?? false,
      lastModified: importItem.lastModified ?? now,
    };

    // 情况一：ID 已存在 (ID Collision)
    if (localIdSet.has(importId)) {
      const localItemWithId = localData.find((item) => item[idField] === importId);

      if (localItemWithId) {
        // ID相同，Name也相同 → 完全重复，跳过
        if (importName === localItemWithId[dedupeBy]) {
          itemsToSkip.push(normalizedItem);
          continue;
        }
        // ID相同，Name不同 → ID冲突
        else {
          console.warn(
            `[${storageKey}]: **ID冲突** ID "${importId}" 已被本地项目 "${localItemWithId[dedupeBy]}" 使用。` +
              `将为导入项目 "${importName}" 分配一个新ID。`
          );
          idConflictCount++;
          normalizedItem[idField] = Date.now();
          itemsToAdd.push(normalizedItem);
          localIdSet.add(normalizedItem[idField]);
        }
      }
    }
    // 情况二：ID 不存在 → 直接添加
    else {
      itemsToAdd.push(normalizedItem);
      localIdSet.add(importId);
    }
  }

  if (itemsToAdd.length > 0) {
    const mergedData = [...localData, ...itemsToAdd];
    saveData(storageKey, mergedData);
    console.log(`[${storageKey}]: 合并完成。新增 ${itemsToAdd.length} 项，总数变为 ${mergedData.length}。`);
  } else {
    console.log(`[${storageKey}]: 无新项目可合并或更新。`);
  }
  return { itemsToAdd, itemsToSkip, idConflictCount };
}

// 主要的合并服务函数
export async function handleFileImport(fileMap: { [fileName: string]: string }): Promise<ImportReport> {
  // 1. 初始化报告对象
  const report: ImportReport = {
    overallStatus: "COMPLETE",
    results: [],
    shouldReload: false,
  };

  const allKeys = Object.keys(MERGE_KEYS);

  for (const fileName in fileMap) {
    if (Object.prototype.hasOwnProperty.call(fileMap, fileName)) {
      const storageKey = FILE_TO_KEY_MAP[fileName];
      const filePath = fileMap[fileName];

      // 初始化当前文件的处理结果
      const fileResult: FileProcessResult = {
        fileName,
        storageKey: storageKey || "N/A",
        status: "SKIPPED",
        strategy: "N/A",
        addedCount: 0,
        skippedCount: 0,
        idConflictCount: 0,
        message: `文件 "${fileName}" 不在预设的合并配置中，已被跳过。`,
      };

      // 1. 检查文件名是否在处理映射表中
      if (!storageKey || !allKeys.includes(storageKey)) {
        console.warn(`文件 "${fileName}" 不在预设的合并配置中，将被跳过。`);
        report.results.push(fileResult);
        continue;
      }

      const config = MERGE_KEYS[storageKey as keyof typeof MERGE_KEYS];

      fileResult.strategy = config.strategy;

      try {
        // 2. 读取文件内容
        const fileContent = await readTextFile(filePath);
        if (!fileContent) {
          fileResult.status = "EMPTY";
          fileResult.message = `文件 "${fileName}" 内容为空。`;
          console.warn(`文件 "${fileName}" 内容为空，跳过处理。`);
          report.results.push(fileResult);
          continue;
        }

        const importData = JSON.parse(fileContent);
        let itemsToAdd: DataItem[] = [];
        let itemsToSkip: DataItem[] = [];
        let idConflicts = 0;

        switch (config.strategy) {
          case MERGE_STRATEGIES.SKIP:
            await mergeSkip(storageKey, importData);
            fileResult.status = "SKIPPED";
            fileResult.message = "策略为跳过，未做任何操作。";
            break;

          case MERGE_STRATEGIES.ARRAY_WITH_ID:
            if (!Array.isArray(importData)) {
              console.error(`数据错误: ${fileName} 的内容不是一个数组，无法使用 ARRAY_WITH_ID 策略。`);
              fileResult.status = "ERROR";
              fileResult.message = "数据格式错误：不是数组";
              break;
            }
            // @ts-ignore
            const resultWithId = await mergeArrayWithId(storageKey, importData, config.idField);
            itemsToAdd = resultWithId.itemsToAdd;
            itemsToSkip = resultWithId.itemsToSkip;
            break;

          case MERGE_STRATEGIES.ARRAY_MERGE_DEDUP:
            if (!Array.isArray(importData)) {
              console.error(`数据错误: ${fileName} 的内容不是一个数组，无法使用 ARRAY_MERGE_DEDUP 策略。`);
              fileResult.status = "ERROR";
              fileResult.message = "数据格式错误：不是数组";
              break;
            }
            // @ts-ignore
            const resultDedupe = await mergeArrayDedupe(storageKey, importData, config.idField, config.dedupeBy);
            itemsToAdd = resultDedupe.itemsToAdd;
            itemsToSkip = resultDedupe.itemsToSkip;
            idConflicts = resultDedupe.idConflictCount;
            break;

          default:
            console.warn(`未知的合并策略: ${storageKey}`);
            fileResult.status = "ERROR";
            fileResult.message = "未知的合并策略";
            break;
        }

        if (fileResult.status !== "ERROR" && fileResult.status !== "SKIPPED") {
          fileResult.status = "SUCCESS";
          fileResult.addedCount = itemsToAdd.length;
          fileResult.skippedCount = itemsToSkip.length;
          fileResult.idConflictCount = idConflicts;
          fileResult.message = `成功处理: 新增 ${itemsToAdd.length} 项, 跳过 ${itemsToSkip.length} 项, ID冲突 ${idConflicts} 项。`;

          // 如果有任何数据被添加或更新，则认为需要刷新
          if (itemsToAdd.length > 0 || idConflicts > 0) {
            report.shouldReload = true;
          }
        }
      } catch (error: any) {
        console.error(`处理文件 "${fileName}" 时发生错误:`, error);
        report.overallStatus = "PARTIAL_ERROR";
        fileResult.status = "ERROR";
        fileResult.message = `处理时发生错误: ${error.message}`;
      }
      report.results.push(fileResult);
    }
  }

  if (report.overallStatus === "PARTIAL_ERROR" && report.results.every((r) => r.status === "ERROR")) {
    report.overallStatus = "FATAL_ERROR";
  }

  // 所有文件处理完后，运行 task source migration
  const migrationReport: { migrated: string[]; errors: string[]; cleaned: string[] } = {
    migrated: [],
    errors: [],
    cleaned: [],
  };
  console.log("🚀 [Import] 开始修复 task source 字段...");
  deduplicateData(STORAGE_KEYS.TASK, migrationReport);
  migrateTaskSource(migrationReport);

  if (migrationReport.migrated.length > 0) {
    console.log("✅ [Import] 已自动修复 task source 字段");
  }
  if (migrationReport.errors.length > 0) {
    console.warn("⚠️ [Import] Task source 修复警告:", migrationReport.errors);
  }

  console.log("所有文件处理完毕，生成报告:", report);
  return report;
}
