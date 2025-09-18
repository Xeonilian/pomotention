<template>
  <div class="ai-chat-dialog">
    <div class="ai-chat-content">
      <div class="chat-messages" ref="messagesContainer">
        <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(message.content)"></div>
          </div>
        </div>
      </div>

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
import { useAiChat } from "@/composables/useAiChat";
import { formatMessage } from "@/core/utils/formatMessage";

const messagesContainer = ref<HTMLElement>();
const inputRef = ref();
const inputMessage = ref("");

// 仅暴露必要状态与方法（内部封装任务拆解/AI调用/系统提示/回退策略）
const { messages, isLoading, initWelcome, processUserInput } = useAiChat();

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const handleEnterPress = async (e: KeyboardEvent) => {
  if (e.shiftKey || !inputMessage.value.trim() || isLoading.value) return;
  const currentInput = inputMessage.value;
  inputMessage.value = "";

  await processUserInput(currentInput);
  await nextTick();
  scrollToBottom();
  inputRef.value?.focus();
};

onMounted(async () => {
  await initWelcome();
  await nextTick();
  scrollToBottom();
  inputRef.value?.focus();
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
  gap: 6px;
  width: 100%;
  margin-top: 20px;
}

.message {
  display: flex;
  gap: 6px;
  padding-right: 4px;
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
  border-radius: 6px;
  word-wrap: break-word;
  line-height: 1.4;
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
  /* 去掉 hover 时的红色边框 */
  --n-border-hover: 1px solid rgb(224, 224, 230) !important;

  /* 去掉 focus 时的红色边框 */
  --n-border-focus: 1px solid rgb(224, 224, 230) !important;

  /* 去掉 focus 时的灰色阴影框 */
  --n-box-shadow-focus: none !important;

  /* 如果还有警告和错误状态的样式，也一并去掉 */
  --n-border-hover-warning: 1px solid rgb(224, 224, 230) !important;
  --n-border-focus-warning: 1px solid rgb(224, 224, 230) !important;
  --n-box-shadow-focus-warning: none !important;

  --n-border-hover-error: 1px solid rgb(224, 224, 230) !important;
  --n-border-focus-error: 1px solid rgb(224, 224, 230) !important;
  --n-box-shadow-focus-error: none !important;
}

.chat-input:deep(.n-input-wrapper) {
  padding-left: 6px;
  padding-right: 6px;
}
/* 滚动条样式*/
</style>
