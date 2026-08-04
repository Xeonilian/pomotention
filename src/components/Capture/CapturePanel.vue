<script setup lang="ts">
import { ref } from "vue";
import { NButton, NInput, NSpin } from "naive-ui";
import { runCapture } from "@/core/capture";

const text = ref("");
const loading = ref(false);
const status = ref("");
const statusTone = ref<"ok" | "err" | "">("");

async function onSubmit() {
  if (loading.value) return;
  loading.value = true;
  status.value = "";
  statusTone.value = "";
  try {
    const result = await runCapture(text.value);
    if (result.ok) {
      const names = result.written.map((w) => w.title).join("、");
      status.value = `已写入待办：${names}` + (result.skippedLow ? `（另有 ${result.skippedLow} 条未写入）` : "");
      statusTone.value = "ok";
      text.value = "";
    } else {
      status.value = result.message;
      statusTone.value = "err";
    }
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="capture-panel">
    <header class="capture-header">
      <h2 class="capture-title">记一句</h2>
      <p class="capture-hint">说要记进 App 的事，例如：明天下午写周报，两个番茄。不闲聊。</p>
    </header>

    <n-spin :show="loading">
      <n-input
        v-model:value="text"
        type="textarea"
        :rows="4"
        placeholder="输入一句要记的待办…"
        :disabled="loading"
        @keydown.ctrl.enter="onSubmit"
      />
      <div class="capture-actions">
        <n-button type="primary" :disabled="loading || !text.trim()" @click="onSubmit">提交</n-button>
      </div>
      <p v-if="status" class="capture-status" :class="statusTone">{{ status }}</p>
    </n-spin>
  </div>
</template>

<style scoped>
.capture-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
  background: var(--color-background);
  color: var(--color-text-primary);
}

.capture-header {
  margin-bottom: 12px;
}

.capture-title {
  margin: 0 0 6px;
  font-size: 1.1rem;
  font-weight: 600;
}

.capture-hint {
  margin: 0;
  font-size: 0.85rem;
  opacity: 0.75;
  line-height: 1.4;
}

.capture-actions {
  margin-top: 10px;
  display: flex;
  justify-content: flex-end;
}

.capture-status {
  margin-top: 12px;
  font-size: 0.9rem;
  line-height: 1.4;
}

.capture-status.ok {
  color: var(--color-green, #18a058);
}

.capture-status.err {
  color: var(--color-red, #d03050);
}
</style>
