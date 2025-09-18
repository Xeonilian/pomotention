// src/stores/useSettingStore.ts
import { defineStore } from "pinia";
import { ref, watch } from "vue";
import { STORAGE_KEYS } from "../core/constants";
import { PomodoroDurations, TimerStyleDefaults, ViewType } from "../core/constants";
import { ActivitySectionConfig } from "@/core/types/Activity";
import { SoundType } from "@/core/sounds";
import { AiProfile } from "@/core/types/AiProfile";

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

  ai?: {
    activeId: number; // 当前启用的配置
    profiles: Record<string, AiProfile>; // 所有配置集合（字典，键为 id）
    systemPrompt?: string;
  };
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

  ai: {
    activeId: 1,
    systemPrompt: "你是一个智能的时间管理助手，专门帮助用户提高觉察能力、自我照顾、工作效率和时间管理能力。",
    profiles: {
      kimik2: {
        id: 1,
        name: "月之暗面",
        provider: "moonshot",
        model: "moonshot-v1-8k",
        baseURL: "https://api.moonshot.cn/v1",
        timeoutMs: 30000,
        temperature: 0.7,
        apiKey: "sk-xKpgU3UGba3JTYW5uMw0py1KcmlCByEdM5ax4Ngsc72CIsgJ",
      },
      // 你可以再加一个示例
      // openai: {
      //   id: "openai",
      //   name: "OpenAI GPT-4o-mini",
      //   provider: "openai",
      //   model: "gpt-4o-mini",
      //   endpoint: "https://api.openai.com/v1/chat/completions",
      //   timeoutMs: 30000,
      //   temperature: 0.7,
      // }
    },
  },
};

// 工具函数
function loadFromStorage<T extends Record<string, any>>(key: string, defaultValue: T): T {
  try {
    const stored = localStorage.getItem(key);
    const loadedData = stored ? JSON.parse(stored) : {};

    // 检查 loadedData 中是否有未定义的字段
    const hasUndefined = Object.keys(defaultValue).some((key) => loadedData[key] === undefined);

    // 仅在 loadedData 存在，需要合并的情况下才合并
    const mergedData = hasUndefined ? { ...defaultValue, ...loadedData } : loadedData;

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
  const settings = ref<GlobalSettings>(loadFromStorage(STORAGE_KEYS.GLOBAL_SETTINGS, defaultSettings));

  // Log loaded settings
  // console.log("Initialized settings:", settings.value);

  // 响应式保存到 localStorage
  watch(
    settings,
    (newValue) => {
      try {
        // console.log("Saving to localStorage:", JSON.stringify(newValue)); // 日志检查
        localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify(newValue));
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
        (settings.value as any)[key] = typeof defVal === "object" && defVal !== null ? JSON.parse(JSON.stringify(defVal)) : defVal;
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

  // ai 操作
  // ai 操作（基于数字 ID）
  // 假设：
  // settings.value.ai?.profiles 的类型为 Record<number, AiProfile>
  // settings.value.ai?.activeId 的类型为 number（建议默认 -1 表示“未选择”）

  /**
   * 将当前激活的 AI 配置切换为指定 ID。
   * - 如果指定的 ID 不存在，打印警告并保持不变。
   */
  function setActiveAiProfile(id: number) {
    // 注意：对象键在底层是字符串，这里用 in 比较更稳妥（TS 认可 number -> string 的键转换）
    if (!settings.value.ai?.profiles || !(id in settings.value.ai.profiles)) {
      console.warn("setActiveAiProfile: id not found", id);
      return;
    }
    settings.value.ai!.activeId = id;
  }

  /**
   * 新增或更新一个 AI 配置。
   * - 如果 ai 域未初始化，则先初始化，activeId 默认指向该 profile.id。
   * - 深拷贝以避免外部引用污染 Store。
   */
  function upsertAiProfile(profile: AiProfile) {
    if (!settings.value.ai) {
      settings.value.ai = { activeId: profile.id, profiles: {} as Record<number, AiProfile> };
    }
    // 写入/覆盖
    settings.value.ai.profiles[profile.id] = JSON.parse(JSON.stringify(profile));

    // 如果当前没有有效的 activeId，则将刚写入的 profile 设为激活
    const ai = settings.value.ai;
    if (typeof ai.activeId !== "number" || !(ai.activeId in ai.profiles)) {
      ai.activeId = profile.id;
    }
  }

  /**
   * 删除指定 ID 的 AI 配置。
   * - 如果删除的是当前激活配置，则把 activeId 切到“第一个可用 ID”，若没有则置为 -1（未选择）。
   */
  function removeAiProfile(id: number) {
    const ai = settings.value.ai;
    if (!ai?.profiles || !(id in ai.profiles)) return;

    delete ai.profiles[id];

    if (ai.activeId === id) {
      // 取剩余 keys；由于对象键是字符串，需要转回 number
      const remainingIds = Object.keys(ai.profiles).map((k) => Number(k));
      ai.activeId = remainingIds.length > 0 ? remainingIds[0] : -1; // -1 表示没有激活项
    }
  }

  // 返回
  return {
    settings,
    resetSettings,
    resetDurations,
    resetStyle,
    setActiveAiProfile,
    upsertAiProfile,
    removeAiProfile,
  };
});
