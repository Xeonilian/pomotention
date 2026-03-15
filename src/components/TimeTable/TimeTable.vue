<!-- TimeTable.vue -->
<template>
  <div class="timetable-container">
    <!-- 编辑区 -->
    <div v-if="showEditor" class="timetable-editor">
      <TimeTableEditor
        :current-type="currentType"
        @exit="onExitEditor"
        @toggle-type="toggleType"
      />
    </div>
    <!-- 显示区：无按钮，仅底部 icon 进入编辑 -->
    <div v-else class="timetable-time-block" ref="container">
      <TimeBlocks
        :blocks="viewBlocks"
        :timeRange="timeRange"
        :effectivePxPerMinute="effectivePxPerMinute"
        :dayStart="dateService.appDateTimestamp"
      />
      <button
        type="button"
        class="timetable-enter-editor-icon"
        title="开始编辑"
        aria-label="开始编辑"
        @click="toggleDisplay"
      >
        <n-icon size="22">
          <Settings24Regular />
        </n-icon>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { NIcon } from "naive-ui";
import { Settings24Regular } from "@vicons/fluent";
import TimeTableEditor from "@/components/TimeTable/TimeTableEditor.vue";
import TimeBlocks from "@/components/TimeTable/TimeBlocks.vue";
import { getTimestampForTimeString } from "@/core/utils";
import { useSettingStore } from "@/stores/useSettingStore";
import { useDataStore } from "@/stores/useDataStore";
import { useTimetableStore } from "@/stores/useTimetableStore";

const dataStore = useDataStore();

const dateService = dataStore.dateService;
const settingStore = useSettingStore();
const timetableStore = useTimetableStore();

const showEditor = ref(false);
const currentType = ref<"work" | "entertainment">("work");

const viewBlocks = computed(() => timetableStore.getBlocksByType(currentType.value));

function toggleDisplay() {
  showEditor.value = true;
  settingStore.settings.leftWidth = 200;
}

function onExitEditor() {
  showEditor.value = false;
  settingStore.settings.leftWidth = 120;
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

.timetable-editor {
  height: 100%;
}

.timetable-time-block {
  height: 100%;
  position: relative;
  /* 移动端：整个时间表区域禁用文本选择和长按复制 */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

/* 进入编辑的 icon：下边缘靠上 10px */
.timetable-enter-editor-icon {
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--n-button-color-hover, rgba(0, 0, 0, 0.06));
  color: var(--n-button-text-color, #333);
  cursor: pointer;
  z-index: 10;
}
.timetable-enter-editor-icon:hover {
  background: var(--n-button-color-pressed, rgba(0, 0, 0, 0.1));
}

/* 深度禁用：timetable 内所有子元素都不能被选中或长按复制 */
.timetable-time-block :deep(*) {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
}
</style>
