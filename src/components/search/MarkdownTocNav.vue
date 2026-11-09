<template>
  <aside v-if="items.length" class="md-toc" :class="[`md-toc--${layout}`, { 'is-collapsed': collapsed }]">
    <button v-if="showToggle" type="button" class="md-toc-toggle" :title="collapsed ? '展开目录' : '收起目录'" @click="toggle">
      <n-icon size="20" class="md-toc-toggle-icon">
        <template v-if="layout === 'stack'">
          <ChevronDown20Filled v-if="collapsed" />
          <ChevronUp20Filled v-else />
        </template>
        <template v-else>
          <ChevronLeft20Filled v-if="collapsed" />
          <ChevronRight20Filled v-else />
        </template>
      </n-icon>
    </button>
    <nav v-show="!collapsed" class="md-toc-nav" aria-label="目录">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="md-toc-item"
        :style="{ paddingLeft: tocItemPad(item.level) }"
        :title="item.text"
        @click="emit('select', item.id)"
      >
        {{ item.text }}
      </button>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { watch } from "vue";
import { NIcon } from "naive-ui";
import { ChevronLeft20Filled, ChevronRight20Filled, ChevronDown20Filled, ChevronUp20Filled } from "@vicons/fluent";
import type { MarkdownTocItem } from "@/core/utils/markdownToc";

const TOC_COLLAPSED_KEY = "pomotention.md-toc-collapsed";

const props = withDefaults(
  defineProps<{
    items: MarkdownTocItem[];
    /** side：右侧左右开合；stack：meta 与正文之间上下开合 */
    layout?: "side" | "stack";
    /** false 时由外层渲染开合钮（手机 meta 行） */
    showToggle?: boolean;
  }>(),
  {
    layout: "side",
    showToggle: true,
  },
);

const emit = defineEmits<{
  select: [id: string];
}>();

const collapsed = defineModel<boolean>("collapsed", { required: true });

/** stack 贴左；side 略缩进给开合钮 */
function tocItemPad(level: number) {
  if (props.layout === "stack") return `${(level - 1) * 0.55}rem`;
  return `${0.35 + (level - 1) * 0.7}rem`;
}

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
  background: transparent;
}

/* ---------- 侧栏（电脑） ---------- */
.md-toc--side {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  width: auto;
  min-width: 5rem;
  max-width: 10rem;
  align-self: stretch;
}

@media (min-width: 431px) {
  .md-toc--side:not(.is-collapsed) {
    min-width: 10rem;
    max-width: 22rem;
  }
}

.md-toc--side.is-collapsed {
  min-width: 0;
  max-width: none;
  width: 1.25rem;
}

.md-toc--side .md-toc-toggle {
  position: absolute;
  top: 10px;
  left: 0;
  z-index: 2;
}

.md-toc--side .md-toc-nav {
  flex: 1 1 auto;
  min-width: 0;
  max-height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 10px 4px 8px 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

@media (max-width: 430px) {
  .md-toc--side {
    margin-right: 8px;
  }
}

/* ---------- 上下叠（手机：插在 meta 与正文之间） ---------- */
.md-toc--stack {
  display: flex;
  flex-direction: column;
  width: 100%;
  min-width: 0;
  max-width: none;
  flex-shrink: 0;
}

.md-toc--stack .md-toc-nav {
  /* 目录过长时限高，区内上下滚 */
  max-height: min(20vh, 9rem);
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  /* 手机系统条几乎看不见，单独加一截可辨认的细条 */
  scrollbar-width: thin;
  scrollbar-color: color-mix(in srgb, var(--color-text-secondary, #666) 55%, transparent) transparent;
  padding: 2px 4px 0 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.md-toc--stack .md-toc-nav::-webkit-scrollbar {
  width: 5px;
}

.md-toc--stack .md-toc-nav::-webkit-scrollbar-track {
  background: transparent;
}

.md-toc--stack .md-toc-nav::-webkit-scrollbar-thumb {
  background-color: color-mix(in srgb, var(--color-text-secondary, #666) 50%, transparent);
  border-radius: 3px;
}

.md-toc-toggle {
  padding: 2px;
  border: none;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  line-height: 1;
  border-radius: 4px;
}

.md-toc-toggle-icon {
  display: block;
}

.md-toc-toggle:hover {
  color: #000;
  background: var(--color-background-light-transparent, rgba(0, 0, 0, 0.04));
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
