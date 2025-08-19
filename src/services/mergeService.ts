// services/mergeService.ts 导入并合并数据
import { STORAGE_KEYS } from "@/core/constants";
import { loadData, saveData } from "@/services/localStorageService";
import { usePomoStore } from "@/stores/usePomoStore";
import { Todo } from "@/core/types/Todo";
import { readTextFile } from "@tauri-apps/plugin-fs";

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
  // [STORAGE_KEYS.GLOBAL_POMO_COUNT]: {
  //   strategy: MERGE_STRATEGIES.SKIP,
  // },

  // 策略2：替换 删除对应 KEY的localStorage
  // 然后存入新内容，这样很容易出错，把错误的信息完全替换，我还没有重置功能
  [STORAGE_KEYS.GLOBAL_SETTINGS]: {
    strategy: MERGE_STRATEGIES.SKIP,
  },
  [STORAGE_KEYS.TIMETABLE_ENTERTAINMENT]: {
    strategy: MERGE_STRATEGIES.SKIP,
  },
  [STORAGE_KEYS.TIMETABLE_WORK]: {
    strategy: MERGE_STRATEGIES.SKIP,
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
    afterMerge: "INCREMENTAL_UPDATE_POMOS",
  },

  // 策略5：数组合并+去重（ID+名称双重验证），会发生ID占用，
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
} as const;

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

// 合并策略函数
async function mergeSkip(storageKey: string, _importData: any): Promise<void> {
  console.log(`[${storageKey}]: 策略为跳过 (SKIP)，不进行任何操作。`);
  return;
}

// async function mergeReplace(
//   storageKey: string,
//   importData: any
// ): Promise<void> {
//   console.log(`[${storageKey}]: 策略为替换 (REPLACE)。`);
//   saveData(storageKey, importData); // 实际操作
// }

type DataItem = Record<string, any>;
async function mergeArrayWithId(
  storageKey: string,
  importData: any[],
  idField: string
): Promise<DataItem[]> {
  console.log(
    `[${storageKey}]: 策略为数组合并 (ARRAY_WITH_ID)，ID字段为 '${idField}'。`
  );
  const localData: DataItem[] = loadData<DataItem[]>(storageKey) || [];
  const existingIds = new Set(localData.map((item) => item[idField]));
  const itemsToAdd = importData.filter((importItem) => {
    const id = importItem[idField];
    // 如果导入项没有ID，或者ID已经存在，则过滤掉
    if (id === undefined || existingIds.has(id)) {
      return false;
    }
    return true;
  });

  // 4. 如果有新项目，则合并并一次性写回
  if (itemsToAdd.length > 0) {
    const mergedData = [...localData, ...itemsToAdd];
    saveData(storageKey, mergedData);
    console.log(
      `[${storageKey}]: 合并完成。新增 ${itemsToAdd.length} 项，总数变为 ${mergedData.length}。`
    );
  } else {
    console.log(`[${storageKey}]: 无新项目可合并。`);
  }
  return itemsToAdd;
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
): Promise<void> {
  // 返回 void 因为所有操作（保存/日志）都在函数内部完成
  console.log(
    `[${storageKey}]: 执行数组去重合并策略，ID字段：'${idField}', 去重字段：'${dedupeBy}'。`
  );

  // 1. 加载本地数据
  const localData: DataItem[] = loadData(storageKey, []);

  // 2. 为了高效查找，将本地数据处理成Map和Set
  // localNameMap: 用于通过名称快速查找本地的完整项目 { name -> {id, name, ...} }
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

  for (const importItem of importData) {
    const importName = importItem[dedupeBy];
    const importId = importItem[idField];

    // 如果导入项缺少关键的去重字段或ID字段，则跳过
    if (!importName || !importId) {
      console.warn(
        `[${storageKey}]: 发现一个导入项缺少'${dedupeBy}'或'${idField}'字段，已跳过。`,
        importItem
      );
      continue;
    }

    const localItemWithName = localNameMap.get(importName);

    // --- 开始判断冲突 ---

    // 情况一：名称已存在 (Name Collision)
    if (localItemWithName) {
      const localId = localItemWithName[idField];
      // 子情况：名称相同，ID也相同 -> 完全重复，直接跳过
      if (importId === localId) {
        // console.log(`[${storageKey}]: 名称为 "${importName}" 的项目完全相同，跳过。`);
      } else {
        // [核心冲突] 子情况：名称相同，ID不同 -> 保留本地项，跳过导入项，并发出日志提醒
        console.warn(
          `[${storageKey}]: **冲突提醒** 名称为 "${importName}" 的项目已存在，但ID不同。` +
            `本地ID为 "${localId}"，导入ID为 "${importId}"。` +
            `请检查使用旧ID "${importId}" 的数据，可能需要手动更新为 "${localId}"。`
        );
      }
      continue; // 跳过此导入项，不进行任何添加
    }

    // 情况二：名称不存在，但ID已存在 (ID Collision)
    if (localIdSet.has(importId)) {
      // [核心冲突] 为这个新名称的项目生成一个全新的ID
      const newId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.warn(
        `[${storageKey}]: **冲突提醒** 项目 "${importName}" 的ID "${importId}" 已被占用。` +
          `已为其分配新ID "${newId}"。` +
          `请检查使用旧ID "${importId}" 的数据，可能需要手动更新为新ID "${newId}"。`
      );
      // 创建一个新对象，避免直接修改原始导入数据
      const newItem = { ...importItem, [idField]: newId };
      itemsToAdd.push(newItem);
      // 将新生成的ID也加入Set，防止导入数据内部也有ID冲突
      localIdSet.add(newId);
      continue;
    }

    // 情况三：名称和ID都是全新的 -> 直接添加
    itemsToAdd.push(importItem);
    // 将此新ID加入Set，以正确处理后续导入项的ID冲突检查
    localIdSet.add(importId);
  }

  // 4. 将处理好的新增列表与本地数据合并，并保存
  if (itemsToAdd.length > 0) {
    const mergedData = [...localData, ...itemsToAdd];
    saveData(storageKey, mergedData);
    console.log(
      `[${storageKey}]: 合并完成。新增 ${itemsToAdd.length} 项，总数变为 ${mergedData.length}。`
    );
  } else {
    console.log(`[${storageKey}]: 无新项目可合并或更新。`);
  }
}

// 主要的合并服务函数
export async function handleFileImport(fileMap: {
  [fileName: string]: string;
}): Promise<void> {
  // 这里先用 void，后续可以改成返回一个结果对象
  const allKeys = Object.keys(MERGE_KEYS);

  for (const fileName in fileMap) {
    if (Object.prototype.hasOwnProperty.call(fileMap, fileName)) {
      const storageKey = FILE_TO_KEY_MAP[fileName];
      const filePath = fileMap[fileName];

      // 1. 检查文件名是否在处理映射表中
      if (!storageKey || !allKeys.includes(storageKey)) {
        console.warn(`文件 "${fileName}" 不在预设的合并配置中，将被跳过。`);
        continue;
      }

      try {
        // 2. 读取文件内容
        const fileContent = await readTextFile(filePath);
        if (!fileContent) {
          console.warn(`文件 "${fileName}" 内容为空，跳过处理。`);
          continue;
        }
        const importData = JSON.parse(fileContent);
        let itemsToAdd: DataItem[] = [];
        // 3. 根据预设的合并策略进行操作
        const config = MERGE_KEYS[storageKey as keyof typeof MERGE_KEYS];

        switch (config.strategy) {
          case MERGE_STRATEGIES.SKIP:
            await mergeSkip(storageKey, importData);
            break;

          // case MERGE_STRATEGIES.REPLACE:
          //   await mergeReplace(storageKey, importData);
          //   break;

          case MERGE_STRATEGIES.ARRAY_WITH_ID:
            if (!Array.isArray(importData)) {
              console.error(
                `数据错误: ${fileName} 的内容不是一个数组，无法使用 ARRAY_WITH_ID 策略。`
              );
              continue;
            }
            // @ts-ignore
            itemsToAdd = await mergeArrayWithId(
              storageKey,
              importData,
              config.idField
            );

            break;

          case MERGE_STRATEGIES.ARRAY_MERGE_DEDUP:
            if (!Array.isArray(importData)) {
              console.error(
                `数据错误: ${fileName} 的内容不是一个数组，无法使用 ARRAY_MERGE_DEDUP 策略。`
              );
              continue;
            }
            // @ts-ignore
            await mergeArrayDedupe(
              storageKey,
              importData,
              config.idField,
              config.dedupeBy
            );
            break;

          default:
            console.warn(`未知的合并策略: ${storageKey}`);
            break;
        }
        console.log(itemsToAdd, config);
        if ("afterMerge" in config && itemsToAdd.length > 0) {
          console.log("计算");
          await updatePomoCounts(itemsToAdd as Todo[]);
        }
      } catch (error) {
        console.error(`处理文件 "${fileName}" 时发生错误:`, error);
      }
    }
  }
  console.log("所有文件处理完毕。");
  // 在这里可以触发后续操作，比如重新计算、刷新UI等
}

/**
 * 从导入的 Todo 列表中计算每日番茄钟增量，并调用 Pinia Action 更新全局状态。
 * @param newTodos - 从文件导入的新增 Todo 数组。
 */
async function updatePomoCounts(newTodos: Todo[]): Promise<void> {
  // 1. 如果没有新增的 Todo，则提前结束，不做任何事。
  if (!newTodos || newTodos.length === 0) {
    console.log("Pomo更新：没有新增的Todo，跳过计算。");
    return;
  }

  // 2. 计算每个日期的番茄钟增量。
  // dailyIncrements 的格式为: { "YYYY-MM-DD": count, ... }
  const dailyIncrements: Record<string, number> = {};

  for (const todo of newTodos) {
    // 只处理类型为"番茄钟"且实际有完成记录的 Todo。
    if (
      todo.pomoType !== "🍅" ||
      !todo.realPomo ||
      !Array.isArray(todo.realPomo) ||
      todo.realPomo.length === 0
    ) {
      continue;
    }

    // 从 Todo 的 ID (时间戳) 中获取日期键。
    const date = new Date(todo.id);
    const dateKey = date.toISOString().split("T")[0]; // 格式: "YYYY-MM-DD"

    // 累加当前 Todo 的番茄钟数量。
    const pomoCount = todo.realPomo.reduce((sum, current) => sum + current, 0);
    if (pomoCount > 0) {
      dailyIncrements[dateKey] = (dailyIncrements[dateKey] || 0) + pomoCount;
    }
  }

  // 3. 如果有计算出的增量，则调用 Pinia Action 进行状态更新和持久化。
  if (Object.keys(dailyIncrements).length > 0) {
    console.log(
      "Pomo更新：计算完成，调用 Pinia Action 更新数据...",
      dailyIncrements
    );
    const pomoStore = usePomoStore();
    // 调用在 Store 中定义的 Action，它将负责更新 state 和 localStorage。
    pomoStore.importAndIncrementPomos(dailyIncrements);
  } else {
    console.log("Pomo更新：在新增的Todo中未发现有效的番茄钟记录。");
  }
}
