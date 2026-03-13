<template>
  <n-modal
    v-model:show="showModal"
    @after-leave="emit('after-leave')"
    class="tag-manager"
    :align-center="!isMobile"
    :style="modalStyle"
    :auto-focus="false"
  >
    <div class="tag-manager-inner">
      <!-- 顶部搜索和新建区域 -->
      <div class="tag-search">
        <n-input primary v-model:value="inputText" placeholder="搜索或新建标签" @keydown.enter="onAddTag" size="medium" clearable>
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

      <!-- 标签列表 + 底部工具条 -->
      <div class="tag-list-wrapper">
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
              <span v-if="editingId !== t.id" @click.stop="startEdit(t)">
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
                  fontSize: '11px',
                }"
                @blur="onEditFinish(t)"
                @input="updateInputWidth"
                @keydown="(e) => handleEditKeydown(e, t)"
                @click.stop
              />

              <!-- 文本颜色选择器 -->
              <n-popover trigger="click" placement="bottom" :style="{ padding: '5px', width: '120px' }" :z-index="10000" :to="true">
                <template #trigger>
                  <n-button text :color="t.color" @click.stop>
                    <n-icon><Heart16Filled /></n-icon>
                  </n-button>
                </template>
                <n-color-picker :value="t.color" :show-alpha="false" @update:value="(color) => onColorUpdate(t.id, 'fg', color)" />
              </n-popover>

              <!-- 背景颜色选择器 -->
              <n-popover trigger="click" placement="bottom" :style="{ padding: '5px', width: '120px' }" :z-index="10000" :to="true">
                <template #trigger>
                  <n-button text @click.stop>
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
        </div>

        <!-- 底部排序和翻页工具条 -->
        <div class="tag-footer">
          <div class="tag-sort">
            <n-button
              text
              :type="sortKey === 'count' && sortDirection === 'desc' ? 'primary' : 'default'"
              @click="setSort('count', 'desc')"
            >
              <n-icon><ArrowSortUp24Filled /></n-icon>
            </n-button>
            <n-button text :type="sortKey === 'count' && sortDirection === 'asc' ? 'primary' : 'default'" @click="setSort('count', 'asc')">
              <n-icon><ArrowSortDown24Filled /></n-icon>
            </n-button>
            <n-button
              text
              quaternary
              :type="sortKey === 'name' && sortDirection === 'asc' ? 'primary' : 'default'"
              @click="setSort('name', 'asc')"
            >
              <n-icon><TextSortAscending16Regular /></n-icon>
            </n-button>
            <n-button
              text
              quaternary
              :type="sortKey === 'name' && sortDirection === 'desc' ? 'primary' : 'default'"
              @click="setSort('name', 'desc')"
            >
              <n-icon><TextSortDescending20Regular /></n-icon>
            </n-button>
          </div>

          <div class="tag-pagination">
            <n-button text size="tiny" :disabled="currentPage <= 1" @click="goPrevPage">
              <n-icon>
                <CaretLeft12Filled />
              </n-icon>
            </n-button>
            <span class="page-info">{{ currentPage }} / {{ totalPages }}</span>
            <n-button text size="tiny" :disabled="currentPage >= totalPages" @click="goNextPage">
              <n-icon>
                <CaretRight12Filled />
              </n-icon>
            </n-button>
          </div>
        </div>
      </div>

      <!-- 用于动态测量编辑输入框宽度的隐藏元素 -->
      <span ref="sizerRef" class="input-sizer">
        {{ editValue }}
      </span>
    </div>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from "vue";
import { useTagStore, type TagWithCount } from "@/stores/useTagStore";
import { useDialog } from "naive-ui";
import {
  TagSearch20Filled,
  Add20Filled,
  HeartCircle16Regular,
  Heart16Filled,
  TagDismiss16Regular,
  CaretLeft12Filled,
  CaretRight12Filled,
  TextSortAscending16Regular,
  TextSortDescending20Regular,
  ArrowSortDown24Filled,
  ArrowSortUp24Filled,
} from "@vicons/fluent";
import { NInput, NButton, NPopover, NColorPicker, NIcon } from "naive-ui";
import { useDevice } from "@/composables/useDevice";

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
const { isMobile } = useDevice();

// 排序与分页
const sortKey = ref<"count" | "name">("count");
const sortDirection = ref<"asc" | "desc">("desc");
const currentPage = ref(1);

const pageSize = computed(() => (isMobile.value ? 16 : 34));
// 弹窗显示：未传 show 时由外层 modal 控制，内层始终显示；传了 show 则跟随父组件
const showModal = computed({
  get: () => (props.show === undefined ? true : !!props.show),
  set: (v) => {
    if (!v) emit("update:show", false);
  },
});

/**
 * 移动端弹窗位置样式：仅占位，具体 top 对齐由 CSS 控制，避免输入法打开时视口变化导致位移
 */
const modalStyle = computed(() => {
  if (!isMobile.value) return {};
  return {};
});

/**
 * 弹窗打开时重置输入与编辑态：确保每次打开都是空白状态
 */
function resetModalState(): void {
  inputText.value = "";
  cancelEdit();
}

watch(
  showModal,
  (visible) => {
    if (visible) resetModalState();
  },
  { immediate: true },
);
// ================================================================
// Computed
// ================================================================

/**
 * 当前已选中的标签 ID 集合，用于在排序时优先展示
 */
const selectedIdSet = computed<Set<number>>(() => new Set(props.modelValue));

/**
 * 根据输入关键词 + 排序配置得到完整标签列表（未分页），并优先显示已选中的标签
 */
const sortedTags = computed<TagWithCount[]>(() => {
  const keyword = inputText.value.trim();
  const baseList = keyword ? tagStore.findByName(keyword) : [...tagStore.allTags];

  return baseList.sort((a, b) => {
    const aSelected = selectedIdSet.value.has(a.id) ? 1 : 0;
    const bSelected = selectedIdSet.value.has(b.id) ? 1 : 0;

    // 已选中的标签优先显示
    if (aSelected !== bSelected) {
      return bSelected - aSelected;
    }

    if (sortKey.value === "count") {
      const diff = sortDirection.value === "desc" ? b.count - a.count : a.count - b.count;
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    } else {
      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) {
        return sortDirection.value === "desc" ? -nameCompare : nameCompare;
      }
      return b.count - a.count;
    }
  });
});

/**
 * 当前页的标签列表（分页后）
 */
const filteredTags = computed<TagWithCount[]>(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return sortedTags.value.slice(start, end);
});

/**
 * 总页数
 */
const totalPages = computed(() => {
  if (sortedTags.value.length === 0) return 1;
  return Math.max(1, Math.ceil(sortedTags.value.length / pageSize.value));
});

// 当输入、排序或设备类型变化时，重置到第 1 页
watch([inputText, sortKey, sortDirection, isMobile], () => {
  currentPage.value = 1;
});

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

  // 点击选中/取消选中时，若有搜索内容则清空
  if (inputText.value.trim()) {
    inputText.value = "";
  }
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

/**
 * 设置排序方式
 */
function setSort(key: "count" | "name", direction: "asc" | "desc"): void {
  sortKey.value = key;
  sortDirection.value = direction;
}

/**
 * 上一页
 */
function goPrevPage(): void {
  if (currentPage.value > 1) {
    currentPage.value -= 1;
  }
}

/**
 * 下一页
 */
function goNextPage(): void {
  if (currentPage.value < totalPages.value) {
    currentPage.value += 1;
  }
}
</script>

<style scoped>
.tag-manager {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 300px;
  overflow-x: hidden;
  padding: 10px 12px;
  border-radius: 6px;
  background-color: var(--color-background);
  width: 450px;
}

.tag-manager-inner {
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 300px;
  height: 360px;
  box-sizing: border-box;
  overflow-x: hidden;
}

/* 列表+底部栏容器：占满剩余高度，底部栏固定在最下方 */
.tag-list-wrapper {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.tag-search {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

/* 标签列表：可滚动区域，高度由父级约束，保证底部 footer 始终可见 */
.tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;
  padding-left: 2px;
  padding-bottom: 8px; /* 留出最后一排阴影空间 */
  align-content: flex-start;
  flex: 1;
  min-height: 0; /* flex 子项可被压缩，才能产生滚动 */
  overflow-y: hidden;
  overflow-x: hidden;
}

.custom-tag {
  overflow: visible;
  display: flex;
  align-items: center;
  border-radius: 16px;
  padding: 4px 6px;
  height: 24px;
  margin: 0;
  font-size: 14px;
  flex: 0 1 auto;
  max-width: calc(45%);
  box-sizing: border-box;
  min-width: 0;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
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
  box-shadow: 0 6px 4px rgba(255, 255, 255, 0.3);
}

/* “未选中”标签的固定样式 */
.custom-tag:not(.selected) {
  transform: translateY(-2px);
  box-shadow: 0 4px 4px rgba(0, 0, 0, 0.3);
}

/* “已选中”标签的固定样式 */
.custom-tag.selected {
  transform: translateY(-2px);
  border-bottom: 2px solid var(--color-text-secondary);
  border-left: 2px solid var(--color-text-secondary);
  box-shadow: 4px 0px 0px 0px var(--color-background) inset;
}

/* 悬浮在“已选中”的标签上时的增强效果 */
.custom-tag.selected:hover {
  transform: translateY(-2px);
  cursor: default;
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

/* 底部工具条：固定在最下方，无论列表多高都始终可见 */
.tag-footer {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding-top: 0px;
  margin-top: auto; /* 在弹性布局中贴底，与 .tag-suggestions 的 flex:1 配合 */
}

.tag-sort {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  flex-shrink: 0;
  margin-left: 8px;
}

.tag-sort-label {
  color: var(--color-text-secondary);
}

.tag-pagination {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
  font-family: Consolas, "Courier New", Courier, monospace;
  line-height: 1;
}

.page-info {
  min-width: 52px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

/* 移动端优化：确保颜色选择器在屏幕上居中显示，避免被遮挡 */
@media (max-width: 768px) {
  .tag-manager {
    width: 100%;
    max-width: 100%;
    border-radius: 0;
    max-height: 80vh;
    /* 始终贴顶部，不随输入法导致的视口变化而上下居中 */
    align-self: flex-start !important;
    margin: 8px auto 0 auto !important;
  }

  .tag-manager-inner {
    height: 100%;
  }

  :deep(.n-popover) {
    position: fixed !important;
    left: 50% !important;
    top: 50% !important;
    transform: translate(-50%, -50%) !important;
    max-width: min(90vw, 300px);
    max-height: min(90vh, 400px);
    overflow-y: auto;
    z-index: 10000 !important;
  }

  :deep(.n-color-picker) {
    width: 100%;
  }
}
</style>
