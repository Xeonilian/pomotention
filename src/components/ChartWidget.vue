<!-- ChartWidget.vue -->
<template>
  <div class="chart-widget">
    <div v-if="isLoading" class="loading">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="error" class="error">
      <div class="error-icon">⚠️</div>
      <p>{{ error.message }}</p>
    </div>

    <div v-else ref="chartRef" class="chart"></div>
  </div>
</template>

<script setup lang="ts">
import { useChart } from "@/composables/useChart";
import type { ChartConfig } from "@/core/types/ChartConfig";

const props = defineProps<{
  config: ChartConfig;
}>();

const { chartRef, isLoading, error } = useChart(() => props.config);
</script>

<style scoped>
.chart-widget {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.chart {
  width: 100%;
  height: 400px;
}

/* 加载状态 */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  color: #999;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #409eff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 错误状态 */
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: #f56c6c;
}

.error-icon {
  font-size: 48px;
}

.error p {
  font-size: 14px;
  margin: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .chart-widget {
    padding: 16px;
    min-height: 320px;
  }

  .chart {
    height: 320px;
  }
}
</style>
