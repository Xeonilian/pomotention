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
import { ref, computed, watchEffect, defineAsyncComponent } from "vue";
import { useChartStats } from "@/composables/chart/useChartStats";
import { getPresetConfig } from "@/services/chart/chartConfigService";
import type { ChartConfig } from "@/core/types/ChartConfig";
import { useDataStore } from "@/stores/useDataStore";
import { useSyncStore } from "@/stores/useSyncStore";
import { useSettingStore } from "@/stores/useSettingStore";

const ChartWidget = defineAsyncComponent(() => import("@/components/ChartWidget.vue"));
const HeatmapChart = defineAsyncComponent(() => import("@/components/HeatmapChart.vue"));

const dataStore = useDataStore();
const syncStore = useSyncStore();
const settingStore = useSettingStore();

/**
 * 统计数据
 */
const stats = useChartStats();

/**
 * 判断数据是否就绪
 * 本地模式：数据已加载即可
 * 在线模式：数据已加载且同步已完成（或无错误）
 */
const isDataReady = computed(() => {
  // 本地模式：检查数据是否已加载
  if (settingStore.settings.localOnlyMode) {
    return dataStore.isDataLoaded;
  }
  // 在线模式：数据已加载且（同步完成或未启用同步）
  return dataStore.isDataLoaded && !syncStore.isSyncing && !syncStore.syncError;
});

/**
 * 数据就绪时自动触发计算
 * 通过访问 stats 属性来确保 computed 被计算
 */
watchEffect(() => {
  if (isDataReady.value) {
    // 数据已就绪，访问 stats 属性触发 computed 计算
    // 这确保了统计数据在数据加载/同步完成后立即计算
    void stats.totalPomodoros;
    void stats.avgEnergy;
    void stats.avgReward;
  }
});

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
