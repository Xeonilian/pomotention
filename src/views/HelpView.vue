<template>
  <div class="help-view">
    <!-- <div class="help-header">
      <button class="toggle-toc-btn" @click="toggleToc">
        {{ showToc ? "隐藏目录" : "显示目录" }}
      </button>
    </div> -->

    <div class="help-body">
      <!-- 侧边目录 -->
      <div class="toc-sidebar" :class="{ show: showToc }">
        <div class="toc-header">📑 目录</div>
        <div class="toc-content">
          <div v-if="tableOfContents.length === 0" class="toc-empty">
            暂无目录
          </div>
          <div v-else>
            <div
              v-for="item in tableOfContents"
              :key="item.id"
              :class="[
                'toc-item',
                `toc-level-${item.level}`,
                { active: activeId === item.id },
              ]"
              @click="scrollToHeading(item.id)"
            >
              {{ item.text }}
            </div>
          </div>
        </div>
      </div>

      <!-- 主要内容 -->
      <div class="help-content" :class="{ 'with-toc': showToc }">
        <div v-if="loading">📖 加载中...</div>
        <div v-else-if="error" class="error">❌ 加载失败</div>
        <div
          v-else
          class="markdown-content"
          v-html="htmlContent"
          ref="contentRef"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted, watch } from "vue";
import { marked } from "marked";

interface TocItem {
  id: string;
  text: string;
  level: number;
}

const loading = ref(true);
const error = ref(false);
const htmlContent = ref("");
const contentRef = ref<HTMLElement>();
const showToc = ref(true);
const tableOfContents = ref<TocItem[]>([]);
const activeId = ref("");

let scrollTimeout: number | null = null;

// 切换目录显示
const toggleToc = () => {
  showToc.value = !showToc.value;
};

// 生成目录
const generateTableOfContents = () => {
  console.log("开始生成目录...");

  if (!contentRef.value) {
    console.log("contentRef.value 为空");
    return;
  }

  const headings = contentRef.value.querySelectorAll("h1, h2, h3, h4, h5, h6");
  console.log("找到标题数量:", headings.length);

  const toc: TocItem[] = [];

  headings.forEach((heading, index) => {
    const level = parseInt(heading.tagName.charAt(1));
    const text = heading.textContent || "";
    const id = `heading-${index}`;

    console.log(`标题 ${index}:`, { level, text, tagName: heading.tagName });

    // 为标题添加 ID
    heading.id = id;

    toc.push({
      id,
      text: text.replace(/^[🍅🎯🚀📦📖🛠️🎓💡\s]+/, ""), // 移除开头的emoji和空格
      level,
    });
  });

  console.log("生成的目录:", toc);
  tableOfContents.value = toc;
};

// 监听 htmlContent 变化，重新生成目录
watch(htmlContent, async () => {
  if (htmlContent.value) {
    await nextTick();
    // 额外延迟确保DOM完全渲染
    setTimeout(() => {
      generateTableOfContents();
    }, 100);
  }
});

// 滚动到指定标题
const scrollToHeading = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    activeId.value = id;
  }
};

// 监听滚动，更新当前活跃的标题
const handleScroll = () => {
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }

  scrollTimeout = window.setTimeout(() => {
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
    let currentId = "";

    for (let i = headings.length - 1; i >= 0; i--) {
      const heading = headings[i] as HTMLElement;
      const rect = heading.getBoundingClientRect();

      if (rect.top <= 100) {
        currentId = heading.id;
        break;
      }
    }

    activeId.value = currentId;
  }, 100);
};

onMounted(async () => {
  try {
    const response = await fetch("/README.md");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const text = await response.text();
    console.log("Markdown 内容长度:", text.length);

    htmlContent.value = await marked(text);
    console.log("HTML 内容长度:", htmlContent.value.length);

    // 添加滚动监听
    window.addEventListener("scroll", handleScroll);
  } catch (err) {
    console.error("加载 README.md 失败:", err);
    error.value = true;
  } finally {
    loading.value = false;
  }
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
  if (scrollTimeout) {
    clearTimeout(scrollTimeout);
  }
});
</script>

<style scoped>
.help-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 2px solid var(--color-border);
  background: var(--color-background-secondary);
  position: sticky;
  top: 0;
  z-index: 100;
}

.help-header h1 {
  margin: 0;
  color: var(--color-primary);
}

.toggle-toc-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.toggle-toc-btn:hover {
  background: var(--color-primary-dark);
}

.help-body {
  flex: 1;
  display: flex;
  overflow: hidden; /* 🔧 防止出现水平滚动条 */
  position: relative;
}

/* 目录侧边栏 */
.toc-sidebar {
  width: 280px;
  background: var(--color-background-secondary);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease; /* 🔧 改为 all 过渡 */
  flex-shrink: 0; /* 🔧 防止压缩 */
  overflow: hidden; /* 🔧 防止内容溢出 */
}

/* 🔧 隐藏状态优化 */
.toc-sidebar:not(.show) {
  width: 0; /* 🔧 宽度改为0而不是transform */
  border-right: none;
  min-width: 0; /* 🔧 允许完全收缩 */
}

.toc-header {
  padding: 15px 20px;
  border-bottom: 1px solid var(--color-border);
  font-weight: bold;
  color: var(--color-primary);
  background: var(--color-background);
  white-space: nowrap; /* 🔧 防止文字换行 */
}

.toc-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden; /* 🔧 隐藏水平滚动 */
  padding: 10px 0;
}

.toc-empty {
  padding: 20px;
  text-align: center;
  color: var(--color-text-secondary);
  font-style: italic;
}

.toc-item {
  padding: 8px 20px;
  cursor: pointer;
  color: var(--color-text);
  border-left: 3px solid transparent;
  transition: all 0.2s ease;
  word-wrap: break-word;
  line-height: 1.4;
  white-space: nowrap; /* 🔧 防止换行导致布局问题 */
  overflow: hidden;
  text-overflow: ellipsis; /* 🔧 长文本省略 */
}

.toc-item:hover {
  background: var(--color-background);
  color: var(--color-primary);
}

.toc-item.active {
  background: var(--color-primary-light);
  border-left-color: var(--color-primary);
  color: var(--color-primary);
  font-weight: 500;
}

/* 不同级别标题的缩进 */
.toc-level-1 {
  padding-left: 20px;
  font-weight: 600;
}
.toc-level-2 {
  padding-left: 30px;
}
.toc-level-3 {
  padding-left: 40px;
  font-size: 14px;
}
.toc-level-4 {
  padding-left: 50px;
  font-size: 13px;
}
.toc-level-5 {
  padding-left: 60px;
  font-size: 12px;
}
.toc-level-6 {
  padding-left: 70px;
  font-size: 12px;
}

/* 主要内容区域 */
.help-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden; /* 🔧 隐藏水平滚动 */
  padding: 20px;
  min-width: 0; /* 🔧 允许压缩 */
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  font-size: 16px;
}

.error {
  color: var(--color-red);
}

.markdown-content {
  max-width: 800px;
  margin: 0 auto;
  line-height: 1.6;
  word-wrap: break-word; /* 🔧 长单词换行 */
}

.markdown-content h1 {
  color: var(--color-primary);
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 10px;
  scroll-margin-top: 80px;
}

.markdown-content h2 {
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 5px;
  scroll-margin-top: 80px;
}

.markdown-content h3,
.markdown-content h4,
.markdown-content h5,
.markdown-content h6 {
  color: var(--color-primary);
  scroll-margin-top: 80px;
}

.markdown-content :deep(code) {
  background: var(--color-blue-light) !important;
  padding: 2px 2px;
  border-radius: 2px;
  color: var(--color-text);
  font-family: "Franklin Gothic Medium", "Arial Narrow", Arial, sans-serif;
  word-break: break-all; /* 🔧 长代码换行 */
}

.markdown-content :deep(pre) {
  background: var(--color-background-light-light);
  padding: 2px;
  border-radius: 6px;
  overflow-x: auto;
  max-width: 100%; /* 🔧 限制最大宽度 */
}

.markdown-content :deep(pre code) {
  background: var(--color-background-light-light) !important;
}

.markdown-content :deep(svg) {
  vertical-align: -4px; /* 根据需要调整数值 */
  height: 20px !important;
  width: 20px !important;
  color: var(--color-red);
}

.markdown-content :deep(ul) {
  padding: 4px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .toc-sidebar {
    width: 100%;
    position: absolute;
    height: 100%;
    z-index: 1000;
    left: 0;
    top: 0;
  }

  .toc-sidebar:not(.show) {
    width: 0;
    transform: translateX(-100%); /* 🔧 移动端使用transform */
  }

  .toc-sidebar.show {
    width: 100%;
    transform: translateX(0);
  }

  .help-content {
    width: 100%;
  }

  .toggle-toc-btn {
    display: block;
  }
}

@media (min-width: 769px) {
  .toc-sidebar.show {
    width: 280px; /* 🔧 确保显示时有正确宽度 */
  }
}
</style>
