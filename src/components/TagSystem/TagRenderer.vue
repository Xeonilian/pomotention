<template>
  <div class="tag-container">
    <n-tag
      v-for="tag in renderedTags"
      :key="tag.id"
      round
      :size="props.size || 'small'"
      :closable="props.isCloseable"
      :title="getTagTitle(tag)"
      @close="removeTag(tag.id)"
      @click.stop="handleTagClick(tag.id)"
      class="tag-item"
      :style="{
        color: tag.color,
        backgroundColor: tag.backgroundColor,
        // border: `1px solid ${tag.color}`,
        border: 'none !important',
        // boxShadow: props.displayLength === null || props.displayLength === 0 ? `3px -2px 0px 0px ${tag.color} inset` : 'none',
      }"
      displayLength="props.displayLength || null"
    >
      {{ truncatedName(tag.name) }}
    </n-tag>
  </div>
</template>
<script setup lang="ts">
import { NTag } from "naive-ui";
import { useTagStore, type TagWithCount } from "@/stores/useTagStore";
import { computed } from "vue";
import { storeToRefs } from "pinia";

// ================================================================
// Props & Emits
// ================================================================
const props = defineProps<{
  tagIds: number[];
  isCloseable: boolean;
  size?: "medium" | "small" | "large" | "tiny";
  displayLength?: number | null; // ✅ 允许 null
  showIdx?: number;
  title?: string;
}>();

const emit = defineEmits<{
  "remove-tag": [tagId: number];
  "tag-click": [tagId: number];
}>();

// ================================================================
// Store
// ================================================================
const tagStore = useTagStore();
const { allTags } = storeToRefs(tagStore); // ✅ 使用 allTags 而不是 tags

// ================================================================
// Computed
// ================================================================

/**
 * 根据 tagIds 渲染对应的标签
 * 支持特殊 ID 0（显示为空标签）
 * 支持 showIdx 限制显示数量
 */
const renderedTags = computed(() => {
  // 创建 tagId -> tag 的映射
  const tagMap = new Map(allTags.value.map((t) => [t.id, t]));

  // 映射 tagIds 到实际的 tag 对象
  const result = props.tagIds
    .map((id) => {
      // 特殊处理 ID 0：显示空标签
      if (id === 0) {
        return {
          id: 0,
          name: "",
          color: "var(--color-background-dark)",
          backgroundColor: "var(--color-background-dark)",
          count: 0, // ✅ 添加 count 属性
          deleted: false,
          synced: true,
          lastModified: Date.now(),
        } as TagWithCount;
      }
      return tagMap.get(id);
    })
    .filter((tag): tag is TagWithCount => tag !== undefined); // ✅ 类型守卫

  // 如果指定了 showIdx，只显示前 n 个
  const n = props.showIdx;
  if (n == null || n <= 0) return result;
  return result.slice(0, n);
});

// ================================================================
// Methods
// ================================================================

/**
 * 移除标签
 */
function removeTag(tagId: number): void {
  emit("remove-tag", tagId);
}

/**
 * 截断标签名称
 */
function truncatedName(tagName: string): string {
  if (props.displayLength === null || props.displayLength === undefined) {
    return tagName;
  }
  return tagName.slice(0, props.displayLength);
}

/**
 * 标签点击事件
 */
function handleTagClick(tagId: number): void {
  emit("tag-click", tagId);
}

/**
 * 获取标签的 title（悬停提示）
 */
function getTagTitle(tag: TagWithCount): string {
  if (props.title) {
    return props.title;
  }
  return tag.name;
}
</script>
<style scoped>
.tag-container {
  display: flex;
  overflow: visible;
  gap: 4px;
}
.tag-item {
  transition: transform 0.2s;
  font-size: 12px;
  font-family: "Consolas", Consolas, monospace;
}
.tag-item:hover {
  transform: scale(1.05);
}
:deep(.n-tag) {
  --n-border: 1px solid transparent !important;
}
</style>
