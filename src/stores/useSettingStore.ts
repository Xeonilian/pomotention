// src/stores/SettingStore.ts
import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { STORAGE_KEYS } from "../core/constants";
import { PomodoroDurations, TimerStyleDefaults } from "../core/constants";
import { ActivitySectionConfig } from "@/core/types/Activity";

// 定义全局 settings 类型（可根据自己需要补充或修改）
export interface GlobalSettings {
  checkForUpdate: boolean; // 是否启用自动更新检测
  durations: typeof PomodoroDurations;
  style: typeof TimerStyleDefaults;
  miniModeRefactor: number;
  activityRank: Record<number, number>; // 活动排序：{activityId: rank}
  kanbanSetting: ActivitySectionConfig[];
  // 以后新增全局设置项就在这里补充
}

// 默认设置
const defaultSettings: GlobalSettings = {
  checkForUpdate: true,
  durations: PomodoroDurations,
  style: TimerStyleDefaults,
  miniModeRefactor: 1,
  activityRank: {}, // 默认空对象
  kanbanSetting: [{ id: 1, filterKey: "all", search: "" }],
};

// 工具函数
function loadFromStorage<T extends Record<string, any>>(
  key: string,
  defaultValue: T
): T {
  try {
    const stored = localStorage.getItem(key);
    const loadedData = stored ? JSON.parse(stored) : {};

    // 检查 loadedData 中是否有未定义的字段
    const hasUndefined = Object.keys(defaultValue).some(
      (key) => loadedData[key] === undefined
    );

    // 仅在 loadedData 存在，需要合并的情况下才合并
    const mergedData = hasUndefined
      ? { ...defaultValue, ...loadedData }
      : loadedData;

    // 保存合并后的数据到 localStorage
    localStorage.setItem(key, JSON.stringify(mergedData));

    return mergedData as T; // 返回合并后的数据
  } catch (error) {
    console.error(`Error loading from storage - Key: ${key}, Error: ${error}`);
    return defaultValue; // 如果发生错误，返回默认值
  }
}

export const useSettingStore = defineStore("setting", () => {
  // 所有设置统一存于 settings
  const settings = ref<GlobalSettings>(
    loadFromStorage(STORAGE_KEYS.GLOBAL_SETTINGS, defaultSettings)
  );

  // Log loaded settings
  // console.log("Initialized settings:", settings.value);

  // 响应式保存到 localStorage
  watch(
    settings,
    (newValue) => {
      try {
        console.log("Saving to localStorage:", JSON.stringify(newValue)); // 日志检查
        localStorage.setItem(
          STORAGE_KEYS.GLOBAL_SETTINGS,
          JSON.stringify(newValue)
        );
      } catch (error) {
        console.error("Failed to save to localStorage:", error);
      }
    },
    { deep: true } // 深度监视
  );

  // 重置全部设置为默认
  function resetSettings() {
    settings.value = JSON.parse(JSON.stringify(defaultSettings));
  }

  // 如果你还想保留单独重置部分设置项可以加下面这些
  function resetDurations() {
    settings.value.durations = JSON.parse(JSON.stringify(PomodoroDurations));
  }
  function resetStyle() {
    settings.value.style = JSON.parse(JSON.stringify(TimerStyleDefaults));
  }

  // 返回
  return {
    settings,
    resetSettings,
    resetDurations,
    resetStyle,
  };
});
