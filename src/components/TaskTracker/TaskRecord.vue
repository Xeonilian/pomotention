<!-- TaskRecord.vue -->
<template>
  <div class="task-record">
    <div
      v-if="!isEditing"
      class="markdown-content"
      :class="{ disabled: !taskId }"
      @click="handleClick"
    >
      <div v-if="!taskId" class="placeholder">尚未启动任务追踪</div>
      <div v-else-if="!content" class="placeholder">
        点击此处编辑任务描述...
      </div>
      <div v-else v-html="renderedMarkdown"></div>
    </div>
    <textarea
      v-else
      ref="textarea"
      v-model="content"
      class="task-textarea"
      :placeholder="'点击此处编辑任务描述...'"
      @blur="stopEditing"
    ></textarea>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { marked } from "marked";

// 配置 marked 选项
marked.setOptions({
  breaks: true,
  gfm: true,
});

// 添加自定义渲染器
const renderer = new marked.Renderer();
renderer.checkbox = function ({ checked }: { checked: boolean }) {
  return `<input type="checkbox" class="markdown-checkbox" ${
    checked ? "checked" : ""
  }>`;
};
marked.setOptions({ renderer });

const props = defineProps<{
  taskId: number | null;
  initialContent: string;
  isMarkdown: boolean;
}>();

const emit = defineEmits<{
  (e: "update:content", content: string): void;
  (e: "toggle-markdown"): void;
}>();

const content = ref(props.initialContent);
const isEditing = ref(false);
const textarea = ref<HTMLTextAreaElement | null>(null);

const renderedMarkdown = computed(() => {
  return marked(content.value);
});

// 添加一个函数来处理checkbox的点击
const handleCheckboxClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (
    target.tagName === "INPUT" &&
    target.getAttribute("type") === "checkbox"
  ) {
    event.preventDefault();
    event.stopPropagation();

    const checkbox = target as HTMLInputElement;
    const listItem = checkbox.closest("li");
    if (!listItem) return;

    const line = listItem.textContent?.trim() || "";
    const newContent = content.value
      .split("\n")
      .map((line) => {
        const checkboxMatch = line.match(/^- \[([ x])\] (.*)$/);
        if (checkboxMatch && checkboxMatch[2].trim() === line.trim()) {
          return `- [${checkbox.checked ? "x" : " "}] ${checkboxMatch[2]}`;
        }
        return line;
      })
      .join("\n");

    content.value = newContent;
    emit("update:content", content.value);
  }
};

watch(
  () => props.initialContent,
  (newContent) => {
    content.value = newContent;
  }
);

const startEditing = () => {
  isEditing.value = true;
  nextTick(() => {
    textarea.value?.focus();
  });
};

const stopEditing = () => {
  isEditing.value = false;
  emit("update:content", content.value);
};

onMounted(() => {
  document.addEventListener("click", handleCheckboxClick);
});

onUnmounted(() => {
  document.removeEventListener("click", handleCheckboxClick);
});

const handleClick = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  console.log("点击目标元素:", target);
  console.log("目标元素标签名:", target.tagName);
  console.log("目标元素类名:", target.className);

  // 如果点击的是checkbox，不触发编辑模式
  if (
    target.tagName === "INPUT" &&
    target.getAttribute("type") === "checkbox"
  ) {
    console.log("检测到checkbox点击，阻止编辑模式");
    return;
  }

  // 只有在非checkbox点击且taskId存在时才进入编辑模式
  if (props.taskId) {
    console.log("进入编辑模式");
    startEditing();
  }
};
</script>

<style scoped>
.task-record {
  width: 100%;
  min-height: 200px;
  margin: 0px 0;
  overflow: hidden; /* 防止出现滚动条 */
}

.markdown-content {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  min-height: 200px;
  cursor: text;
  box-sizing: border-box;
  font-weight: normal; /* 确保字体不会变粗 */
}

.task-textarea {
  width: 100%;
  min-height: 200px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  resize: vertical;
  font-family: inherit;
  font-weight: normal;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 1.6;
  overflow: hidden;
  outline: 1px solid #ff2121; /* 更细腻的 outline */
}

:deep(.markdown-content) {
  line-height: 1.6;
}

:deep(.markdown-content h1),
:deep(.markdown-content h2),
:deep(.markdown-content h3) {
  margin-top: 1em;
  margin-bottom: 0.5em;
}

:deep(.markdown-content p) {
  margin: 0 0;
}

:deep(.markdown-content ul),
:deep(.markdown-content ol) {
  padding-left: 2em;
  margin: 0.5em 0;
}

:deep(.markdown-checkbox) {
  margin-right: 8px;
  vertical-align: middle;
  cursor: pointer;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  border: 1px solid #d9d9d9;
  background-color: #fff;
  position: relative;
  display: inline-block;
  vertical-align: middle;
  cursor: pointer;
  transition: all 0.3s;
  appearance: none;
  -webkit-appearance: none;
}

:deep(.markdown-checkbox:checked) {
  background-color: #1890ff;
  border-color: #1890ff;
}

:deep(.markdown-checkbox:checked::after) {
  content: "";
  position: absolute;
  left: 4px;
  top: 1px;
  width: 5px;
  height: 10px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

:deep(.markdown-checkbox:not(:checked)::after) {
  content: none;
}

:deep(.markdown-checkbox:disabled) {
  cursor: pointer;
  opacity: 1;
}

.placeholder {
  color: #999;
  font-style: italic;
}

.markdown-content.disabled {
  cursor: not-allowed;
  background-color: #f5f5f5;
}
</style>
