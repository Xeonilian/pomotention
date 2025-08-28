<template>
  <div class="ai-chat-dialog" v-if="visible">
    <!-- 对话框头部 -->
    <div class="ai-chat-header">
      <div class="ai-chat-controls">
        <n-button text class="control-btn" @click="handleSetting">
          <template #icon>
            <n-icon size="18">
              <Settings24Regular />
            </n-icon>
          </template>
        </n-button>
        <n-button text @click="close" class="control-btn">
          <template #icon>
            <n-icon size="18">
              <DismissCircle24Regular />
            </n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <!-- 对话内容区域 -->
    <div class="ai-chat-content" v-if="!isMinimized">
      <div class="chat-messages" ref="messagesContainer">
        <div
          v-for="(message, index) in messages"
          :key="index"
          :class="['message', message.role]"
        >
          <div class="message-content">
            <div
              class="message-text"
              v-html="formatMessage(message.content)"
            ></div>
            <div class="message-time">{{ formatTime(message.timestamp) }}</div>
          </div>
        </div>
      </div>

      <!-- 输入区域 -->
      <div class="chat-input-area">
        <div class="input-container">
          <n-input
            v-model:value="inputMessage"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 4 }"
            placeholder="输入你的问题..."
            @keydown.enter.prevent="handleEnterPress"
            :disabled="isLoading"
            class="chat-input"
          />
          <n-button
            type="primary"
            size="small"
            :loading="isLoading"
            :disabled="!inputMessage.trim()"
            @click="sendMessage"
            class="send-btn"
          >
          </n-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from "vue";
import { NButton, NInput, NIcon } from "naive-ui";
import { DismissCircle24Regular, Settings24Regular } from "@vicons/fluent";
import { aiService, type AIMessage } from "@/services/aiService";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const props = defineProps({
  visible: { type: Boolean, required: true },
  position: { type: Object, default: () => ({ x: 200, y: 200 }) },
  size: { type: Object, default: () => ({ width: 400, height: 500 }) },
});

const emit = defineEmits<{
  (e: "update:position", pos: { x: number; y: number }): void;
  (e: "update:size", size: { width: number; height: number }): void;
  (e: "close"): void;
}>();

// 响应式数据
const messages = ref<Message[]>([]);
const inputMessage = ref("");
const isLoading = ref(false);
const isMinimized = ref(false);
const unreadCount = ref(0);
const messagesContainer = ref<HTMLElement>();
const showSettings = ref(false);

// 对话框位置和样式 - 包含位置和大小
const dialogStyle = computed(() => ({
  left: `${props.position.x}px`,
  top: `${props.position.y}px`,
  width: `${props.size.width}px`,
  height: `${props.size.height}px`,
}));

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
    // 尝试调用真实的AI API，如果失败则使用模拟响应
    let response: string;
    try {
      response = await callAIAPI(currentInput);
    } catch (apiError) {
      console.warn("AI API 调用失败，使用模拟响应:", apiError);
      response = await mockAIResponse(currentInput);
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
  }
};

// 设置
const handleSetting = () => {
  showSettings.value = true;
};

// 获取系统提示词
const getSystemPrompt = (): string => {
  try {
    const saved = localStorage.getItem("ai-config");
    if (saved) {
      const config = JSON.parse(saved);
      return (
        config.systemPrompt ||
        "你是一个智能的时间管理助手，专门帮助用户提高工作效率和时间管理能力。"
      );
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
  await new Promise((resolve) =>
    setTimeout(resolve, 1000 + Math.random() * 2000)
  );

  // 简单的回复逻辑
  if (input.includes("你好") || input.includes("hello")) {
    return "你好！我是你的AI助手，有什么可以帮助你的吗？";
  } else if (input.includes("时间") || input.includes("几点")) {
    return `现在是 ${new Date().toLocaleTimeString()}，希望你的时间管理很顺利！`;
  } else if (input.includes("番茄") || input.includes("pomodoro")) {
    return "番茄工作法是一个很好的时间管理技巧！建议你专注工作25分钟，然后休息5分钟。";
  } else {
    return `我理解你说的是："${input}"。这是一个很好的问题，让我想想怎么回答...`;
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

// 关闭
const close = () => {
  emit("close");
};

// 监听新消息，更新未读计数
watch(
  messages,
  (newMessages) => {
    if (isMinimized.value && newMessages.length > 0) {
      const lastMessage = newMessages[newMessages.length - 1];
      if (lastMessage.role === "assistant") {
        unreadCount.value++;
      }
    }
  },
  { deep: true }
);

onMounted(() => {
  // 添加欢迎消息
  messages.value.push({
    role: "assistant",
    content: "你好！我是你的AI助手，有什么可以帮助你的吗？",
    timestamp: new Date(),
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

.ai-chat-header {
  display: flex;
  justify-content: end;
  align-items: center;
  padding: 8px 12px;

  color: white;
  cursor: grab;
  user-select: none;
}

.ai-chat-controls {
  display: flex;
  gap: 4px;
}

.control-btn {
  width: 20px;
  height: 20px;
  min-width: 20px;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
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
  gap: 12px;
  width: 100%;
}

.message {
  display: flex;
  gap: 8px;
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
  padding: 8px 12px;
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
  border-bottom-left-radius: 1px;
}

.message-time {
  font-size: 11px;
  color: var(--color-text-secondary);

  opacity: 0.7;
}

/* 输入区固定在底部且不超父容器宽度 */
.chat-input-area {
  position: sticky;
  bottom: 0;
  padding: 12px;
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

.send-btn {
  height: 32px;
  min-width: 32px;
}

/* 滚动条样式（可留可去） */
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
