<template>
  <div class="chart-container">
    <div class="heatmap-section">
      <HeatmapChart :config="heatmapConfig" />
    </div>
    <div class="scroll-content">
      <!-- 统计卡片 -->
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-icon">🍅</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalPomodoros }}</div>
            <div class="stat-label">总番茄数</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">⚡</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.avgEnergy }}</div>
            <div class="stat-label">平均精力值</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon">😀</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.avgReward }}</div>
            <div class="stat-label">平均愉悦值</div>
          </div>
        </div>
      </div>

      <!-- 图表区域 -->
      <div class="charts-container">
        <ChartWidget
          v-for="(config, index) in chartConfigs"
          :key="index"
          :config="config"
          @update:config="handleConfigUpdate(index, $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ChartWidget from "@/components/ChartWidget.vue";
import { useChartStats } from "@/composables/useChartStats";
import { getPresetConfig } from "@/services/chartConfigService";
import HeatmapChart from "@/components/HeatmapChart.vue";
import type { ChartConfig } from "@/core/types/ChartConfig";

/**
 * 统计数据
 */
const stats = useChartStats();

/**
 * 图表配置列表
 * 使用预设配置简化代码
 */
const chartConfigs = ref([
  getPresetConfig("pomodoro_trend"),
  getPresetConfig("energy_reward_compare"),
  getPresetConfig("interruption_stats"),
]);

const heatmapConfig = ref({
  title: "",
  metricName: "pomodoro",
});

function handleConfigUpdate(index: number, newConfig: ChartConfig) {
  chartConfigs.value[index] = newConfig;
}
</script>

<style scoped>
.chart-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  margin: 10px;
}
.heatmap-section {
  padding-right: 24px;
  z-index: 2;
}
/* 滚动区域 */
.scroll-content {
  flex: 1;
  overflow-y: auto;
  padding-right: 18px;
  display: flex;
  flex-direction: column;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 24px;
  margin-bottom: 10px;
}

.stat-card {
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  color: var(--color-red);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
  margin-top: 10px;
}

.stat-card:nth-child(2) {
  color: var(--color-blue);
}

.stat-card:nth-child(3) {
  color: var(--color-text-primary);
}

.stat-icon {
  font-size: 40px;
  line-height: 1;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 13px;
  opacity: 0.9;
}

/* 图表容器 */
.charts-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
}

/* 响应式 */
@media (max-width: 768px) {
  .chart-view {
    padding: 16px;
  }

  .charts-container {
    grid-template-columns: 1fr;
  }

  .stat-value {
    font-size: 24px;
  }
}
</style>
