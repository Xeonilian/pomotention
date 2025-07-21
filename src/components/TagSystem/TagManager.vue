<template>
  <div class="tag-manager">
    <!-- 顶部搜索和新建区域 -->
    <div class="tag-search">
      <n-input
        v-model:value="inputText"
        placeholder="搜索或新建标签"
        @input="onInput"
        @keydown.enter="onAddTag"
        size="medium"
        clearable
        style="width: 100%"
      >
        <template #prefix>
          <n-icon color="var(--color-text)">
            <TagSearch20Filled />
          </n-icon>
        </template>
      </n-input>
      <n-button
        type="info"
        secondary
        :disabled="!inputText.trim()"
        @click="onAddTag"
        title="增加标签"
      >
        <n-icon size="18px"> <Add20Filled /></n-icon>
      </n-button>
    </div>

    <!-- 标签列表显示区域 -->
    <div class="tag-suggestions">
      <template v-for="t in filteredTags" :key="t.id">
        <div
          class="custom-tag"
          :class="{ selected: isTagSelected(t.id) }"
          :style="{
            color: t.color,
            backgroundColor: t.backgroundColor,
          }"
          @click="onClickTag(t)"
        >
          <!-- 标签名显示，双击可进入编辑状态 -->
          <span
            v-if="editingId !== t.id"
            @dblclick.stop="startEdit(t)"
            style="
              max-width: 110px;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
            "
          >
            {{ t.name }}
          </span>
          <!-- 标签名编辑输入框 -->
          <n-input
            v-else
            v-model:value="editValue"
            size="tiny"
            :style="{
              width: editInputWidth(t) + 'px',
              minWidth: '30px',
              transition: 'width 0.2s',
            }"
            ref="editInputRef"
            autofocus
            @blur="onEditFinish(t)"
            @input="onEditInput"
            @keydown.enter.prevent="onEditFinish(t)"
          />

          <!-- 文本颜色选择器 -->
          <n-popover
            trigger="click"
            placement="bottom"
            :style="{ padding: '10px', width: '240px' }"
          >
            <template #trigger>
              <n-button text :color="t.color">
                <n-icon><Heart16Filled /></n-icon>
              </n-button>
            </template>
            <n-color-picker
              :value="t.color"
              :show-alpha="false"
              @update:value="(color) => onColorUpdate(t.id, 'fg', color)"
            />
          </n-popover>

          <!-- 背景颜色选择器 -->
          <n-popover
            trigger="click"
            placement="bottom"
            :style="{ width: '200px' }"
          >
            <template #trigger>
              <n-button text>
                <n-icon><HeartCircle16Regular /></n-icon>
              </n-button>
            </template>
            <n-color-picker
              :value="t.backgroundColor"
              :show-alpha="false"
              @update:value="(color) => onColorUpdate(t.id, 'bg', color)"
            />
          </n-popover>

          <!-- 删除按钮，点击弹出确认对话框 -->
          <n-button text @click.stop="confirmRemoveTag(t)">
            <n-icon><TagDismiss16Regular /></n-icon>
          </n-button>

          <!-- 标签引用计数 -->
          <span class="tag-count">[{{ t.count }}]</span>
        </div>
      </template>

      <!-- 用于保证列表高度稳定的透明占位符 -->
      <div
        v-for="idx in emptyCount"
        :key="'empty-tag-' + idx"
        class="custom-tag empty-tag"
      >
        -
      </div>
    </div>

    <!-- 用于动态测量编辑输入框宽度的隐藏元素 -->
    <span ref="sizerRef" class="input-sizer">
      {{ editValue || editingTagName }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useTagStore } from "@/stores/useTagStore";
import { useDialog } from "naive-ui";
import {
  TagSearch20Filled,
  Add20Filled,
  HeartCircle16Regular,
  Heart16Filled,
  TagDismiss16Regular,
} from "@vicons/fluent";
import { NInput, NButton, NPopover, NColorPicker, NIcon } from "naive-ui";
import type { Tag } from "@/core/types/Tag";

// 初始化 store 和 naive-ui 的 dialog 服务
const tagStore = useTagStore();
const dialog = useDialog();

// 组件内部状态 ref
const inputText = ref("");
const editingId = ref<number | null>(null);
const editValue = ref("");
const editingTagName = ref(""); // 存储原始标签名，用于计算宽度
const editInputRef = ref<InstanceType<typeof NInput> | null>(null);
const sizerRef = ref<HTMLElement | null>(null);

// 定义 props 和 emits，用于与父组件进行 v-model 通信
const props = defineProps<{
  modelValue: number[]; // 已选中的标签 ID 数组
}>();

const emit = defineEmits<{
  "update:modelValue": [value: number[]];
}>();

// 根据输入文本动态过滤标签列表
// 如果无输入，则显示引用次数最多的前10个
const filteredTags = computed(() => {
  if (inputText.value.trim()) {
    return tagStore.findByName(inputText.value);
  }
  return [...tagStore.allTags]
    .sort((a, b) => (b.count || 0) - (a.count || 0))
    .slice(0, 20);
});

// 计算需要多少个空位来补满10个，以维持布局稳定
const emptyCount = computed(() => Math.max(0, 10 - filteredTags.value.length));

// 检查某个标签 ID 是否在 props.modelValue 中，即是否已被选中
function isTagSelected(tagId: number): boolean {
  return props.modelValue.includes(tagId);
}

// 单击标签时触发，用于切换选中状态
function onClickTag(tag: Tag) {
  const currentTagIds = [...props.modelValue];
  const index = currentTagIds.indexOf(tag.id);

  if (index > -1) {
    // 如果已选中，则取消选中
    currentTagIds.splice(index, 1);
  } else {
    // 如果未选中，则添加选中
    currentTagIds.push(tag.id);
  }
  emit("update:modelValue", currentTagIds);
}

// 处理搜索框的输入事件
function onInput(val: string) {
  inputText.value = val;
}

// 处理新建或选择标签的逻辑
function onAddTag() {
  const input = inputText.value.trim().replace(/^#+/, "");
  if (!input) return;

  const exist = tagStore
    .findByName(input)
    .find((t) => t.name.toLowerCase() === input.toLowerCase());

  if (exist) {
    return;
  } else {
    // 如果标签不存在，则创建新标签并选中它
    const newTag = tagStore.addTag(input, "#333", "#eee");
    if (newTag && !isTagSelected(newTag.id)) {
      onClickTag(newTag);
      tagStore.setTagCount(newTag.id, 1);
    }
    inputText.value = "";
  }
}

// --- 标签编辑相关函数 ---

function startEdit(tag: Tag) {
  editingId.value = tag.id;
  editValue.value = tag.name;
  editingTagName.value = tag.name;
  nextTick(() => {
    updateInputWidth();
    editInputRef.value?.focus();
  });
}

function onEditFinish(tag: Tag) {
  const newVal = editValue.value.trim().replace(/^#+/, "");
  if (newVal && newVal !== tag.name) {
    tagStore.updateTag(tag.id, { name: newVal });
  }
  editingId.value = null;
  editValue.value = "";
  editingTagName.value = "";
}

function onEditInput() {
  updateInputWidth();
}

// --- 颜色更新 ---

function onColorUpdate(tagId: number, target: "fg" | "bg", color: string) {
  if (target === "bg") {
    tagStore.updateTag(tagId, { backgroundColor: color });
  } else {
    tagStore.updateTag(tagId, { color: color });
  }
}

// --- 删除确认 ---

function confirmRemoveTag(tag: Tag) {
  const content =
    tag.count > 0
      ? `此标签正被 ${tag.count} 个条目使用。确定要删除标签 "${tag.name}" 吗？删除后引用将丢失。`
      : `确定要删除标签 "${tag.name}" 吗？`;

  dialog.warning({
    title: "确认删除",
    content: content,
    positiveText: "确认删除",
    negativeText: "取消",
    onPositiveClick: () => {
      tagStore.removeTag(tag.id);
    },
  });
}

// --- 编辑输入框宽度自适应 ---

function editInputWidth(t?: Tag) {
  if (editingId.value === t?.id && sizerRef.value) {
    return Math.max(32, sizerRef.value.offsetWidth);
  }
  return 40; // 默认宽度
}

function updateInputWidth() {
  // nextTick 确保 DOM 更新后才计算宽度
  nextTick(() => {});
}
</script>

<style scoped>
.tag-manager {
  width: 400px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 220px;
}

.tag-search {
  display: flex;
  gap: 6px;
  width: 370px;
}

.tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 14px;
  padding-left: 2px;
  width: 380px;
  overflow-y: auto;
  padding-bottom: 5px;
}

.custom-tag {
  display: flex;
  align-items: center;
  border-radius: 16px;
  padding: 0 6px;
  height: 28px;
  font-size: 15px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  border: 2px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

/* 悬浮在“未选中”的标签上时的效果 */
.custom-tag:not(.selected):hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow: 0 6px 4px rgba(0, 0, 0, 0.3);
}

/* “未选中”标签的固定样式 */
.custom-tag:not(.selected) {
  transform: translateY(-2px);
  box-shadow: 0 4px 4px rgba(0, 0, 0, 0.3);
}

/* “已选中”标签的固定样式 */
.custom-tag.selected {
  transform: translateY(-2px);
  border: 2px solid var(--color-backgroud-dark);
}

/* 悬浮在“已选中”的标签上时的增强效果 */
.custom-tag.selected:hover {
  transform: translateY(-2px);
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.12);
}

.custom-tag.empty-tag {
  background: transparent !important;
  box-shadow: none !important;
  border-color: transparent !important;
  pointer-events: none;
  opacity: 0;
}

.custom-tag span {
  padding: 0 4px;
  user-select: none;
}

.input-sizer {
  position: absolute;
  visibility: hidden;
  white-space: pre;
  font-size: 13px;
  font-family: inherit;
  font-weight: 500;
  padding: 0 7px;
  pointer-events: none;
}

.tag-count {
  font-size: 12px;
  align-items: center;
  font-family: "Courier New", Courier, monospace;
  font-weight: bold;
  padding-left: 2px;
}
</style>
