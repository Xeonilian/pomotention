<!-- TimeTable.vue -->
<template>
  <div class="timetable-container">
    <!-- 0 入口按钮（始终可见） -->
    <div class="timetable-view-button-container">
      <n-button
        @click="toggleDisplay"
        text
        type="default"
        size="small"
        class="timetable-button"
        :title="showEditor ? '完成编辑' : '开始编辑'"
      >
        <template #icon>
          <n-icon><Settings24Regular /></n-icon>
        </template>
      </n-button>
    </div>
    <!-- 1 编辑区 -->
    <div v-if="showEditor" class="timetable-editor">
      <div class="timetable-editor-header">
        <n-button
          text
          type="info"
          size="small"
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
      </div>
      <TimeTableEditor :current-type="currentType" />
    </div>
    <!-- 3 显示区 -->
    <div v-else class="timetable-time-block" ref="container">
      <TimeBlocks
        :blocks="viewBlocks"
        :timeRange="timeRange"
        :effectivePxPerMinute="effectivePxPerMinute"
        :dayStart="dateService.appDateTimestamp"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed, nextTick } from "vue";
import { NButton, NIcon } from "naive-ui";
import { Settings24Regular, Beach24Regular, Backpack24Regular } from "@vicons/fluent";
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
  showEditor.value = !showEditor.value;
  settingStore.settings.leftWidth = showEditor.value ? 200 : 120;
}

function toggleType() {
  currentType.value = currentType.value === "work" ? "entertainment" : "work";
}

// 容器高度（使用 ResizeObserver 以兼容 iOS 首次渲染）
const container = ref<HTMLElement | null>(null);
const containerHeight = ref(800);
// 使用 ResizeObserver 记录实例，优先使用容器尺寸变化监听，其次回退到 window resize
let containerResizeObserver: ResizeObserver | null = null;

const updateHeight = () => {
  if (container.value) {
    // 在 Safari / iOS 上，初次渲染时高度可能为 0，这里做一次保护
    const height = container.value.clientHeight;
    if (height > 0) {
      containerHeight.value = height;
    }
  }
};

onMounted(() => {
  // 等待下一次 DOM 更新，确保容器已经完成布局
  nextTick(() => {
    updateHeight();

    if (container.value && "ResizeObserver" in window) {
      containerResizeObserver = new ResizeObserver(() => {
        updateHeight();
      });
      containerResizeObserver.observe(container.value);
    } else {
      window.addEventListener("resize", updateHeight);
    }
  });
});

onUnmounted(() => {
  if (containerResizeObserver && container.value) {
    containerResizeObserver.unobserve(container.value);
    containerResizeObserver.disconnect();
  }
  window.removeEventListener("resize", updateHeight);
});

// 当时间块数据变化时，下一帧再读取高度，避免布局尚未完成
watch(viewBlocks, () => {
  nextTick(() => {
    updateHeight();
  });
});

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
  position: fixed;
  bottom: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  z-index: 10;
}

.timetable-editor {
  height: 100%;
}

.timetable-time-block {
  height: 100%;
  position: relative;
  bottom: 0px;
  /* 移动端：整个时间表区域禁用文本选择和长按复制 */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
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

/* 添加这些样式来确保按钮居中 */
.timetable-view-button-container :deep(.n-button) {
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}
</style>
