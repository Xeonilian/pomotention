<template>
  <div class="tag-container">
    <!-- 关键改动：直接循环响应式的 renderedTags -->
    <n-tag
      v-for="tag in renderedTags"
      :key="tag.id"
      round
      :size="props.size || 'small'"
      :closable="props.isCloseable"
      :title="tag.name"
      @close="removeTag(tag.id)"
      class="tag-item"
      :style="{
        color: tag.color,
        backgroundColor: tag.backgroundColor,
        boxShadow:
          props.displayLength === null || props.displayLength === 0
            ? `1px 1px 0px ${tag.color}`
            : 'none',
      }"
      displayLength="props.displayLength || null"
    >
      {{ truncatedName(tag.name) }}
    </n-tag>
  </div>
</template>
<script setup lang="ts">
import { NTag } from "naive-ui";
import { useTagStore } from "@/stores/useTagStore";
import { computed } from "vue";
import type { Tag } from "@/core/types/Tag";
import { storeToRefs } from "pinia";
const props = defineProps<{
  tagIds: number[];
  isCloseable: boolean;
  size?: "medium" | "small" | "large" | "tiny";
  displayLength?: number;
  showIdx?: number;
}>();
const emit = defineEmits<{
  "remove-tag": [tagId: number];
}>();
// 1. 从 Store 中解构出需要的函数
const tagStore = useTagStore();
const { tags } = storeToRefs(tagStore);

// 2. 创建 computed 属性，它会成为响应性的数据源
const renderedTags = computed<Tag[]>(() => {
  const tagMap = new Map(tags.value.map((t) => [t.id, t]));
  const result = props.tagIds
    .map((id) => {
      if (id === 0) {
        return {
          id: 0,
          name: "",
          color: "var(--color-text-secondary)",
          backgroundColor: "var(--color-background)",
        } as unknown as Tag;
      }
      return tagMap.get(id);
    })
    .filter((tag) => tag !== undefined) as Tag[];

  const n = props.showIdx;
  if (n == null || n <= 0) return result;
  return result.slice(0, n);
});

// 3. emit 事件的函数保持不变
function removeTag(tagId: number) {
  emit("remove-tag", tagId);
}
function truncatedName(tag: string) {
  if (props.displayLength === null) return tag;
  return tag.slice(0, props.displayLength);
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
