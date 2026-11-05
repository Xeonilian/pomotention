<template>
  <aside v-if="items.length" class="md-toc" :class="{ 'is-collapsed': collapsed }">
    <button type="button" class="md-toc-toggle" :title="collapsed ? '展开目录' : '收起目录'" @click="toggle">
      <n-icon size="20" class="md-toc-toggle-icon">
        <!-- 右侧栏：Filled 更粗更清晰 -->
        <ChevronLeft20Filled v-if="collapsed" />
        <ChevronRight20Filled v-else />
      </n-icon>
    </button>
    <nav v-show="!collapsed" class="md-toc-nav" aria-label="目录">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="md-toc-item"
        :style="{ paddingLeft: `${0.35 + (item.level - 1) * 0.7}rem` }"
        :title="item.text"
        @click="emit('select', item.id)"
      >
        {{ item.text }}
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { NIcon } from "naive-ui";
import { ChevronLeft20Filled, ChevronRight20Filled } from "@vicons/fluent";
import type { MarkdownTocItem } from "@/core/utils/markdownToc";

const TOC_COLLAPSED_KEY = "pomotention.md-toc-collapsed";

defineProps<{
  items: MarkdownTocItem[];
}>();

const emit = defineEmits<{
  select: [id: string];
}>();

const collapsed = ref(sessionStorage.getItem(TOC_COLLAPSED_KEY) === "1");

function toggle() {
  collapsed.value = !collapsed.value;
}

watch(collapsed, (v) => {
  sessionStorage.setItem(TOC_COLLAPSED_KEY, v ? "1" : "0");
});
</script>

<style scoped>
.md-toc {
  position: relative;
  flex: 0 0 auto;
  display: flex;
  flex-direction: row;
  align-items: stretch;
  /* 展开：手机固定上限 5rem */
  width: auto;
  min-width: 5rem;
  max-width: 10rem;
  align-self: stretch;
  background: transparent;
}

@media (min-width: 431px) {
  .md-toc:not(.is-collapsed) {
    min-width: 10rem;
    max-width: 22rem; /* 电脑端上限加倍 */
  }
}

.md-toc.is-collapsed {
  min-width: 0;
  max-width: none;
  width: 1.25rem;
}

.md-toc-toggle {
  position: absolute;
  /* 勿用 % + translateY(-50%)：会顶出 .content 的 overflow:hidden，看起来像被 meta-row 挡住，z-index 无效 */
  top: 10px;
  left: 0;
  z-index: 2;
  padding: 2px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  line-height: 1;
  border-radius: 4px;
}

/* 手机：目录开合钮离屏幕侧边多 8px */
@media (max-width: 430px) {
  .md-toc {
    margin-right: 8px;
  }
}

.md-toc-toggle-icon {
  display: block;
}

.md-toc-toggle:hover {
  color: #000;
  background: var(--color-background-light-transparent, rgba(0, 0, 0, 0.04));
}

.md-toc-nav {
  flex: 1 1 auto;
  min-width: 0;
  max-height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  /* 内侧留给展开按钮；顶距与正文 padding-top 对齐 */
  padding: 10px 4px 8px 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.md-toc-item {
  display: block;
  width: 100%;
  border: none;
  background: transparent;
  text-align: left;
  font-size: 0.85rem;
  line-height: 1.35;
  color: var(--color-text, #222);
  padding-top: 3px;
  padding-bottom: 3px;
  padding-right: 4px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.md-toc-item:hover {
  color: var(--color-text, #222);
  background: var(--color-background-light-transparent, rgba(0, 0, 0, 0.04));
}
</style>
