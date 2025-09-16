<template>
  <div class="ai-chat-dialog">
    <!-- 对话内容区域 -->
    <div class="ai-chat-content">
      <div class="chat-messages" ref="messagesContainer">
        <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(message.content)"></div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input-area">
        <div class="input-container">
          <n-input
            ref="inputRef"
            v-model:value="inputMessage"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 4 }"
            placeholder="输入你的问题..."
            @keydown.enter.prevent="handleEnterPress"
            :disabled="isLoading"
            class="chat-input"
          />
        </div>
      </div>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, nextTick, onMounted } from "vue";
import { NInput } from "naive-ui";
import { aiService, type AIMessage } from "@/services/aiService";
import { shouldStartTaskPlanning, getNextQuestion, buildTaskPrompt, guideQuestions } from "@/services/aiDialogService";
import { TaskPlanningContext, DialogState } from "@/core/types/Dialog";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// 响应式数据
const messages = ref<Message[]>([]);
const inputMessage = ref("");
const isLoading = ref(false);
const messagesContainer = ref<HTMLElement>();
const inputRef = ref();

// 任务拆解状态
const taskPlanningContext = ref<TaskPlanningContext>({
  state: DialogState.NORMAL_CHAT,
  gatheredInfo: {},
  currentStep: 0,
});

// 发送消息
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return;

  const userMessage: Message = {
    role: "user",
    content: inputMessage.value,
    timestamp: new Date(),
  };

  messages.value.push(userMessage);
  const currentInput = inputMessage.value;
  inputMessage.value = "";
  isLoading.value = true;

  // 滚动到底部
  await nextTick();
  scrollToBottom();

  try {
    let response: string;

    // 检查是否在任务拆解流程中
    if (taskPlanningContext.value.state === "gathering_info") {
      response = await handleTaskPlanningFlow(currentInput);
    }
    // 检查是否要开始任务拆解
    else if (shouldStartTaskPlanning(currentInput)) {
      response = await startTaskPlanningFlow();
    }
    // 正常聊天流程（你原来的逻辑）
    else {
      try {
        response = await callAIAPI(currentInput);
      } catch (apiError) {
        console.warn("AI API 调用失败，使用模拟响应:", apiError);
        response = await mockAIResponse(currentInput);
      }
    }

    const assistantMessage: Message = {
      role: "assistant",
      content: response,
      timestamp: new Date(),
    };

    messages.value.push(assistantMessage);

    // 滚动到底部
    await nextTick();
    scrollToBottom();
  } catch (error) {
    console.error("AI响应错误:", error);
    const errorMessage: Message = {
      role: "assistant",
      content: "抱歉，我遇到了一些问题，请稍后再试。",
      timestamp: new Date(),
    };
    messages.value.push(errorMessage);
  } finally {
    isLoading.value = false;
    await nextTick();
    inputRef.value?.focus();
  }
};

// 获取系统提示词
const getSystemPrompt = (): string => {
  try {
    const saved = localStorage.getItem("ai-config");
    if (saved) {
      const config = JSON.parse(saved);
      return config.systemPrompt || "你是一个智能的时间管理助手，专门帮助用户提高觉察能力、自我照顾、工作效率和时间管理能力。";
    }
  } catch (error) {
    console.error("获取系统提示词失败:", error);
  }
  return "你是一个智能的时间管理助手，专门帮助用户提高工作效率和时间管理能力。";
};

// 调用真实的AI API
const callAIAPI = async (userInput: string): Promise<string> => {
  // 1. 获取历史消息 (不包含当前用户输入)
  const history: AIMessage[] = messages.value.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // 2. 构建要发送给 API 的完整消息列表
  const messagesToSend: AIMessage[] = [
    // a. 添加系统提示词
    { role: "system", content: getSystemPrompt() },
    // b. 添加所有历史消息
    ...history,
    // c. 添加当前用户这次的输入
    { role: "user", content: userInput },
  ];

  try {
    // 调用我们 service 中的方法
    const response = await aiService.sendMessage(messagesToSend);
    return response.content;
  } catch (error) {
    console.error("AI 服务调用失败:", error);
    // 将 service 抛出的错误再次抛出，让外层 try-catch 捕获
    // 这样就可以在 UI 上显示 "抱歉，我遇到了一些问题..."
    // 也可以在这里定制更详细的错误信息
    // 例如: throw new Error(`API 调用失败: ${(error as Error).message}`);
    throw error;
  }
};

// 模拟AI响应（当API未配置时使用）
const mockAIResponse = async (input: string): Promise<string> => {
  // 模拟网络延迟
  // await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 2000));

  // 简单的回复逻辑
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

// 处理回车键
const handleEnterPress = (e: KeyboardEvent) => {
  if (e.shiftKey) {
    // Shift+Enter 换行
    return;
  }
  sendMessage();
};

// 滚动到底部
const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// 格式化消息内容（支持简单的markdown）
const formatMessage = (content: string) => {
  // 简单的换行处理
  return content.replace(/\n/g, "<br>");
};

// 格式化时间
const formatTime = (timestamp: Date) => {
  return timestamp.toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

// 处理任务拆解流程
const handleTaskPlanningFlow = async (input: string): Promise<string> => {
  const context = taskPlanningContext.value;

  if (context.currentStep < guideQuestions.length) {
    // 保存用户回答
    const currentQuestion = guideQuestions[context.currentStep];
    context.gatheredInfo[currentQuestion.key] = input;
    context.currentStep++;
  }

  // 检查是否还有更多问题
  const nextQuestion = getNextQuestion(context);

  if (nextQuestion) {
    return `好的，已记录。\n\n${nextQuestion}`;
  } else {
    // 所有信息收集完成，生成任务计划
    context.state = DialogState.API_CALLING;

    const taskPrompt = buildTaskPrompt(context);
    const finalMessages: AIMessage[] = [
      { role: "system", content: "你是一个专业的项目管理和任务拆解专家。请提供具体可执行的任务计划。" },
      { role: "user", content: taskPrompt },
    ];

    try {
      const planResponse = await aiService.sendMessage(finalMessages);

      // 重置状态
      taskPlanningContext.value = {
        state: DialogState.GATHERING_INFO,
        gatheredInfo: {},
        currentStep: 0,
      };

      return `太好了！基于您提供的信息，我为您制定了以下任务计划：\n\n${planResponse.content}\n\n如果您想调整计划，请告诉我具体需要修改的地方。`;
    } catch (error) {
      // 重置状态
      taskPlanningContext.value = {
        state: DialogState.NORMAL_CHAT,
        gatheredInfo: {},
        currentStep: 0,
      };
      return "生成任务计划时出现了问题，请重新尝试或直接告诉我您的需求。";
    }
  }
};

// 开始任务拆解流程
const startTaskPlanningFlow = async (): Promise<string> => {
  taskPlanningContext.value = {
    state: DialogState.GATHERING_INFO,
    gatheredInfo: {},
    currentStep: 0,
  };

  return `我来帮您制定一个详细的任务计划！我需要了解一些信息来为您定制最合适的方案。\n\n${guideQuestions[0].question}`;
};

onMounted(() => {
  messages.value.push({
    role: "assistant",
    content:
      "你好！我是你的AI助手，正在向你赶来。愿你保持觉察，好好照顾自己！\n💡 小贴士：你可以说「帮我规划一个项目」来开始任务拆解流程。",
    timestamp: new Date(),
  });
  nextTick(() => {
    inputRef.value?.focus();
  });
});
</script>

<style scoped>
.ai-chat-dialog {
  background: var(--color-background);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow-y: auto;
  margin: auto;
}

.ai-chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
}

/* 消息区：可滚动 */
.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  margin-top: 20px;
}

.message {
  display: flex;
  gap: 2px;
  max-width: 100%;
}

.message.user {
  flex-direction: row-reverse;
}

.message-content {
  flex: 1;
}

.message.user .message-content {
  text-align: right;
}

.message-text {
  padding: 0px 0px;
  border-radius: 12px;
  word-wrap: break-word;
  line-height: 1.4;
}

.message.assistant .message-text {
  border-bottom-right-radius: 6px;
}

.message.user .message-text {
  background: var(--color-background-light);
  color: var(--color-text);
  padding: 2px 8px;
}

.message-time {
  font-size: 11px;
  color: var(--color-text-secondary);
  opacity: 0.7;
}

.message.user .message-time {
  padding-right: 6px;
}

/* 输入区固定在底部且不超父容器宽度 */
.chat-input-area {
  position: sticky;
  bottom: 0;
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
  width: 100%;
  box-sizing: border-box;
}

.input-container {
  display: flex;
  gap: 8px;
  align-items: flex-end;
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
}

.chat-input {
  flex: 1;
  min-width: 0; /* 防止 flex 子项撑破父容器 */
  max-width: 100%;
}

/* 滚动条样式*/
.chat-messages::-webkit-scrollbar {
  width: 4px;
}
.chat-messages::-webkit-scrollbar-track {
  background: transparent;
}
.chat-messages::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}
.chat-messages::-webkit-scrollbar-thumb:hover {
  background: var(--color-text-secondary);
}
</style>
