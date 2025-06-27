<!-- PomodoroView.vue -->
<template>
  <div class="pomodoro-view-wrapper" ref="pomodoroContainerRef">
    <!-- 拖动区域始终放在最顶层，z-index确保它在内容之上 -->
    <div
      v-if="isMiniMode"
      class="mini-mode-drag-region"
      data-tauri-drag-region
    ></div>
    <!-- 退出迷你模式按钮区域 -->
    <div class="mini-mode-controls" v-if="isMiniMode">
      <n-button
        @click="exitMiniMode"
        size="tiny"
        tertiary
        type="default"
        title="退出迷你模式"
        class="exit-mini-mode-button"
      >
        <template #icon>
          <n-icon :component="ArrowExpand24Regular" />
          <!-- 假设使用收缩图标 -->
        </template>
        <!-- 移除文字内容 -->
      </n-button>
    </div>
    <!-- 主番茄钟内容区域 -->
    <div
      class="pomodoro-content-area"
      :class="{
        'is-running': timerStore.isActive,
        'sequence-mode': showPomoSeq,
      }"
    >
      <!-- 切换按钮 -->
      <n-button
        size="tiny"
        tertiary
        type="default"
        :title="showPomoSeq ? '变为番茄' : '变为序列'"
        @click="handleTogglePomoSeq"
        class="toggle-button"
        :disabled="timerStore.isActive"
      >
        {{ showPomoSeq ? "🍕" : "🍅" }}
      </n-button>

      <!-- 计时器和序列组件 -->
      <PomodoroTimer class="time" :show-pomo-seq="showPomoSeq" />
      <PomodoroSequence v-if="showPomoSeq" class="sequence" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue"; // 确保导入 watch
import PomodoroTimer from "@/components/PomodoroTimer/PomodoroTimer.vue";
import PomodoroSequence from "@/components/PomodoroTimer/PomodoroSequence.vue";
import { useTimerStore } from "@/stores/useTimerStore";
import { NButton, NIcon } from "naive-ui"; // 导入 NIcon
import { ArrowExpand24Regular } from "@vicons/fluent"; // 导入图标

const timerStore = useTimerStore();
const pomodoroContainerRef = ref<HTMLElement | null>(null);

const props = defineProps({
  showPomoSeq: {
    type: Boolean,
    required: true,
  }, // 注意这里的逗号
  isMiniMode: {
    // 明确isMiniMode的类型
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits<{
  (e: "toggle-pomo-seq"): void;
  (e: "report-size", size: { width: number; height: number }): void;
  (e: "exit-mini-mode"): void; // 确保事件定义正确
}>();

// 添加这个 watch
watch(
  () => props.isMiniMode,
  (newVal) => {
    console.log("PomodoroView: isMiniMode changed to:", newVal);
  },
  { immediate: true }
); // immediate: true 会在组件加载时立即执行一次回调

// 处理切换番茄/序列模式
function handleTogglePomoSeq() {
  // 如果计时器正在运行，不允许切换
  if (timerStore.isActive) {
    return;
  }
  emit("toggle-pomo-seq");
}

function reportSize() {
  if (pomodoroContainerRef.value) {
    const rect = pomodoroContainerRef.value.getBoundingClientRect();
    // 确保报告的尺寸大于0，否则可能还是初始值
    if (rect.width > 0 && rect.height > 0) {
      console.log("PomodoroView reporting size:", rect.width, rect.height);
      emit("report-size", { width: rect.width, height: rect.height });
    }
  }
}

onMounted(() => {
  reportSize(); // 首次挂载时报告
});

// 监听可能影响尺寸的 prop 变化，例如 showPomoSeq
watch(
  () => props.showPomoSeq,
  () => {
    // 等待DOM更新后再报告尺寸
    setTimeout(() => {
      // 使用 setTimeout 替代 nextTick，更稳健一些
      reportSize();
    }, 50); // 给一点时间让DOM渲染完成
  }
);
// 监听isMiniMode的变化，因为它会影响控件显示，也可能影响尺寸
watch(
  () => props.isMiniMode,
  () => {
    setTimeout(() => {
      reportSize();
    }, 50);
  }
);

function exitMiniMode() {
  emit("exit-mini-mode");
}
</script>

<style scoped>
/* 使用新的根容器类名 */
.pomodoro-view-wrapper {
  position: relative; /* 确保子元素（如拖动区域、控制按钮）的定位上下文 */
  width: 220px; /* 定义整体宽度 */
  /* height 可以由内容撑开，或者根据需要设置一个最小高度 */
  box-sizing: border-box; /* 包含 padding 和 border */
  padding: 0; /* 确保没有意外的 padding 影响尺寸 */
  /* 如果你的 PomodoroTimer 或 PomodoroSequence 有明确的高度，这个 wrapper 的高度会被它们撑开 */
  /* 如果需要一个固定的总高度，可以在这里设置 */
}

/* 番茄钟内容区域，用于承载计时器和序列 */
.pomodoro-content-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 4px;
  padding: 0px; /* 内部内容区域的 padding */
  width: 100%; /* 填充父容器宽度 */
  box-sizing: border-box;
}

.toggle-button {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1000;
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-background-dark);
  width: 20px;
  height: 18px;
  padding: 0px;
}

.toggle-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toggle-button:hover {
  background-color: var(--color-blue-light);
}

.pomodoro-content-area :deep(.pomodoro-timer) {
  /* 更改选择器以适应新的父容器 */
  margin: 0 !important;
  width: 100%;
  box-sizing: border-box;
  height: 140px;
  transition: height 0.3s ease;
}

.pomodoro-content-area.sequence-mode :deep(.pomodoro-timer) {
  /* 更改选择器 */
  height: 100px !important;
}

.pomodoro-content-area :deep(.pomodoro-sequence) {
  /* 更改选择器 */
  margin: 0 !important;
  width: 100%;
  box-sizing: border-box;
  height: 135px;
  transition: height 0.3s ease;
}

.pomodoro-content-area.is-running.sequence-mode :deep(.pomodoro-sequence) {
  /* 更改选择器 */
  height: 65px !important;
}

.mini-mode-drag-region {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 20px;
  /* background-color: rgba(0, 0, 0, 0.1); */
  cursor: grab;
  z-index: 5;
}

/* 退出迷你模式按钮的容器 */
.mini-mode-controls {
  position: absolute;
  top: 5px; /* 调整到底部，给它一些空间 */
  left: 10%;
  transform: translateX(-50%);
  z-index: 10;
}

/* 退出迷你模式按钮的具体样式 */
.exit-mini-mode-button {
  width: 24px; /* 按钮大小 */
  height: 24px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px; /* 图标大小 */
  background-color: transparent; /* 默认透明背景 */
  border: none; /* 默认无边框 */
  color: gray; /* 默认灰色 */
  transition: color 0.2s ease, background-color 0.2s ease; /* 过渡效果 */
}

.exit-mini-mode-button:hover {
  color: black; /* hover 时变为黑色 */
  background-color: rgba(0, 0, 0, 0.1); /* 可选：hover 时有个浅背景 */
  cursor: pointer;
}
</style>
