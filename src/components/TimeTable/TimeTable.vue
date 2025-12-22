<!-- TimeTable.vue -->
<template>
  <div class="timetable-container">
    <!-- 1 按钮 -->
    <div class="timetable-view-button-container">
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
      <n-popconfirm @positive-click="handleReset" negative-text="取消" positive-text="确定">
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
      <TimeTableEditor :current-type="currentType" />
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
import { NButton, NPopconfirm, NIcon } from "naive-ui";
import { ArrowReset48Filled, Settings24Regular, Beach24Regular, Backpack24Regular } from "@vicons/fluent";
import TimeTableEditor from "@/components/TimeTable/TimeTableEditor.vue";
import TimeBlocks from "@/components/TimeTable/TimeBlocks.vue";
import { getTimestampForTimeString } from "@/core/utils";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDataStore } from "@/stores/useDataStore";
import { useTimetableStore } from "@/stores/useTimetableStore";

const dataStore = useDataStore();
const { todosForAppDate, schedulesForAppDate } = storeToRefs(dataStore);
const dateService = dataStore.dateService;
const settingStore = useSettingStore();
const timetableStore = useTimetableStore();

const showEditor = ref(false);
const currentType = ref<"work" | "entertainment">("work");

const viewBlocks = computed(() => timetableStore.getBlocksByType(currentType.value));

watch(todosForAppDate, (val) => {
  console.log("🔥 todosForAppDate 改变了，数量:", val.length);
});

watch(dateService.appDateTimestamp, (val) => {
  console.log("📅 appDateTimestamp 改变了:", val);
});

function toggleDisplay() {
  showEditor.value = !showEditor.value;
  settingStore.settings.leftWidth = showEditor.value ? 200 : 120;
}

function handleReset() {
  timetableStore.resetToDefaults(currentType.value);
}

function toggleType() {
  currentType.value = currentType.value === "work" ? "entertainment" : "work";
}

// 容器高度
const container = ref<HTMLElement | null>(null);
const containerHeight = ref(400);

const updateHeight = () => {
  if (container.value) {
    containerHeight.value = container.value.clientHeight;
  }
};

onMounted(() => {
  updateHeight();
  window.addEventListener("resize", updateHeight);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateHeight);
});

watch(viewBlocks, updateHeight);

// 时间范围计算
const timeRange = computed(() => {
  const blocks = viewBlocks.value;
  if (blocks.length === 0) return { start: 0, end: 0 };
  const start = Math.min(...blocks.map((b) => getTimestampForTimeString(b.start, dateService.appDateTimestamp)));
  const end = Math.max(...blocks.map((b) => getTimestampForTimeString(b.end, dateService.appDateTimestamp)));
  return { start, end };
});

const totalMinutes = computed(() => (timeRange.value.end - timeRange.value.start) / (1000 * 60));
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
