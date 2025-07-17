<template>
  <div class="tag-container">
    <n-tag
      v-for="tagId in props.tagIds"
      :key="tagId"
      round
      size="small"
      closable
      @close="removeTag(tagId)"
      class="tag-item"
      :style="getTagStyle(tagId)"
    >
      {{ getTagName(tagId) }}
    </n-tag>
  </div>
</template>

<script setup lang="ts">
import { NTag } from "naive-ui";
import { useTagStore } from "@/stores/useTagStore";

const props = defineProps<{
  tagIds: number[];
}>();

const emit = defineEmits<{
  "remove-tag": [tagId: number];
}>();

const { getTag } = useTagStore();

// 获取标签名称
function getTagName(tagId: number): string {
  const tag = getTag(tagId);
  return tag?.name || "未知标签";
}

// 获取标签颜色配置
function getTagStyle(tagId: number) {
  const tag = getTag(tagId);
  if (!tag) return {};
  return {
    color: tag.color,
    backgroundColor: tag.backgroundColor,
    borderColor: tag.backgroundColor,
  };
}

// 删除标签
function removeTag(tagId: number) {
  emit("remove-tag", tagId);
}
</script>

<style scoped>
.tag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 8px;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  max-width: 200px;
  min-width: 120px;
}

.tag-item {
  transition: transform 0.2s;
}

.tag-item:hover {
  transform: scale(1.05);
}
</style>
