// useAiConfig.ts
import { storeToRefs } from "pinia";
import { useSettingStore } from "@/stores/useSettingStore";
import type { AiProfile } from "@/core/types/AiProfile";

export function useAiConfig() {
  const store = useSettingStore();
  const { settings } = storeToRefs(store);

  const getActiveProfile = (): AiProfile | null => {
    const ai = settings.value.ai;
    if (!ai?.profiles) return null;

    const activeId = ai.activeId as unknown as string | number;

    // 1) 先尝试用“字典键名”直接获取（兼容 activeId 为字符串键名的情况）
    const byKey = (ai.profiles as Record<string, AiProfile>)[activeId as any];
    if (byKey) return byKey;

    // 2) 遍历 profiles 值，按 profile.id（数值）匹配（兼容 activeId 是数字 id 的情况）
    const values = Object.values(ai.profiles as Record<string, AiProfile>);
    const byId = values.find((p) => p.id === activeId);
    if (byId) return byId;

    return null;
  };

  const getSystemPrompt = () => settings.value.ai?.systemPrompt ?? "";
  const getModelPrompt = () => getActiveProfile()?.modelPrompt ?? "";
  const getModel = () => getActiveProfile()?.model;
  const getProvider = () => getActiveProfile()?.provider;
  const getApiEndpoint = () => getActiveProfile()?.endpoint ?? "";
  const getApiKey = () => getActiveProfile()?.apiKey ?? "";
  const getTimeoutMs = () => getActiveProfile()?.timeoutMs ?? 30000;
  const getTemperature = () => getActiveProfile()?.temperature ?? 0.7;
  const getProfile = () => getActiveProfile();

  return {
    getSystemPrompt,
    getModelPrompt,
    getModel,
    getProvider,
    getApiEndpoint,
    getApiKey,
    getTimeoutMs,
    getTemperature,
    getProfile,
  };
}
