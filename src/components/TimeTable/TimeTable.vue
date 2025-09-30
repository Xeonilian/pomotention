<!-- 
  Component: TimeTableView.vue 
  Description: 从Home收取数据并分发，按钮
  Props:
  Children:
    - TimeTableEditor.vue
    - TimeBlocks.vue
 Parent: HomeView.vue
-->

<template>
  <div class="timetable-container">
    <!-- 1 按钮 -->
    <div class="timetable-view-button-container">
      <!-- 设置按钮 -->

      <n-button
        secondary
        circle
        type="info"
        size="small"
        :disabled="showEditor"
        :title="currentType === 'work' ? '切换到娱乐时间表' : '切换到工作时间表'"
        @click="toggleType"
      >
        <template #icon>
          <n-icon>
            <Backpack24Regular v-if="currentType === 'work'" />
            <Beach24Regular v-else />
          </n-icon>
        </template>
      </n-button>
      <n-button
        @click="toggleDisplay"
        secondary
        circle
        type="default"
        size="small"
        class="timetable-button"
        :title="showEditor ? '完成编辑' : '开始编辑'"
      >
        <template #icon>
          <n-icon><Settings24Regular /></n-icon>
        </template>
      </n-button>
      <n-popconfirm @positive-click="blockReset(currentType)" negative-text="取消" positive-text="确定">
        <template #trigger>
          <n-button secondary circle size="small" type="default" title="复位为默认时间表" strong :disabled="!showEditor">
            <n-icon size="20">
              <ArrowReset48Filled />
            </n-icon>
          </n-button>
        </template>
        <span>确定要将当前时间表复位为默认吗？</span>
      </n-popconfirm>
    </div>
    <!-- 2 编辑区 -->
    <div v-if="showEditor" class="timetable-editor">
      <TimeTableEditor
        v-if="showEditor"
        :blocks="viewBlocks"
        :current-type="currentType"
        :key="currentType + '-' + viewBlocks.length"
        @update-blocks="blockUpdate"
      />
    </div>
    <!-- 3 显示区 -->
    <div v-else class="timetable-time-block" ref="container">
      <TimeBlocks
        :blocks="viewBlocks"
        :schedules="schedulesForAppDate"
        :todos="todosForAppDate"
        :timeRange="timeRange"
        :effectivePxPerMinute="effectivePxPerMinute"
        :dayStart="dateService.appDateTimestamp"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { storeToRefs } from "pinia";
import { NButton, NPopconfirm } from "naive-ui";
import { ArrowReset48Filled, Settings24Regular, Beach24Regular, Backpack24Regular } from "@vicons/fluent";
import TimeTableEditor from "@/components/TimeTable/TimeTableEditor.vue";
import TimeBlocks from "@/components/TimeTable/TimeBlocks.vue";
import { WORK_BLOCKS, ENTERTAINMENT_BLOCKS } from "@/core/constants";
import type { Block } from "@/core/types/Block";
import { getTimestampForTimeString } from "@/core/utils";

import { loadTimeBlocks, saveTimeBlocks, removeTimeBlocksStorage } from "@/services/localStorageService";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDataStore } from "@/stores/useDataStore";

const dataStore = useDataStore();
const { todosForAppDate, schedulesForAppDate } = storeToRefs(dataStore);
const dateService = dataStore.dateService;
const settingStore = useSettingStore();

// 1 按钮
const showEditor = ref(false);

const toggleDisplay = () => {
  showEditor.value = !showEditor.value;
  if (showEditor.value) {
    settingStore.settings.leftWidth = 200;
  } else {
    settingStore.settings.leftWidth = 120;
  }
};

const currentType = ref<"work" | "entertainment">("work");
const allBlocks = ref({
  work: loadTimeBlocks("work", [...WORK_BLOCKS]),
  entertainment: loadTimeBlocks("entertainment", [...ENTERTAINMENT_BLOCKS]),
});
const viewBlocks = computed(() => allBlocks.value[currentType.value]);

// 编辑block
function blockUpdate(newBlocks: Block[]) {
  allBlocks.value[currentType.value] = [...newBlocks]; // 保持引用变
  saveTimeBlocks(currentType.value, newBlocks);
}

// 复位数据
function blockReset(type: "work" | "entertainment") {
  allBlocks.value[type] = type === "work" ? [...WORK_BLOCKS] : [...ENTERTAINMENT_BLOCKS];
  removeTimeBlocksStorage(type);
  saveTimeBlocks(type, allBlocks.value[type]);
}
// 切换类型
function toggleType() {
  const next = currentType.value === "work" ? "entertainment" : "work";
  currentType.value = next;
}

// 高度和容器引用
const container = ref<HTMLElement | null>(null);
const containerHeight = ref(400);

const updateHeight = () => {
  if (container.value) {
    containerHeight.value = container.value.clientHeight;
    //console.log('容器高度:', containerHeight.value, '实际高度:', container.value.clientHeight)
  }
};

onMounted(() => {
  updateHeight();
  window.addEventListener("resize", updateHeight);
});

onUnmounted(() => window.removeEventListener("resize", updateHeight));

// watch blocks 更新时刷新高度
watch(viewBlocks, () => {
  updateHeight();
});

// timeRange 计算 时间戳
const timeRange = computed(() => {
  if (viewBlocks.value.length === 0) return { start: 0, end: 0 };
  const start = Math.min(...viewBlocks.value.map((b) => getTimestampForTimeString(b.start, dateService.appDateTimestamp)));
  const end = Math.max(...viewBlocks.value.map((b) => getTimestampForTimeString(b.end, dateService.appDateTimestamp)));
  return { start, end };
});

const totalMinutes = computed(() => (timeRange.value.end - timeRange.value.start) / (1000 * 60));

// 整体位移
const adjPara = ref(0);

const effectivePxPerMinute = computed(() => {
  if (totalMinutes.value <= 0) return 0;
  return (containerHeight.value - adjPara.value) / totalMinutes.value;
});
</script>

<style scoped>
.timetable-container {
  height: 100%;
  overflow: visible;
}
.timetable-view-button-container {
  display: flex;
  justify-content: center;
  align-items: center;
  margin: 0 auto 10px auto;
  gap: 8px;
  top: 0;
  z-index: 10;
  background-color: var(--color-background);
  border-radius: 15px;
  width: 120px;
  height: 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.timetable-editor {
  height: 100%;
}

.timetable-time-block {
  height: calc(100% - 45px);
  position: relative;
  bottom: 0px;
}

/* 添加这些样式来确保按钮居中 */
.timetable-view-button-container :deep(.n-button) {
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
</style>
