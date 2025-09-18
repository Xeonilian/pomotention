// services/aiConfigService.ts
export const getSystemPrompt = (): string => {
  try {
    const saved = localStorage.getItem("ai-config");
    if (saved) {
      const config = JSON.parse(saved);
      return config.systemPrompt || "你是一个智能的时间管理助手，专门帮助用户提高觉察能力、自我照顾、工作效率和时间管理能力。";
    }
  } catch {}
  return "你是一个智能的时间管理助手，专门帮助用户提高工作效率和时间管理能力。";
};
