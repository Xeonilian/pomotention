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
  hint?: string; // 预留的扩展字段，可用于 UI 提示或引导
}

export function useAiChat() {
  // 聊天消息列表（包含用户与助手消息）
  const messages = ref<Message[]>([]);
  // 全局加载态，避免并发输入与重复调用
  const isLoading = ref(false);
  // 运行时 AI 配置（如 system prompt、模型参数等）
  const aiConfig = useAiConfig();

  // 任务规划对话上下文：用于引导式收集信息与状态管理
  const taskPlanningContext = ref<TaskPlanningContext>({
    state: DialogState.NORMAL_CHAT, // 初始为普通聊天态（非任务规划）
    gatheredInfo: {}, // 收集到的用户信息（逐步填充）
    currentStep: 0, // 当前提问进度（与 guideQuestions 对齐）
  });

  // 向消息列表压入一条消息（通用方法）
  const push = (role: Message["role"], content: string) => messages.value.push({ role, content, timestamp: new Date() });

  // 初始化欢迎语（页面加载时可调用）
  const initWelcome = async () => {
    // 引导用户可通过口令进入任务规划流程
    push("assistant", "你好！我是你的AI助手。你可以说「帮我规划一个项目」来开始任务拆解流程。");
  };

  // 通用模型调用：将历史消息 + 用户输入 + system prompt 一并发送到模型
  const callModel = async (userInput: string): Promise<string> => {
    // 取出历史消息（仅 user/assistant）
    const history: AiMessage[] = messages.value.map((m) => ({ role: m.role, content: m.content }));

    // 最终要发送给模型的消息队列：
    // - system: 来自 aiConfig 的系统提示，定义助手行为边界
    // - history: 历史轮次，保留上下文
    // - user: 本次用户输入
    const messagesToSend: AiMessage[] = [
      { role: "system", content: aiConfig.getSystemPrompt() },
      ...history,
      { role: "user", content: userInput },
    ];

    // 统一走 aiApiService，便于替换后端/模型厂商
    const resp = await aiApiService.sendMessage(messagesToSend);
    return resp.content;
  };

  // 任务规划流程（GATHERING_INFO 阶段）核心处理
  // - 职责：按步骤收集用户回答、决定是否继续提问或生成最终计划
  const handleTaskPlanningFlow = async (input: string): Promise<string> => {
    const ctx = taskPlanningContext.value;

    // 1) 在当前步骤，将用户输入记录到 gatheredInfo
    if (ctx.currentStep < guideQuestions.length) {
      const q = guideQuestions[ctx.currentStep]; // 当前问题定义（含 key、question）
      ctx.gatheredInfo[q.key] = input; // 按 key 存入用户回答
      ctx.currentStep++; // 进入下一步
    }

    // 2) 获取下一条问题（若还有未问完的）
    const nextQ = getNextQuestion(ctx);
    if (nextQ) {
      // 未收集完，继续追问
      return `${nextQ}`;
    }

    try {
      const taskPrompt = buildTaskPrompt(ctx);

      // 在这里直接重置上下文，避免用户长时间停留在规划态
      taskPlanningContext.value = {
        state: DialogState.NORMAL_CHAT,
        gatheredInfo: {},
        currentStep: 0,
      };

      // 将可发送的完整内容返回给前端，由前端把它放入输入框进行确认
      return `这是为您生成任务计划所需的完整说明草稿（可在发送前修改）：\n\n${taskPrompt}\n\n请确认无误后点击发送，我将基于这份说明生成详细的任务计划。`;
    } catch (err) {
      // 出错时也重置上下文，回到普通聊天
      taskPlanningContext.value = {
        state: DialogState.NORMAL_CHAT,
        gatheredInfo: {},
        currentStep: 0,
      };
      return "在整理您的信息时出现了问题，请稍后再试或直接告诉我您的需求。";
    }
  };

  // 主入口：处理用户输入
  // - 分支逻辑概览：
  //   A) 处于任务规划信息收集阶段（GATHERING_INFO）
  //      - 将本轮回答写入 gatheredInfo；若仍有问题，继续追问下一条
  //      - 若已收集完毕：构建 taskPrompt 草稿并返回给前端“预览/可编辑”，不调用模型
  //        · 同时重置对话状态为 NORMAL_CHAT，等待用户手动确认发送
  //   B) 需要触发任务规划（基于关键词/意图匹配）
  //      - 初始化任务规划上下文（进入 GATHERING_INFO）并提出第一条引导问题
  //   C) 普通聊天
  //      - 直接调用通用模型（callModel）生成回答
  //      - 若调用失败，使用 getFallbackReply 进行兜底
  // 说明：当 A 分支收集完成后返回的“草稿”，由前端填入输入框；用户点击发送后将走 C 分支的普通调用流程。
  const processUserInput = async (input: string) => {
    // 空输入或正在加载时忽略，避免重复提交
    if (!input.trim() || isLoading.value) return;
    isLoading.value = true;

    // 记录用户输入
    push("user", input);

    try {
      let response = "";

      // 分支 A：任务规划信息收集阶段
      if (taskPlanningContext.value.state === DialogState.GATHERING_INFO) {
        // 这里不会直接调模型，handleTaskPlanningFlow 将在收集完成时返回“草稿”
        response = await handleTaskPlanningFlow(input);

        // 分支 B：判断是否需要启动任务规划
      } else if (shouldStartTaskPlanning(input)) {
        // 初始化进入收集态
        taskPlanningContext.value = {
          state: DialogState.GATHERING_INFO,
          gatheredInfo: {},
          currentStep: 0,
        };

        // 提出第一条引导问题
        response = `我来帮您制定一个详细的任务计划！我需要了解一些信息来为您定制最合适的方案。\n\n${guideQuestions[0].question}`;

        // 分支 C：普通聊天，直接调用模型
      } else {
        try {
          response = await callModel(input);
        } catch {
          // 模型调用异常时，用兜底回复
          response = getFallbackReply(input);
        }
      }

      // 将助手响应加入历史
      push("assistant", response);
    } catch {
      // 兜底异常处理
      push("assistant", "抱歉，我遇到了一些问题，请稍后再试。");
    } finally {
      // 恢复可输入态
      isLoading.value = false;
    }
  };

  // 对外暴露的数据与方法
  return { messages, isLoading, initWelcome, processUserInput };
}
