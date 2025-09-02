// src/stores/SettingStore.ts
import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { STORAGE_KEYS } from "../core/constants";
import {
  PomodoroDurations,
  TimerStyleDefaults,
  ViewType,
} from "../core/constants";
import { ActivitySectionConfig } from "@/core/types/Activity";
import { SoundType } from "@/core/sounds";

// 定义全局 settings 类型（可根据自己需要补充或修改）
export interface GlobalSettings {
  checkForUpdate: boolean; // 是否启用自动更新检测
  durations: typeof PomodoroDurations;
  style: typeof TimerStyleDefaults;
  miniModeRefactor: number;
  activityRank: Record<number, number>; // 活动排序：{activityId: rank}
  kanbanSetting: ActivitySectionConfig[];
  showPomodoro: boolean;
  showSchedule: boolean;
  showPlanner: boolean;
  showTask: boolean;
  showActivity: boolean;
  showAi: boolean;
  leftWidth: number;
  rightWidth: number;
  topHeight: number;
  isWhiteNoiseEnabled: boolean;
  whiteNoiseSoundTrack: SoundType;
  webdavId: string;
  webdavKey: string;
  webdavWebsite: string;
  webdavPath: string;
  viewSet: ViewType;
  // 以后新增全局设置项就在这里补充
}

// 默认设置
const defaultSettings: GlobalSettings = {
  checkForUpdate: false,
  durations: PomodoroDurations,
  style: TimerStyleDefaults,
  miniModeRefactor: 1,
  activityRank: {}, // 默认空对象
  kanbanSetting: [
    { id: 1, filterKey: "all", search: "", show: true, showTags: true },
    { id: 2, filterKey: "today", search: "", show: false, showTags: false },
    { id: 3, filterKey: "interrupt", search: "", show: false, showTags: false },
    { id: 4, filterKey: "todo", search: "", show: false, showTags: false },
    { id: 5, filterKey: "schedule", search: "", show: false, showTags: false },
    { id: 6, filterKey: "cancelled", search: "", show: false, showTags: false },
  ],
  showPomodoro: true,
  showSchedule: true,
  showPlanner: true,
  showTask: true,
  showActivity: true,
  showAi: false,
  leftWidth: 100, // 默认值你自己定
  rightWidth: 300,
  topHeight: 300,
  isWhiteNoiseEnabled: false,
  whiteNoiseSoundTrack: SoundType.WORK_TICK,
  webdavId: "",
  webdavKey: "",
  webdavWebsite: "https://dav.jianguoyun.com/dav/",
  webdavPath: "/PomotentionBackup",
  viewSet: "day",
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
        // console.log("Saving to localStorage:", JSON.stringify(newValue)); // 日志检查
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
  type SettingsKey = keyof GlobalSettings;

  function resetSettings(keys?: SettingsKey | SettingsKey[]) {
    if (!keys) {
      // 重置全部
      settings.value = JSON.parse(JSON.stringify(defaultSettings));
      return;
    }

    const list = Array.isArray(keys) ? keys : [keys];

    for (const key of list) {
      // 仅当 defaultSettings 中存在该键时才重置
      if (key in defaultSettings) {
        // 对象/数组做深拷贝，基础类型直接赋值
        const defVal = (defaultSettings as any)[key];
        (settings.value as any)[key] =
          typeof defVal === "object" && defVal !== null
            ? JSON.parse(JSON.stringify(defVal))
            : defVal;
      } else {
        console.warn(`resetSettings: unknown key "${String(key)}" skipped`);
      }
    }
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
