<template>
  <div class="ai-chat-dialog">
    <div class="ai-chat-content">
      <div v-if="messages.length === 0" class="greeting">
        <h1>你好呀！😸</h1>
        &nbsp;&nbsp; 我是你的「三脚猫」助手，让我们开始一场伟大的谈话吧！🎉
      </div>
      <div class="chat-messages" ref="messagesContainer">
        <div v-for="(message, index) in messages" :key="index" :class="['message', message.role]">
          <div class="message-content">
            <div class="message-text" v-html="formatMessage(message.content)"></div>
          </div>
        </div>
      </div>

      <div class="chat-input-area">
        <n-button text @click="resetChat" class="button-reset">
          <template #icon>
            <n-icon>
              <ChatDismiss20Regular />
            </n-icon>
          </template>
        </n-button>
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
          >
            <template #suffix>
              <n-icon text color="var(--color-blue)" class="icon-tag" title="关于AI" @click="showModal = true">
                <Question20Filled />
              </n-icon>
            </template>
          </n-input>
        </div>
      </div>
    </div>
  </div>
  <n-modal v-model:show="showModal" class="custom-card" preset="card" :style="{ width: '600px', display: 'flex' }" :bordered="false">
    <!-- 使用 v-html 渲染解析后的 Markdown 内容 -->
    <div v-html="renderedMarkdownContent"></div>

    <template #footer>
      <n-button class="footer-button" @click="showModal = false">即时启动</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from "vue";
import { NInput } from "naive-ui";
import { useAiChat } from "@/composables/useAiChat";
import { formatMessage } from "@/core/utils/formatMessage";
import { Question20Filled } from "@vicons/fluent";
import { marked } from "marked";
import { ChatDismiss20Regular } from "@vicons/fluent";

const messagesContainer = ref<HTMLElement>();
const inputRef = ref();
const inputMessage = ref("");
const showModal = ref(false);

// 仅暴露必要状态与方法（内部封装任务拆解/AI调用/系统提示/回退策略）
const { messages, isLoading, processUserInput, resetChat } = useAiChat();

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

const markdownContent = ref(`
### 如何与「三脚猫」😸 对话？

1. **三脚猫的运行基础**：它基于 Kimi API，并内置了一些 Token（使用额度）。视使用人数而定，可能支持 1-7 天左右。用完后就暂时不可用啦，取决于大家的使用量。

2. **制定计划**：试试输入“计划”，它能帮你一步步引导思考和行动，超级实用！

3. **上下文管理**：聊太长（>8 k）会自动把上文复制到剪贴板，清空后可继续，不丢记忆。

4. **支持喵喵**：喜欢这只猫，可请它吃罐头：49元/6个月 API 许可。钱会换成 token 做实验，顺便给你预留新功能投票权 [打赏链接](https://docs.qq.com/form/page/DZWtGeVpKUkNuQnVL)。

5. **关于售后**：无客服、不退款、不秒回，有佛系群聊，搜集开发需求和提供使用协助。

`);

// 使用 computed 属性，当 markdownContent 变化时自动重新渲染
const renderedMarkdownContent = computed(() => {
  if (markdownContent.value) {
    // 使用 marked 将 markdown 字符串解析为 HTML
    return marked(markdownContent.value);
  }
  return "";
});

onMounted(async () => {
  await nextTick();
  scrollToBottom();
  inputRef.value?.focus();
});
</script>

<style scoped>
.ai-chat-dialog {
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  overflow-y: auto;
  height: 100%;
  width: 100%;
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
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  margin-bottom: 5px;
}

.message {
  display: flex;
  gap: 12px;
  width: 100%;
  max-width: 100%;
}

.message-content {
  flex: 1;
  display: flex;
}

.message-text {
  border-radius: 6px;
  word-wrap: break-word;
  line-height: 1.6;
  padding-bottom: 4px;
  padding-top: 4px;
}

.message.user .message-content {
  justify-content: flex-end;
}
.message.user .message-text {
  width: 66%;
  background: var(--color-blue-light-transparent);
  color: var(--color-text);
  padding-left: 8px;
}

.message.assistant .message-content {
  padding-left: 2px;
}
/* 内部markdown格式 */
/* 整体的大框 */
:deep(.message-content pre) {
  width: 90%;
  background-color: black;
  border-radius: 8px;
  font-weight: 500;
  padding: 2px;
}
/* 大框内部 */
:deep(.message-content pre code) {
  background-color: inherit;
  font-family: "Microsoft YaHei" "Consolas", "Monaco", "Courier New", monospace;
  font-weight: 500;
  color: white;
}

/* inline代码 */
:deep(.message-content code) {
  background-color: var(--color-background-light-light);
  border-radius: 2px;
  padding: 0.5px;
  font-family: "Microsoft YaHei" "Consolas", "Monaco", "Courier New", monospace;
  font-weight: 600;
}

:deep(.message-text p) {
  margin: 0;
}

/* 输入区固定在底部且不超父容器宽度 */
.chat-input-area {
  display: flex;
  flex-direction: column;
  position: sticky;
  align-items: flex-end;
  bottom: 2px;
  border: 1px solid var(--color-background-dark);
  border-radius: 6px;
  padding: 2px;
  background: var(--color-background);
  width: 100%;
  box-sizing: border-box;
}

.input-container {
  display: flex;
  align-items: flex-end;
  width: 100%;
  box-sizing: border-box;
}

.button-reset {
  display: flex;
  align-items: flex-end;
  margin-right: 6px;
  transform: translateY(4px);
  z-index: 5;
}

.chat-input {
  /* 去掉 hover 时的红色边框 */
  --n-border: 1px solid var(--color-background) !important;
  --n-border-hover: 1px solid var(--color-background) !important;
  /* 去掉 focus 时的红色边框 */
  --n-border-focus: 1px solid var(--color-background) !important;

  /* 去掉 focus 时的灰色阴影框 */
  --n-box-shadow-focus: none !important;
  --n-color-disabled: var(--color-background) !important;
  --n-border-disabled: 1px solid var(--color-background) !important;

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

.icon-tag {
  display: flex;
  padding: 2px;
  border-radius: 4px;
  transition: background-color 0.2s;
}

.icon-tag:hover {
  cursor: pointer;
  background-color: var(--color-blue-light);
}

.n-card > .n-card__footer {
  display: flex;
  justify-content: center;
}

.footer-button {
  transform: translateX(200px);
}
</style>
