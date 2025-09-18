// composables/useAiChat.ts
import { ref } from "vue";
import type { AiMessage } from "@/core/types/Ai";
import { aiApiService } from "@/services/aiApiService";
import { getSystemPrompt } from "@/services/aiConfigService";
import { shouldStartTaskPlanning, getNextQuestion, buildTaskPrompt, guideQuestions, getFallbackReply } from "@/services/aiDialogService";
import { DialogState, type TaskPlanningContext } from "@/core/types/Dialog";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  hint?: string;
}

export function useAiChat() {
  const messages = ref<Message[]>([]);
  const isLoading = ref(false);

  const taskPlanningContext = ref<TaskPlanningContext>({
    state: DialogState.NORMAL_CHAT,
    gatheredInfo: {},
    currentStep: 0,
  });

  const push = (role: Message["role"], content: string) => messages.value.push({ role, content, timestamp: new Date() });

  const initWelcome = async () => {
    push("assistant", "你好！我是你的AI助手。你可以说「帮我规划一个项目」来开始任务拆解流程。");
  };

  const callModel = async (userInput: string): Promise<string> => {
    const history: AiMessage[] = messages.value.map((m) => ({ role: m.role, content: m.content }));
    const messagesToSend: AiMessage[] = [{ role: "system", content: getSystemPrompt() }, ...history, { role: "user", content: userInput }];
    const resp = await aiApiService.sendMessage(messagesToSend);
    return resp.content;
  };

  const handleTaskPlanningFlow = async (input: string): Promise<string> => {
    const ctx = taskPlanningContext.value;
    if (ctx.currentStep < guideQuestions.length) {
      const q = guideQuestions[ctx.currentStep];
      ctx.gatheredInfo[q.key] = input;
      ctx.currentStep++;
    }

    const nextQ = getNextQuestion(ctx);
    if (nextQ) {
      return `好的，已记录。\n\n${nextQ}`;
    }

    // 全部收集完，生成计划
    ctx.state = DialogState.API_CALLING;
    try {
      const taskPrompt = buildTaskPrompt(ctx);
      const finalMessages: AiMessage[] = [
        { role: "system", content: "你是一个专业的项目管理和任务拆解专家。请提供具体可执行的任务计划。" },
        { role: "user", content: taskPrompt },
      ];
      const plan = await aiApiService.sendMessage(finalMessages);

      // 完成后回到 NORMAL_CHAT
      taskPlanningContext.value = {
        state: DialogState.NORMAL_CHAT,
        gatheredInfo: {},
        currentStep: 0,
      };

      return `太好了！基于您提供的信息，我为您制定了以下任务计划：\n\n${plan.content}\n\n如果您想调整计划，请告诉我具体需要修改的地方。`;
    } catch {
      taskPlanningContext.value = {
        state: DialogState.NORMAL_CHAT,
        gatheredInfo: {},
        currentStep: 0,
      };
      return "生成任务计划时出现了问题，请重新尝试或直接告诉我您的需求。";
    }
  };

  const processUserInput = async (input: string) => {
    if (!input.trim() || isLoading.value) return;
    isLoading.value = true;
    push("user", input);

    try {
      let response = "";

      if (taskPlanningContext.value.state === DialogState.GATHERING_INFO) {
        response = await handleTaskPlanningFlow(input);
      } else if (shouldStartTaskPlanning(input)) {
        taskPlanningContext.value = {
          state: DialogState.GATHERING_INFO,
          gatheredInfo: {},
          currentStep: 0,
        };
        response = `我来帮您制定一个详细的任务计划！我需要了解一些信息来为您定制最合适的方案。\n\n${guideQuestions[0].question}`;
      } else {
        try {
          response = await callModel(input);
        } catch {
          // 不单独文件，直接用 aiDialogService 的兜底
          response = getFallbackReply(input);
        }
      }

      push("assistant", response);
    } catch {
      push("assistant", "抱歉，我遇到了一些问题，请稍后再试。");
    } finally {
      isLoading.value = false;
    }
  };

  return { messages, isLoading, initWelcome, processUserInput };
}
