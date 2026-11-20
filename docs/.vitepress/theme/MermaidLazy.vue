<!-- 替代 vitepress-plugin-mermaid 默认 Mermaid.vue：仅在有图的页挂载时再拉 mermaid -->
<template>
  <div v-if="!svg" class="doc-mermaid-pending" aria-hidden="true">…</div>
  <div v-else v-html="svg" :class="props.class"></div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, toRaw } from "vue";
import { useData } from "vitepress";
import type { MermaidConfig } from "mermaid";

const pluginSettings = ref<MermaidConfig & { externalDiagrams?: unknown[] }>({
  securityLevel: "loose",
  startOnLoad: false,
});

const { page } = useData();
const { frontmatter } = toRaw(page.value);
const mermaidPageTheme = (frontmatter as { mermaidTheme?: string }).mermaidTheme || "";

const props = defineProps<{
  graph: string;
  id: string;
  class?: string;
}>();

const svg = ref<string | null>(null);
let mut: MutationObserver | null = null;
let mermaidMod: typeof import("mermaid") | null = null;

async function ensureMermaid() {
  if (!mermaidMod) mermaidMod = await import("mermaid");
  return mermaidMod.default;
}

async function renderChart() {
  const mermaid = await ensureMermaid();
  const hasDarkClass = document.documentElement.classList.contains("dark");
  const mermaidConfig: MermaidConfig = { ...pluginSettings.value };
  if (mermaidPageTheme) mermaidConfig.theme = mermaidPageTheme as MermaidConfig["theme"];
  if (hasDarkClass) mermaidConfig.theme = "dark";

  mermaid.initialize(mermaidConfig);
  const { svg: svgCode } = await mermaid.render(props.id, decodeURIComponent(props.graph));
  // 强制 v-html 重绘（主题切换时部分图会丢）
  const salt = Math.random().toString(36).slice(2, 9);
  svg.value = `${svgCode}<span style="display:none">${salt}</span>`;
}

onMounted(async () => {
  try {
    const settings = await import("virtual:mermaid-config");
    if (settings?.default) pluginSettings.value = { ...pluginSettings.value, ...settings.default };
  } catch {
    /* 无 virtual config 时用默认 */
  }

  mut = new MutationObserver(() => {
    void renderChart();
  });
  mut.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  await renderChart();
});

onUnmounted(() => mut?.disconnect());
</script>

<style scoped>
.doc-mermaid-pending {
  min-height: 1.5rem;
  opacity: 0.45;
  font-size: 0.85rem;
}
</style>
