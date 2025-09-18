import { ref } from "vue";
import { aiApiService } from "@/services/aiApiService";
import { shouldStartTaskPlanning, getNextQuestion, buildTaskPrompt, guideQuestions } from "@/services/aiDialogService";
import type { AiMessage } from "@/core/types/Ai";
import { TaskPlanningContext, DialogState } from "@/core/types/Dialog";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function useAiChat() {
  const messages = ref<Message[]>([]);
  const isLoading = ref(false);
  const taskPlanningContext = ref<TaskPlanningContext>({
    state: DialogState.NORMAL_CHAT,
    gatheredInfo: {},
    currentStep: 0,
  });

  // 初始化欢迎消息
  messages.value.push({
    role: "assistant",
    content:
      "你好！我是你的AI助手，正在向你赶来。愿你保持觉察，好好照顾自己！\n💡 小贴士：你可以说「帮我规划一个项目」来开始任务拆解流程。",
    timestamp: new Date(),
  });

  const getSystemPrompt = (): string => {
    // ... (原方法保持不变)
    return "你是一个智能的时间管理助手，专门帮助用户提高工作效率和时间管理能力。";
  };

  const callAiApi = async (userInput: string): Promise<string> => {
    const history: AiMessage[] = messages.value.map((msg) => ({ role: msg.role, content: msg.content }));
    const messagesToSend: AiMessage[] = [{ role: "system", content: getSystemPrompt() }, ...history, { role: "user", content: userInput }];
    const response = await aiApiService.sendMessage(messagesToSend);
    return response.content;
  };

  const mockAiResponse = async (input: string): Promise<string> => {
    if (input.includes("你好") || input.includes("hello")) {
      return "喵喵喵~";
    } else if (input.includes("时间") || input.includes("几点")) {
      return `现在是 ${new Date().toLocaleTimeString()}，希望你的时间管理很顺利！`;
    } else if (input.includes("番茄") || input.includes("pomodoro")) {
      return "番茄工作法是一个很好的时间管理技巧！建议你专注工作25分钟，然后休息5分钟。";
    } else {
      return "喵喵喵~";
    }
  };
  const handleTaskPlanning = async (input: string): Promise<string> => {
    const context = taskPlanningContext.value;
    if (context.currentStep < guideQuestions.length) {
      const currentQuestion = guideQuestions[context.currentStep];
      context.gatheredInfo[currentQuestion.key] = input;
      context.currentStep++;
    }
    const nextQuestion = getNextQuestion(context);
    if (nextQuestion) {
      return `好的，已记录。\n\n${nextQuestion}`;
    } else {
      context.state = DialogState.API_CALLING;
      const taskPrompt = buildTaskPrompt(context);
      const finalMessages: AiMessage[] = [
        { role: "system", content: "你是一个专业的项目管理和任务拆解专家。请提供具体可执行的任务计划。" },
        { role: "user", content: taskPrompt },
      ];
      try {
        const planResponse = await aiApiService.sendMessage(finalMessages);
        resetTaskPlanning();
        return `太好了！基于您提供的信息，我为您制定了以下任务计划：\n\n${planResponse.content}\n\n如果您想调整计划，请告诉我具体需要修改的地方。`;
      } catch (error) {
        resetTaskPlanning();
        return "生成任务计划时出现了问题，请重新尝试或直接告诉我您的需求。";
      }
    }
  };

  const startTaskPlanning = async (): Promise<string> => {
    taskPlanningContext.value = {
      state: DialogState.GATHERING_INFO,
      gatheredInfo: {},
      currentStep: 0,
    };
    return `我来帮您制定一个详细的任务计划！我需要了解一些信息来为您定制最合适的方案。\n\n${guideQuestions[0].question}`;
  };

  const resetTaskPlanning = () => {
    taskPlanningContext.value = {
      state: DialogState.NORMAL_CHAT,
      gatheredInfo: {},
      currentStep: 0,
    };
  };

  const sendMessage = async (userInput: string) => {
    if (!userInput.trim() || isLoading.value) return;
    messages.value.push({ role: "user", content: userInput, timestamp: new Date() });
    isLoading.value = true;
    try {
      let response: string;
      if (taskPlanningContext.value.state === DialogState.GATHERING_INFO) {
        response = await handleTaskPlanning(userInput);
      } else if (shouldStartTaskPlanning(userInput)) {
        response = await startTaskPlanning();
      } else {
        try {
          response = await callAiApi(userInput);
        } catch {
          response = await mockAiResponse(userInput);
        }
      }
      messages.value.push({ role: "assistant", content: response, timestamp: new Date() });
    } catch (error) {
      messages.value.push({ role: "assistant", content: "抱歉，我遇到了一些问题，请稍后再试。", timestamp: new Date() });
    } finally {
      isLoading.value = false;
    }
  };

  return { messages, isLoading, sendMessage }; // 暴露给UI使用
}
