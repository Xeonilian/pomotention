<template>
  <div class="chart-widget">
    <!-- 时间范围控制器 -->
    <div class="date-range-control">
      <n-button class="nav-button" @click="goToPrevious" :disabled="isLoading" text size="small">
        <template #icon>
          <n-icon><ArrowLeft24Filled /></n-icon>
        </template>
      </n-button>
      <span class="date-range-label">{{ dateRangeLabel }}</span>

      <n-button class="nav-button" @click="goToNext" :disabled="isLoading" text size="small">
        <template #icon>
          <n-icon><ArrowRight24Filled /></n-icon>
        </template>
      </n-button>
    </div>

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
import { computed } from "vue";
import { useChart } from "@/composables/useChart";
import type { ChartConfig, DateRange } from "@/core/types/ChartConfig";
import { getDateRangeBounds } from "@/core/types/ChartConfig";
import { ArrowLeft24Filled, ArrowRight24Filled } from "@vicons/fluent";

const props = defineProps<{
  config: ChartConfig;
}>();

const emit = defineEmits<{
  "update:config": [config: ChartConfig];
}>();

const { chartRef, isLoading, error } = useChart(() => props.config);

/**
 * 计算显示的日期范围标签
 */
const dateRangeLabel = computed(() => {
  const { start, end } = getDateRangeBounds(props.config.dateRange);
  const startDate = new Date(start);
  const endDate = new Date(end);

  const formatDate = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
});

/**
 * 切换到上一个时间段
 */
function goToPrevious() {
  const newDateRange = shiftDateRange(props.config.dateRange, -1);
  emit("update:config", {
    ...props.config,
    dateRange: newDateRange,
  });
}

/**
 * 切换到下一个时间段
 */
function goToNext() {
  const newDateRange = shiftDateRange(props.config.dateRange, 1);
  emit("update:config", {
    ...props.config,
    dateRange: newDateRange,
  });
}

/**
 * 偏移日期范围
 */
function shiftDateRange(range: DateRange, direction: number): DateRange {
  if (range.type === "current" || range.type === "offset") {
    // current/offset 类型：直接调整 offset
    return {
      ...range,
      type: "offset",
      value: (range.type === "offset" ? range.value : 0) + direction,
    };
  } else if (range.type === "last") {
    // last 类型：保持 count 不变，整体平移
    const { start, end } = getDateRangeBounds(range);
    const duration = end - start;

    return {
      type: "custom",
      startDate: start + direction * duration,
      endDate: end + direction * duration,
    };
  } else {
    // custom 类型：根据时间跨度平移
    const { start, end } = getDateRangeBounds(range);
    const duration = end - start;

    return {
      type: "custom",
      startDate: start + direction * duration,
      endDate: end + direction * duration,
    };
  }
}
</script>

<style scoped>
.chart-widget {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  min-height: 400px;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

/* 日期范围控制器 */
.date-range-control {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--color-background-light-light);
  border-radius: 8px;
  font-family: "'SF Mono', Monaco, Consolas, 'Courier New', monospace";
  margin-bottom: 8px;
}

.nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-button:active:not(:disabled) {
  transform: scale(0.95);
}

.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.date-range-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-primary);
  min-width: 200px;
  text-align: center;
  padding: 2px;
}

.chart {
  flex: 1;
  width: 100%;
  min-height: 320px;
}

/* 加载和错误状态居中 */
.loading,
.error {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loading {
  color: var(--color-text-secondary);
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

.error {
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
  }

  .date-range-control {
    gap: 8px;
  }

  .date-range-label {
    font-size: 12px;
    min-width: 160px;
    font-family: "'SF Mono', Monaco, Consolas, 'Courier New', monospace";
  }

  .nav-button {
    width: 32px;
    height: 32px;
  }

  .arrow {
    font-size: 16px;
  }
}
</style>
