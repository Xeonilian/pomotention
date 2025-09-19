// composables/useAiChat.ts
import { ref } from "vue";
import type { AiMessage } from "@/core/types/Ai";
import { aiApiService } from "@/services/aiApiService";
import { useAiConfig } from "@/services/aiConfigService";
import { shouldStartTaskPlanning, getNextQuestion, buildTaskPrompt, guideQuestions, getFallbackReply } from "@/services/aiDialogService";
import { DialogState, type TaskPlanningContext } from "@/core/types/Dialog";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  hint?: string; // 预留给 UI 的提示信息
}

export function useAiChat() {
  // 聊天消息列表
  const messages = ref<Message[]>([]);
  // 全局加载态
  const isLoading = ref(false);
  // 运行时配置
  const aiConfig = useAiConfig();

  // 任务规划上下文
  const taskPlanningContext = ref<TaskPlanningContext>({
    state: DialogState.NORMAL_CHAT,
    gatheredInfo: {},
    currentStep: 0,
  });

  // 工具：推送一条消息
  const push = (role: Message["role"], content: string, hint?: string) => {
    messages.value.push({ role, content, timestamp: new Date(), hint });
  };

  // 初始化欢迎语
  const initWelcome = async () => {
    push("assistant", "你好！我是你的时间管理助手。直接开始聊天，或发送「帮我规划一个项目」进入任务拆解流程。");
  };

  // 通用模型调用：系统提示 + 历史消息 + 本轮用户输入
  const callModel = async (userInput: string): Promise<string> => {
    // 仅收集 user/assistant 历史
    const history: AiMessage[] = messages.value.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const messagesToSend: AiMessage[] = [];
    const sys = aiConfig.getSystemPrompt?.() || "";

    // 仅当 system prompt 非空时注入
    if (sys.trim()) {
      messagesToSend.push({ role: "system", content: sys.trim() });
    }

    messagesToSend.push(...history, { role: "user", content: userInput });

    // 调用统一服务层（内部可以是 Tauri invoke 或直接 HTTP）
    try {
      const resp = await aiApiService.sendMessage(messagesToSend);
      return resp.content || "";
    } catch (err) {
      if (import.meta.env?.DEV) {
        // 开发环境打印日志，方便排查
        // eslint-disable-next-line no-console
        console.error("callModel failed:", err);
      }
      throw err;
    }
  };

  // 任务规划信息收集阶段
  const handleTaskPlanningFlow = async (input: string): Promise<string> => {
    const ctx = taskPlanningContext.value;

    // 1) 存本轮回答
    if (ctx.currentStep < guideQuestions.length) {
      const q = guideQuestions[ctx.currentStep];
      ctx.gatheredInfo[q.key] = input;
      ctx.currentStep++;
    }

    // 2) 若还有问题，继续追问
    const nextQ = getNextQuestion(ctx);
    if (nextQ) {
      return `${nextQ}`;
    }

    // 3) 已收集完毕：构建草稿，重置上下文
    try {
      const taskPrompt = buildTaskPrompt(ctx);

      taskPlanningContext.value = {
        state: DialogState.NORMAL_CHAT,
        gatheredInfo: {},
        currentStep: 0,
      };

      return `这是为您生成任务计划所需的：\n\n${taskPrompt}\n\n我将基于这份说明生成详细的任务计划。`;
    } catch (err) {
      taskPlanningContext.value = {
        state: DialogState.NORMAL_CHAT,
        gatheredInfo: {},
        currentStep: 0,
      };
      return "在整理您的信息时出现了问题，请稍后再试或直接告诉我您的需求。";
    }
  };

  // 主入口：处理用户输入
  const processUserInput = async (input: string) => {
    const text = input?.trim() || "";
    if (!text || isLoading.value) return;

    isLoading.value = true;
    push("user", text);

    try {
      let response = "";

      // A) 处于任务规划信息收集阶段
      if (taskPlanningContext.value.state === DialogState.GATHERING_INFO) {
        response = await handleTaskPlanningFlow(text);

        // B) 判断是否需要进入任务规划
      } else if (shouldStartTaskPlanning(text)) {
        taskPlanningContext.value = {
          state: DialogState.GATHERING_INFO,
          gatheredInfo: {},
          currentStep: 0,
        };

        response = "我来帮您制定一个详细的任务计划！我需要了解一些信息来为您定制最合适的方案。\n\n" + guideQuestions[0].question;

        // C) 普通聊天
      } else {
        try {
          response = await callModel(text);
        } catch {
          // 模型失败兜底
          response = getFallbackReply(text);
        }
      }

      push("assistant", response);
    } catch {
      // 最外层兜底
      push("assistant", "抱歉，我遇到了一些问题，请稍后再试。");
    } finally {
      isLoading.value = false;
    }
  };

  // 可选：提供重置功能（清空对话）
  const resetChat = () => {
    messages.value = [];
    taskPlanningContext.value = {
      state: DialogState.NORMAL_CHAT,
      gatheredInfo: {},
      currentStep: 0,
    };
  };

  return {
    messages,
    isLoading,
    initWelcome,
    processUserInput,
    resetChat,
  };
}
