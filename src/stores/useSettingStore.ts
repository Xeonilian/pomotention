// src/stores/SettingStore.ts
import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { STORAGE_KEYS } from "../core/constants";
import { PomodoroDurations, TimerStyleDefaults } from "../core/constants";

// 定义全局 settings 类型（可根据自己需要补充或修改）
export interface GlobalSettings {
  checkForUpdate: boolean; // 是否启用自动更新检测
  durations: typeof PomodoroDurations;
  style: typeof TimerStyleDefaults;
  // 以后新增全局设置项就在这里补充
}

// 默认设置
const defaultSettings: GlobalSettings = {
  checkForUpdate: true,
  durations: PomodoroDurations,
  style: TimerStyleDefaults,
};

// 工具函数
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export const useSettingStore = defineStore("setting", () => {
  // 所有设置统一存于 settings
  const settings = ref<GlobalSettings>(
    loadFromStorage(STORAGE_KEYS.GLOBAL_SETTINGS, defaultSettings)
  );

  // 响应式保存到 localStorage
  watch(
    settings,
    (val) => {
      localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify(val));
    },
    { deep: true }
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
