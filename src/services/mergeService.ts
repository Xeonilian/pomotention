// services/mergeService.ts 导入并合并数据
import { STORAGE_KEYS } from "@/core/constants";
import { loadData, saveData } from "@/services/localStorageService";
import { readTextFile } from "@tauri-apps/plugin-fs";

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
  SKIP: "SKIP", // 跳过 跳过importDt
  REPLACE: "REPLACE", // 替换 importDt整体替换
  ARRAY_WITH_ID: "ARRAY_WITH_ID", // 时间戳ID数组合并
  ARRAY_MERGE_DEDUP: "ARRAY_MERGE_DEDUP", // 数组合并+按名称去重
} as const;

// 合并配置
export const MERGE_KEYS = {
  // 策略1：跳过
  [STORAGE_KEYS.DAILY_POMOS]: {
    strategy: MERGE_STRATEGIES.SKIP,
  },

  [STORAGE_KEYS.GLOBAL_SETTINGS]: {
    strategy: MERGE_STRATEGIES.SKIP,
  },
  [STORAGE_KEYS.TIMETABLE_ENTERTAINMENT]: {
    strategy: MERGE_STRATEGIES.SKIP,
  },
  [STORAGE_KEYS.TIMETABLE_WORK]: {
    strategy: MERGE_STRATEGIES.SKIP,
  },
  // 策略2：数组合并+去重（ID+名称双重验证），会发生ID占用，
  // A App数据，B 导入数据，默认A优先
  // id=!id name=!name，KEEP
  // id=id name=name，SKIP
  // [未使用]
  // id=!id name=name， SKIP
  // id=id name!=name， 保留 B，赋予新id；
  [STORAGE_KEYS.WRITING_TEMPLATE]: {
    strategy: MERGE_STRATEGIES.ARRAY_MERGE_DEDUP,
    idField: "id",
    dedupeBy: "title",
  },
  // [B已使用]
  // id=!id name=name， SKIP 但是 B set 找到 ActivitySheet里面的 B set id 替换为 A set id
  // id=id name!=name， 保留 B，赋予新id； 但是 B set 找到 ActivitySheet里面的 B set id 替换为 A set id
  [STORAGE_KEYS.TAG]: {
    strategy: MERGE_STRATEGIES.ARRAY_MERGE_DEDUP,
    idField: "id",
    dedupeBy: "name",
  },

  // 策略3：数组合并（时间戳ID，冲突就跳过）将内容追加到localStorage对应KEY中
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

  // 策略4：数组合并（时间戳ID，冲突就跳过，合并就启动计算）
  [STORAGE_KEYS.TODO]: {
    strategy: MERGE_STRATEGIES.ARRAY_WITH_ID,
    idField: "id",
  },

  // 策略5：替换 删除对应 KEY的localStorage
  // 然后存入新内容，这样很容易出错，把错误的信息完全替换，我还没有重置功能
} as const;

// 文件名到 STORAGE_KEYS 的映射表（基于 STORAGE_KEYS 的实际值调整）
const FILE_TO_KEY_MAP: Record<string, string> = {
  "activitySheet.json": STORAGE_KEYS.ACTIVITY,
  "todaySchedule.json": STORAGE_KEYS.SCHEDULE,
  "taskTrack.json": STORAGE_KEYS.TASK,
  "todayTodo.json": STORAGE_KEYS.TODO,
  "writingTemplate.json": STORAGE_KEYS.WRITING_TEMPLATE,
  "tag.json": STORAGE_KEYS.TAG,
  "globalSettings.json": STORAGE_KEYS.GLOBAL_SETTINGS,
  "timeTableBlocks.json": STORAGE_KEYS.TIMETABLE_BLOCKS,

  // 添加更多（如有其他 key）...
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

  importData.forEach((importItem) => {
    const id = importItem[idField];
    if (id === undefined || existingIds.has(id)) {
      itemsToSkip.push(importItem); // 如果ID已存在或无效，则计入跳过列表
    } else {
      itemsToAdd.push(importItem);
    }
  });

  // 4. 如果有新项目，则合并并一次性写回
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
 * 策略5：数组去重合并。该函数会对比导入数据和本地数据，基于一个去重字段（如'name'）进行合并。
 * 它能处理两种核心冲突：
 * 1. 名称相同，ID不同 -> 判定为同一项，保留本地项，并提示ID需要统一。
 * 2. 名称不同，ID相同 -> 判定为ID冲突，为导入项生成新ID后添加。
 *
 * @param storageKey - 正在操作的localStorage键名，用于日志输出。
 * @param importData - 从文件读取的导入数据数组。
 * @param idField - 作为唯一标识的字段名，通常是 "id"。
 * @param dedupeBy - 用于判断项目是否重复的核心业务字段名，例如 "name" 或 "title"。
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
  // 返回 void 因为所有操作（保存/日志）都在函数内部完成
  console.log(`[${storageKey}]: 执行数组去重合并策略，ID字段：'${idField}', 去重字段：'${dedupeBy}'。`);

  // 1. 加载本地数据
  const localData: DataItem[] = loadData(storageKey, []);

  // 2. MapId localNameMap: 用于通过名称快速查找本地的完整项目 { name -> {id, name, ...} }
  const localNameMap = new Map<string, DataItem>();
  // localIdSet: 用于快速判断某个ID是否已在本地存在
  const localIdSet = new Set<string>();

  for (const item of localData) {
    if (item[dedupeBy]) {
      localNameMap.set(item[dedupeBy], item);
    }
    if (item[idField]) {
      localIdSet.add(item[idField]);
    }
  }

  // 3. 遍历导入数据，识别冲突并准备新增列表
  const itemsToAdd: DataItem[] = []; // 存放最终需要被添加的新项目
  const itemsToSkip: DataItem[] = [];

  let idConflictCount = 0;

  for (const importItem of importData) {
    const importName = importItem[dedupeBy];
    const importId = importItem[idField];

    if (!importName || !importId) {
      console.warn(`[${storageKey}]: 发现一个导入项缺少'${dedupeBy}'或'${idField}'字段，已跳过。`, importItem);
      continue;
    }

    // 情况一：ID 已存在 (ID Collision)
    if (localIdSet.has(importId)) {
      // ID相同，需要检查 name 是否也相同
      const localItemWithId = localData.find((item) => item[idField] === importId);

      // 确保找到了本地项目（理论上 localIdSet.has(importId) 为 true 就一定能找到）
      if (localItemWithId) {
        // ID相同，Name也相同 -> 完全重复，跳过
        if (importName === localItemWithId[dedupeBy]) {
          itemsToSkip.push(importItem); // 一样所以两边都可能有count，所以要相加
          continue;
        }
        // ID相同，Name不同 -> ID冲突
        else {
          console.warn(
            `[${storageKey}]: **ID冲突** ID "${importId}" 已被本地项目 "${localItemWithId[dedupeBy]}" 使用。` +
              `将为导入项目 "${importName}" 分配一个新ID。`
          );
          idConflictCount++;
          // 修改导入项的ID为一个新的唯一值
          importItem[idField] = Date.now();

          // 将修改后的项加入待添加列表
          itemsToAdd.push(importItem);
          // 把新生成的ID也加入Set中，防止导入数据内部自己有重复ID导致后续逻辑出错
          localIdSet.add(importItem[idField]);
        }
      }
    }
    // 情况二：ID 不存在 -> 直接添加
    else {
      // ID是全新的，直接添加
      itemsToAdd.push(importItem);
      // 将此新ID加入Set，以正确处理后续导入项的ID检查
      localIdSet.add(importId);
    }
  }

  // 4. 将处理好的新增列表与本地数据合并，并保存
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
    shouldReload: false, // 默认为 false
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

          // case MERGE_STRATEGIES.REPLACE:
          //   await mergeReplace(storageKey, importData);
          //   break;

          case MERGE_STRATEGIES.ARRAY_WITH_ID:
            if (!Array.isArray(importData)) {
              console.error(`数据错误: ${fileName} 的内容不是一个数组，无法使用 ARRAY_WITH_ID 策略。`);
              continue;
            }
            // @ts-ignore
            const resultWithId = await mergeArrayWithId(storageKey, importData, config.idField);
            itemsToAdd = resultWithId.itemsToAdd;
            itemsToSkip = resultWithId.itemsToSkip;

            break;

          case MERGE_STRATEGIES.ARRAY_MERGE_DEDUP:
            if (!Array.isArray(importData)) {
              console.error(`数据错误: ${fileName} 的内容不是一个数组，无法使用 ARRAY_MERGE_DEDUP 策略。`);
              continue;
            }
            // @ts-ignore
            const resultDedupe = await mergeArrayDedupe(storageKey, importData, config.idField, config.dedupeBy);
            itemsToAdd = resultDedupe.itemsToAdd;
            itemsToSkip = resultDedupe.itemsToSkip;
            idConflicts = resultDedupe.idConflictCount;
            break;

          default:
            console.warn(`未知的合并策略: ${storageKey}`);
            break;
        }
        fileResult.status = "SUCCESS";
        fileResult.addedCount = itemsToAdd.length;
        fileResult.skippedCount = itemsToSkip.length;
        fileResult.idConflictCount = idConflicts;
        fileResult.message = `成功处理: 新增 ${itemsToAdd.length} 项, 跳过 ${itemsToSkip.length} 项, ID冲突 ${idConflicts} 项。`;

        // 如果有任何数据被添加或更新，则认为需要刷新
        if (itemsToAdd.length > 0 || idConflicts > 0) {
          report.shouldReload = true;
        }
      } catch (error: any) {
        console.error(`处理文件 "${fileName}" 时发生错误:`, error);
        report.overallStatus = "PARTIAL_ERROR"; // 发生任何错误，都标记为部分错误
        fileResult.status = "ERROR";
        fileResult.message = `处理时发生错误: ${error.message}`;
      }
      report.results.push(fileResult);
    }
  }
  if (report.overallStatus === "PARTIAL_ERROR" && report.results.every((r) => r.status === "ERROR")) {
    report.overallStatus = "FATAL_ERROR";
  }

  console.log("所有文件处理完毕，生成报告:", report);
  return report;
}
