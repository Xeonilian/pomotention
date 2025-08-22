<template>
  <div
    class="ai-chat-dialog"
    v-if="visible"
    ref="draggableContainer"
    :style="dialogStyle"
  >
    <!-- 对话框头部 -->
    <div class="ai-chat-header" @mousedown="handleMouseDown">
      <div class="ai-chat-title">
        <img src="@/assets/cloud-sun.svg" alt="可爱的番茄横幅" />
      </div>
      <div class="ai-chat-controls">
        <n-button size="tiny" class="control-btn" @click="handleSetting">
          <template #icon>
            <n-icon size="18">
              <Settings24Regular />
            </n-icon>
          </template>
        </n-button>
        <n-button size="tiny" circle @click="close" class="control-btn">
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
          <div class="message-avatar">
            <n-avatar
              :round="true"
              :size="22"
              :src="message.role === 'user' ? userAvatar : aiAvatar"
            />
          </div>
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
            <template #icon>
              <n-icon size="14">
                <ArrowExportLtr20Regular />
              </n-icon>
            </template>
          </n-button>
        </div>

        <!-- 调整大小手柄 -->
        <div class="resize-handle" @mousedown="handleResizeStart"></div>
      </div>
    </div>
  </div>

  <!-- AI 设置对话框 -->
  <AISettingsDialog
    v-model:visible="showSettings"
    @saved="handleSettingsSaved"
  />
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from "vue";
import { NButton, NInput, NIcon } from "naive-ui";
import {
  ArrowExportLtr20Regular,
  DismissCircle24Regular,
  Settings24Regular,
} from "@vicons/fluent";
import { aiService, type AIMessage } from "@/services/aiService";
import AISettingsDialog from "./AISettingsDialog.vue";
import { useDraggable } from "@/composables/useDraggable";
import userAvatar from "@/assets/user-1.svg";
import aiAvatar from "@/assets/bot-avatar.png";

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

const emit = defineEmits(["close", "update:position", "update:size"]);

// 响应式数据
const messages = ref<Message[]>([]);
const inputMessage = ref("");
const isLoading = ref(false);
const isMinimized = ref(false);
const unreadCount = ref(0);
const messagesContainer = ref<HTMLElement>();
const showSettings = ref(false);

// 拖拽功能
const { draggableContainer } = useDraggable(5);

// 自定义拖拽处理，支持位置更新
const isDragging = ref(false);
const startX = ref(0);
const startY = ref(0);
const initialX = ref(0);
const initialY = ref(0);

const handleMouseDown = (e: MouseEvent) => {
  if (e.button === 0 && draggableContainer.value) {
    // 检查点击的目标是否是输入框相关元素或调整大小手柄
    const target = e.target as HTMLElement;
    const isInputElement = target.closest(
      "input, textarea, .n-input, .n-input-wrapper, .n-input__input"
    );
    const isResizeHandle = target.closest(".resize-handle");

    if (isInputElement || isResizeHandle) {
      return;
    }

    isDragging.value = true;
    startX.value = e.clientX;
    startY.value = e.clientY;
    initialX.value = props.position.x;
    initialY.value = props.position.y;

    draggableContainer.value.style.cursor = "grabbing";
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    e.preventDefault();
  }
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || isResizing.value) return;

  const deltaX = e.clientX - startX.value;
  const deltaY = e.clientY - startY.value;

  const newX = Math.max(0, initialX.value + deltaX);
  const newY = Math.max(0, initialY.value + deltaY);

  emit("update:position", { x: newX, y: newY });
  e.preventDefault();
};

const handleMouseUp = () => {
  isDragging.value = false;
  if (draggableContainer.value) {
    draggableContainer.value.style.cursor = "grab";
  }
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
};

// 调整大小功能
const isResizing = ref(false);
const resizeStartX = ref(0);
const resizeStartY = ref(0);
const initialWidth = ref(0);
const initialHeight = ref(0);

const handleResizeStart = (e: MouseEvent) => {
  if (e.button === 0) {
    // 阻止事件冒泡，避免触发拖拽
    e.stopPropagation();

    isResizing.value = true;
    resizeStartX.value = e.clientX;
    resizeStartY.value = e.clientY;
    initialWidth.value = props.size.width;
    initialHeight.value = props.size.height;

    document.addEventListener("mousemove", handleResizeMove);
    document.addEventListener("mouseup", handleResizeEnd);
    e.preventDefault();
  }
};

const handleResizeMove = (e: MouseEvent) => {
  if (!isResizing.value || isDragging.value) return;

  const deltaX = e.clientX - resizeStartX.value;
  const deltaY = e.clientY - resizeStartY.value;

  // 计算新的宽度和高度，确保最小尺寸
  const newWidth = Math.max(300, initialWidth.value + deltaX);
  const newHeight = Math.max(400, initialHeight.value + deltaY);

  // 只更新大小，不更新位置
  emit("update:size", { width: newWidth, height: newHeight });

  e.preventDefault();
};

const handleResizeEnd = () => {
  isResizing.value = false;
  document.removeEventListener("mousemove", handleResizeMove);
  document.removeEventListener("mouseup", handleResizeEnd);
};

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

// 处理设置保存
const handleSettingsSaved = () => {
  console.log("AI 设置已保存");
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

// 组件卸载时清理事件监听器
onUnmounted(() => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
  document.removeEventListener("mousemove", handleResizeMove);
  document.removeEventListener("mouseup", handleResizeEnd);
});

// 监听对话框显示状态，初始化拖拽
watch(
  () => props.visible,
  (newVal) => {
    if (newVal && draggableContainer.value) {
      // 确保拖拽功能在对话框显示时正确初始化
      nextTick(() => {
        if (draggableContainer.value) {
          draggableContainer.value.addEventListener(
            "mousedown",
            handleMouseDown
          );
        }
      });
    }
  }
);
</script>

<style scoped>
.ai-chat-dialog {
  position: fixed;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  cursor: grab;
}

.ai-chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--color-blue-light);
  color: white;
  cursor: grab;
  user-select: none;
}

.ai-chat-title {
  display: flex;
  align-items: left;
  height: 30px;
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
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message {
  display: flex;
  gap: 8px;
  max-width: 100%;
}

.message.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.message.user .message-avatar {
  background: var(--color-blue-light);
  color: white;
}

.message.assistant .message-avatar {
  background: var(--color-info);
  color: white;
}

.message-content {
  flex: 1;
  max-width: calc(100% - 32px);
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

.message.user .message-text {
  background: var(--color-blue);
  color: white;
  border-bottom-right-radius: 1px;
}

.message.assistant .message-text {
  background: var(--color-background-light);
  color: var(--color-text);
  border-bottom-left-radius: 1px;
}

.message-time {
  font-size: 11px;
  color: var(--color-text-secondary);
  margin-top: 4px;
  opacity: 0.7;
}

.chat-input-area {
  padding: 12px;
  border-top: 1px solid var(--color-border);
  background: var(--color-background);
}

.input-container {
  display: flex;
  gap: 8px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
}

.send-btn {
  height: 32px;
  min-width: 32px;
}

.ai-chat-minimized {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--color-primary);
  color: white;
  cursor: pointer;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.ai-chat-minimized:hover {
  background: var(--color-primary-hover);
}

.ai-icon {
  color: var(--color-primary);
}

.user-icon {
  color: white;
}

/* 滚动条样式 */
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

/* 调整大小手柄样式 */
.resize-handle {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 12px;
  height: 12px;
  cursor: nw-resize;
  background: linear-gradient(
    -45deg,
    transparent 30%,
    var(--color-border) 30%,
    var(--color-border) 40%,
    transparent 40%,
    transparent 60%,
    var(--color-border) 60%,
    var(--color-border) 70%,
    transparent 70%
  );
  border-radius: 0 0 8px 0;
  z-index: 10;
}

.resize-handle:hover {
  background: linear-gradient(
    -45deg,
    transparent 30%,
    var(--color-primary) 30%,
    var(--color-primary) 40%,
    transparent 40%,
    transparent 60%,
    var(--color-primary) 60%,
    var(--color-primary) 70%,
    transparent 70%
  );
}
</style>
