<template>
  <n-modal v-model:show="showModal" @after-leave="emit('after-leave')" class="tag-manager">
    <div class="tag-manager-inner">
      <!-- 顶部搜索和新建区域 -->
      <div class="tag-search">
        <n-input
          primary
          type="text"
          v-model:value="inputText"
          placeholder="搜索或新建标签"
          @keydown.enter="onAddTag"
          size="medium"
          clearable
        >
          <template #prefix>
            <n-icon color="var(--color-text)">
              <TagSearch20Filled />
            </n-icon>
          </template>
        </n-input>
        <n-button primary type="info" :disabled="!inputText.trim()" @click="onAddTag" title="增加标签">
          <n-icon size="18px"><Add20Filled /></n-icon>
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
            <span v-if="editingId !== t.id" @dblclick.stop="startEdit(t)">
              {{ t.name }}
            </span>

            <!-- 标签名编辑输入框（编辑态） -->
            <n-input
              v-else
              v-model:value="editValue"
              size="tiny"
              :style="{
                width: editInputWidth + 'px',
                minWidth: '30px',
                transition: 'width 0.2s',
              }"
              @blur="onEditFinish(t)"
              @input="updateInputWidth"
              @keydown="(e) => handleEditKeydown(e, t)"
              @click.stop
            />

            <!-- 文本颜色选择器 -->
            <n-popover trigger="click" placement="bottom" :style="{ padding: '10px', width: '200px' }">
              <template #trigger>
                <n-button text :color="t.color" @click.stop>
                  <n-icon><Heart16Filled /></n-icon>
                </n-button>
              </template>
              <n-color-picker :value="t.color" :show-alpha="false" @update:value="(color) => onColorUpdate(t.id, 'fg', color)" />
            </n-popover>

            <!-- 背景颜色选择器 -->
            <n-popover trigger="click" placement="bottom" :style="{ width: '200px' }">
              <template #trigger>
                <n-button text @click.stop>
                  <n-icon><HeartCircle16Regular /></n-icon>
                </n-button>
              </template>
              <n-color-picker :value="t.backgroundColor" :show-alpha="false" @update:value="(color) => onColorUpdate(t.id, 'bg', color)" />
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
        <div v-for="idx in emptyCount" :key="'empty-tag-' + idx" class="custom-tag empty-tag">-</div>
      </div>

      <!-- 用于动态测量编辑输入框宽度的隐藏元素 -->
      <span ref="sizerRef" class="input-sizer">
        {{ editValue }}
      </span>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useTagStore, type TagWithCount } from "@/stores/useTagStore";
import { useDialog } from "naive-ui";
import { TagSearch20Filled, Add20Filled, HeartCircle16Regular, Heart16Filled, TagDismiss16Regular } from "@vicons/fluent";
import { NInput, NButton, NPopover, NColorPicker, NIcon } from "naive-ui";

// ================================================================
// 初始化
// ================================================================
const tagStore = useTagStore();
const dialog = useDialog();

// ================================================================
// Props & Emits
// ================================================================
const props = defineProps<{
  modelValue: number[];
  show?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: number[]];
  "update:show": [value: boolean];
  "after-leave": [];
}>();

// ================================================================
// 组件状态
// ================================================================
const inputText = ref("");
const editingId = ref<number | null>(null);
const editValue = ref("");
const editInputWidth = ref(40);
const sizerRef = ref<HTMLElement | null>(null);
// 弹窗显示：未传 show 时由外层 modal 控制，内层始终显示；传了 show 则跟随父组件
const showModal = computed({
  get: () => (props.show === undefined ? true : !!props.show),
  set: (v) => {
    if (!v) emit("update:show", false);
  },
});
// ================================================================
// Computed
// ================================================================

/**
 * 根据输入关键词过滤标签列表
 * 如果无输入，显示引用次数最多的前 20 个
 */
const filteredTags = computed<TagWithCount[]>(() => {
  const keyword = inputText.value.trim();
  if (keyword) {
    return tagStore.findByName(keyword);
  }
  return [...tagStore.allTags].sort((a, b) => b.count - a.count).slice(0, 20);
});

/**
 * 计算空位数量以维持布局稳定（最少显示 10 个位置）
 */
const emptyCount = computed(() => Math.max(0, 10 - filteredTags.value.length));

// ================================================================
// Methods
// ================================================================

/**
 * 检查标签是否已被选中
 */
function isTagSelected(tagId: number): boolean {
  return props.modelValue.includes(tagId);
}

/**
 * 点击标签切换选中状态
 */
function onClickTag(tag: TagWithCount): void {
  if (editingId.value === tag.id) return;

  const current = [...props.modelValue];
  const idx = current.indexOf(tag.id);

  if (idx === -1) {
    current.push(tag.id);
  } else {
    current.splice(idx, 1);
  }

  emit("update:modelValue", current);
}

/**
 * 新建或选择标签
 */
function onAddTag(): void {
  const input = inputText.value.trim().replace(/^#+/, "");
  if (!input) return;

  const exist = tagStore.findByName(input).find((t) => t.name.toLowerCase() === input.toLowerCase());

  if (exist) {
    // 已存在 -> 选中（去重）
    emit("update:modelValue", Array.from(new Set([...props.modelValue, exist.id])));
  } else {
    // 新建标签并选中
    const tag = tagStore.addTag(input, "#333", "#eee");
    if (tag) {
      emit("update:modelValue", Array.from(new Set([...props.modelValue, tag.id])));
    }
  }

  inputText.value = "";
}

/**
 * 进入编辑态
 */
function startEdit(tag: TagWithCount): void {
  editingId.value = tag.id;
  editValue.value = tag.name;
  nextTick(() => {
    updateInputWidth();
  });
}

/**
 * 完成编辑（失焦或回车）
 */
function onEditFinish(tag: TagWithCount): void {
  const newVal = editValue.value.trim().replace(/^#+/, "");
  if (newVal && newVal !== tag.name) {
    tagStore.updateTagById(tag.id, { name: newVal });
  }
  cancelEdit();
}

/**
 * 取消编辑（ESC 或手动调用）
 */
function cancelEdit(): void {
  editingId.value = null;
  editValue.value = "";
  editInputWidth.value = 40;
}

/**
 * 编辑输入变化时更新宽度
 */
function updateInputWidth(): void {
  nextTick(() => {
    if (!sizerRef.value) return;
    const width = Math.max(40, Math.min(240, sizerRef.value.offsetWidth + 20));
    editInputWidth.value = width;
  });
}

/**
 * 更新标签颜色
 */
function onColorUpdate(tagId: number, target: "fg" | "bg", color: string): void {
  if (target === "bg") {
    tagStore.updateTagById(tagId, { backgroundColor: color });
  } else {
    tagStore.updateTagById(tagId, { color });
  }
}

/**
 * 删除标签确认
 */
function confirmRemoveTag(tag: TagWithCount): void {
  const content =
    tag.count > 0
      ? `此标签正被 ${tag.count} 个条目使用。确定要删除标签 "${tag.name}" 吗？删除后引用将丢失。`
      : `确定要删除标签 "${tag.name}" 吗？`;

  dialog.warning({
    title: "确认删除",
    content,
    positiveText: "确认删除",
    negativeText: "取消",
    onPositiveClick: () => {
      tagStore.removeTag(tag.id);

      // 如果当前被选中，从选中列表移除
      const next = props.modelValue.filter((id) => id !== tag.id);
      if (next.length !== props.modelValue.length) {
        emit("update:modelValue", next);
      }
    },
  });
}

function handleEditKeydown(e: KeyboardEvent, tag: TagWithCount): void {
  if (e.key === "Enter") {
    e.preventDefault();
    onEditFinish(tag);
  } else if (e.key === "Escape") {
    cancelEdit();
  }
}
</script>

<style scoped>
.tag-manager {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 200px;
  overflow-x: hidden;
  padding: 10px 12px;
  background-color: var(--color-background);
  width: 400px;
}

.tag-manager-inner {
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 200px;
  box-sizing: border-box;
  overflow-x: hidden;
}

.tag-search {
  display: flex;
  gap: 6px;
}

.tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 14px;
  padding-left: 2px;
  overflow-y: auto;
  overflow: visible;
  padding-bottom: 5px;
}

.custom-tag {
  overflow: visible;
  display: flex;
  align-items: center;
  border-radius: 16px;
  padding: 2px 6px;
  height: 20px;
  margin: 2px 0;
  font-size: 14px;
  flex: 0 1 auto;
  max-width: calc(35%);
  box-sizing: border-box;
  min-width: 0;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

/* 仅对标签名做省略，不作用到 .tag-count */
.custom-tag > span:not(.tag-count) {
  user-select: none;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.tag-count {
  font-size: 12px;
  align-items: center;
  font-family: "Courier New", Courier, monospace;
  font-weight: bold;
  padding-left: 2px;
  flex-shrink: 0;
  white-space: nowrap;
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
  border-bottom: 2px solid var(--color-text-primary);
  box-shadow: 4px 0px 0px 0px var(--color-text-secondary) inset;
}

/* 悬浮在“已选中”的标签上时的增强效果 */
.custom-tag.selected:hover {
  transform: translateY(-2px);
  /* box-shadow: 0 2px 2px rgba(0, 0, 0, 0.12); */
  cursor: default;
}

.custom-tag.empty-tag {
  background: transparent !important;
  box-shadow: none !important;
  border-color: transparent !important;
  pointer-events: none;
  opacity: 0;
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
</style>
