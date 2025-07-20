<template>
  <div class="tag-container">
    <!-- 关键改动：直接循环响应式的 renderedTags -->
    <n-tag
      v-for="tag in renderedTags"
      :key="tag.id"
      round
      size="small"
      :closable="props.isCloseable"
      @close="removeTag(tag.id)"
      class="tag-item"
      :style="{
        color: tag.color,
        backgroundColor: tag.backgroundColor,
        borderColor: tag.backgroundColor /* 或者一个更柔和的颜色 */,
      }"
    >
      {{ tag.name }}
    </n-tag>
  </div>
</template>

<script setup lang="ts">
import { NTag } from "naive-ui";
import { useTagStore } from "@/stores/useTagStore";
import { computed, watch } from "vue";
import type { Tag } from "@/core/types/Tag";
import { storeToRefs } from "pinia";

const props = defineProps<{
  tagIds: number[];
  isCloseable: boolean;
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
    .map((id) => tagMap.get(id))
    .filter((tag) => tag !== undefined) as Tag[];

  // console.log(
  //   `[TagRenderer] Fetched new tags:`,
  //   JSON.parse(JSON.stringify(result))
  // );
  return result;
});

// 3. emit 事件的函数保持不变
function removeTag(tagId: number) {
  emit("remove-tag", tagId);
}
// watch(
//   renderedTags,
//   (newTags) => {
//     console.log(
//       `[TagRenderer]4 WATCHER detected 'renderedTags' has changed. UI should update now. New tags:`,
//       newTags
//     );
//   },
//   { deep: true }
// );
</script>

<style scoped>
.tag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 2px;
  width: 100%;
}

.tag-item {
  transition: transform 0.2s;
  font-size: 12px;
}

.tag-item:hover {
  transform: scale(1.05);
}
</style>
