import { storeToRefs } from "pinia";
import { useSettingStore } from "@/stores/useSettingStore";
import type { AiProfile } from "@/core/types/AiProfile";

export function useAiConfig() {
  const store = useSettingStore();
  const { settings } = storeToRefs(store);

  const getActiveProfile = (): AiProfile | null => {
    const ai = settings.value.ai;
    if (!ai?.profiles) return null;
    const active = ai?.profiles?.[ai?.activeId ?? ""] as AiProfile | undefined;

    return active ?? null;
  };

  const getSystemPrompt = () => {
    const ai = settings.value.ai;
    const prompt = ai?.systemPrompt;
    return prompt;
  };
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
