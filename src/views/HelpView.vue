<template>
  <div class="help-view">
    <div class="help-header">
      <h1>📖 使用帮助</h1>
    </div>

    <div class="help-content">
      <div v-if="loading">📖 加载中...</div>
      <div v-else-if="error" class="error">❌ 加载失败</div>
      <div v-else class="markdown-content" v-html="htmlContent"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { marked } from "marked";

const loading = ref(true);
const error = ref(false);
const htmlContent = ref("");

onMounted(async () => {
  try {
    const response = await fetch("/README.md"); // ✅ 正确路径
    const text = await response.text();
    htmlContent.value = await marked(text);
  } catch {
    error.value = true;
  } finally {
    loading.value = false;
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
}

.help-header h1 {
  margin: 0;
  color: var(--color-primary);
}

.refresh-btn {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
}

.refresh-btn:hover {
  background: var(--color-primary-dark);
}

.help-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
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
}

.markdown-content h1 {
  color: var(--color-primary);
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 10px;
}

.markdown-content h2 {
  color: var(--color-primary);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: 5px;
}

.markdown-content code {
  background: var(--color-background-dark);
  padding: 2px 6px;
  border-radius: 4px;
  color: var(--color-primary);
}

.markdown-content pre {
  background: var(--color-background-dark);
  padding: 15px;
  border-radius: 6px;
  overflow-x: auto;
}
</style>
