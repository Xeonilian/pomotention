<template>
  <div class="tag-selector" ref="selectorRef">
    <!-- 标签列表 -->
    <div
      v-for="(tag, index) in filteredTags"
      :key="tag.id"
      class="tag-option"
      :class="{ highlighted: highlightedIndex === index }"
      @click="$emit('select-tag', tag.id)"
      @mouseenter="highlightedIndex = index"
    >
      <div class="tag-color-dot" :style="{ backgroundColor: tag.color }"></div>
      <span class="tag-name">{{ tag.name }}</span
      ><span class="tag-count">[{{ tag.count }}]</span>
    </div>

    <!-- 创建新标签的选项 -->
    <div
      v-if="allowCreate && searchTerm.trim() && !tagExists"
      class="tag-option create-option"
      :class="{ highlighted: highlightedIndex === filteredTags.length }"
      @click="$emit('create-tag', searchTerm.trim())"
      @mouseenter="highlightedIndex = filteredTags.length"
    >
      <n-icon><Add20Filled /></n-icon>
      <span>"{{ searchTerm.trim() }}"</span>
    </div>

    <!-- 无匹配且不允许创建时的提示 -->
    <div
      v-if="
        searchTerm.trim() &&
        filteredTags.length === 0 &&
        (!allowCreate || !searchTerm.trim() || tagExists)
      "
      class="no-results"
    >
      无标签
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useTagStore } from "@/stores/useTagStore";
import { NIcon } from "naive-ui";
import { Add20Filled } from "@vicons/fluent";
import type { Tag } from "@/core/types/Tag";

// --- Props & Emits ---
const props = defineProps<{
  searchTerm: string;
  allowCreate: boolean;
}>();

const emit = defineEmits<{
  "select-tag": [id: number];
  "create-tag": [name: string];
  "close-selector": [];
}>();

// --- State ---
const tagStore = useTagStore();
const selectorRef = ref<HTMLElement | null>(null);
const highlightedIndex = ref(0); // 追踪高亮项的索引

// --- Computed ---
const filteredTags = computed<Tag[]>(() => {
  const searchTerm = props.searchTerm.trim();
  if (!searchTerm || searchTerm === "#") {
    return [...tagStore.allTags]
      .sort((a, b) => (b.count || 0) - (a.count || 0))
      .slice(0, 10);
  }

  return tagStore.findByName(props.searchTerm);
});

const tagExists = computed(() => {
  return filteredTags.value.some(
    (t) => t.name.toLowerCase() === props.searchTerm.trim().toLowerCase()
  );
});

// 计算选项总数，包括“创建”选项
const totalOptions = computed(() => {
  const baseCount = filteredTags.value.length;
  if (props.allowCreate && props.searchTerm.trim() && !tagExists.value) {
    return baseCount + 1;
  }
  return baseCount;
});

// --- Watchers ---
// 当搜索词变化时，重置高亮位置到顶部
watch(
  () => props.searchTerm,
  () => {
    highlightedIndex.value = 0;
  }
);

// --- Methods ---
function navigateDown() {
  if (totalOptions.value === 0) return;
  highlightedIndex.value = (highlightedIndex.value + 1) % totalOptions.value;
}

function navigateUp() {
  if (totalOptions.value === 0) return;
  highlightedIndex.value =
    (highlightedIndex.value - 1 + totalOptions.value) % totalOptions.value;
}

function selectHighlighted() {
  if (highlightedIndex.value < filteredTags.value.length) {
    // 情况1：选中一个已存在的标签
    const selectedTag = filteredTags.value[highlightedIndex.value];
    if (selectedTag) {
      emit("select-tag", selectedTag.id);
    }
  } else {
    // 情况2：选中了“创建新标签”
    if (props.allowCreate && props.searchTerm.trim() && !tagExists.value) {
      emit("create-tag", props.searchTerm.trim());
    }
  }
}

function close() {
  emit("close-selector");
}

// 暴露方法给父组件 (ActivitySection) 调用
defineExpose({
  navigateDown,
  navigateUp,
  selectHighlighted,
  close,
});
</script>

<style scoped>
.tag-selector {
  width: 160px;
  background-color: var(--n-color);
  border-radius: 6px;
  box-shadow: var(--n-box-shadow-focus);
  padding: 4px;
  outline: none; /* 移除聚焦时的蓝色边框 */
}

.tag-option {
  display: flex;
  align-items: center;
  padding: 4px 4px;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
  font-family: "Consolas", Consolas, monospace;
}

.tag-option.highlighted {
  background-color: var(--n-color-hover);
}

.create-option {
  color: var(--n-info-color);
}

.create-option .n-icon {
  margin-right: 8px;
}

.tag-color-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  margin-right: 10px;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.tag-count {
  margin-left: auto;
}

.tag-name {
  text-overflow: ellipsis;
}

.no-results {
  padding: 12px;
  text-align: center;
  color: var(--n-text-color-disabled);
}

.tag-option.highlighted {
  background: #d5e8ff !important; /* 明亮蓝色背景，你喜欢的色可自选 */
  color: #222; /* 或你主题里的高亮色，也可加粗字体等 */
  font-weight: bold;
  border-left: 3px solid #409eff;
}
</style>
