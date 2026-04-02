<!-- TimeTable.vue -->
<template>
  <div class="timetable-container">
    <!-- 编辑区 -->
    <div v-if="showEditor" class="timetable-editor">
      <TimeTableEditor :current-type="currentType" @exit="onExitEditor" @toggle-type="toggleType" />
    </div>
    <!-- 显示区：无按钮，仅底部 icon 进入编辑 -->
    <div v-else class="timetable-time-block" ref="container">
      <TimeBlocks
        :blocks="viewBlocks"
        :timeRange="timeRange"
        :effectivePxPerMinute="effectivePxPerMinute"
        :dayStart="dateService.appDateTimestamp"
      />
      <n-button text class="timetable-enter-editor-icon" title="开始编辑" aria-label="开始编辑" @click="toggleDisplay">
        <n-icon>
          <ChevronDoubleRight16Regular />
        </n-icon>
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { NIcon } from "naive-ui";
import { ChevronDoubleRight16Regular } from "@vicons/fluent";
import TimeTableEditor from "@/components/TimeTable/TimeTableEditor.vue";
import TimeBlocks from "@/components/TimeTable/TimeBlocks.vue";
import { getTimestampForTimeString } from "@/core/utils";
import { useDataStore } from "@/stores/useDataStore";
import { useTimetableStore } from "@/stores/useTimetableStore";
// import { useDevice } from "@/composables/useDevice";

const dataStore = useDataStore();
// const { isMobile, isIOSDevice, isDesktop } = useDevice();
const dateService = dataStore.dateService;
const timetableStore = useTimetableStore();

const emit = defineEmits<{ (e: "timetable-edit", editing: boolean): void }>();

const showEditor = ref(false);
const currentType = ref<"work" | "entertainment">("work");

const viewBlocks = computed(() => timetableStore.getBlocksByType(currentType.value));

function toggleDisplay() {
  showEditor.value = true;
  emit("timetable-edit", true);
}

function onExitEditor() {
  showEditor.value = false;
  emit("timetable-edit", false);
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

const adjPara = ref(0); // #BUG isMobile可以控制华为，但需要优化
const effectivePxPerMinute = computed(() => {
  if (totalMinutes.value <= 0) return 0;
  return (containerHeight.value - adjPara.value) / totalMinutes.value;
});
</script>

<style scoped>
.timetable-container {
  height: calc(100% - env(safe-area-inset-bottom) - 13px);
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

/* 进入编辑的 icon：下边缘留白；横屏高度紧，为竖屏留白的一半 */
.timetable-enter-editor-icon {
  position: absolute;
  bottom: 10px;
  display: flex;
  padding: 0;
  cursor: pointer;
  z-index: 100;
}

@media (orientation: landscape) {
  .timetable-enter-editor-icon {
    bottom: 0px;
  }
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
