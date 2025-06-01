<template>
  <div class="pomodoro-timer">
    <!-- 1 状态信息 -->
    <div class="state-text">
      <n-text>{{ stateMessage }}</n-text>
    </div>

    <!-- 2 时钟 -->
    <div class="timer-container">
      <n-text class="timer">{{ formattedTime }}</n-text>
    </div>

    <!-- 3 工作进度条 -->
    <!-- 3-1 进度条容器 -->
    <div
      class="progress-container"
      v-if="!timerStore.isBreaking"
      :style="timerStyleVars"
    >
      <!-- 3-2 蓝色进度条 -->
      <n-progress
        :percentage="progressPercentage"
        :color="isGray ? '#EBEBEB' : blueBarColor"
        :show-indicator="false"
        :height="20"
        :border-radius="2"
        class="progress-bar blue-bar"
      />
      <!-- 3-3 红色进度条 -->

      <n-progress
        :percentage="redProgressPercentage"
        :border-radius="0"
        :color="isGray ? '#EBEBEB' : redBarColor"
        :show-indicator="false"
        :height="20"
        class="progress-bar red-bar"
      />

      <!-- 3-4 阶段标签 (在进度条正上方) -->
      <div class="phase-labels">
        <span class="phase-label">r</span>
        <span class="divider"></span>
        <span class="phase-label">w</span>
        <span class="divider"></span>
        <span class="phase-label">w</span>
        <span class="divider"></span>
        <span class="phase-label">r</span>
        <span class="divider"></span>
        <span class="phase-label">t</span>
      </div>
    </div>

    <!-- 4 休息进度条 -->
    <div class="progress-container" v-else>
      <n-progress
        :percentage="progressPercentage"
        :color="'var(--color-green)'"
        :show-indicator="false"
        :height="20"
        :border-radius="2"
        class="progress-bar break-bar"
      />
      <!-- 休息模式无需显示分隔线和标签 -->
    </div>

    <!-- 5 按钮 -->
    <div class="button-container">
      <!-- 5-1 工作按钮：只在非休息状态显示 -->
      <n-button
        v-if="timerStore.pomodoroState !== 'breaking' && !showPomoSeq"
        strong
        round
        type="error"
        class="work-button"
        @click="handleWorkAction"
      >
        {{ timerStore.pomodoroState === "working" ? "Squash" : "Wind up" }}
      </n-button>

      <!-- 5-2 休息按钮：只在非工作状态显示 -->
      <n-button
        v-if="timerStore.pomodoroState !== 'working' && !showPomoSeq"
        strong
        round
        type="info"
        class="break-button"
        @click="handleBreakAction"
      >
        {{ timerStore.pomodoroState === "breaking" ? "Stop" : "Break" }}
      </n-button>

      <!-- 5-2 休息时间选择器 (只在待机状态显示) -->
      <div
        v-if="timerStore.pomodoroState === 'idle' && !showPomoSeq"
        class="duration-selector"
      >
        <n-dropdown
          trigger="click"
          :options="breakDurationOptions"
          @select="handleDurationSelect"
          placement="top-start"
          :style="{
            '--n-font-size': '8px',
            width: '90px',
            height: '60px',
            display: 'grid',
            'grid-template-columns': 'repeat(2, 1fr)',
            'place-items': 'center', // 居中对齐
            '--n-option-prefix-width': '5px',
            '--n-option-suffix-width': '0px',
          }"
          size="small"
        >
          <n-button
            size="small"
            class="duration-display"
            tertiary
            round
            type="info"
          >
            {{ formatDuration(selectedDuration) }}
          </n-button>
        </n-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useTimerStore } from "@/stores/useTimerStore.ts";
import { NText, NProgress, NButton, NDropdown } from "naive-ui";
import { clickStatsStore } from "@/stores/useClickStatsStore";
import { useSettingStore } from "@/stores/useSettingStore";

const clickStore = clickStatsStore();
const timerStore = useTimerStore();
const isGray = computed(() => timerStore.isGray); // 进度条设置
const settingStore = useSettingStore();

// 添加 showPomoSeq prop
defineProps<{
  showPomoSeq?: boolean;
}>();

const barLength = computed(() => settingStore.style.barLength);
const redBarColor = computed(() => settingStore.style.redBarColor);
const blueBarColor = computed(() => settingStore.style.blueBarColor);
const workDuration = computed(() => settingStore.durations.workDuration);
const breakDuration = computed(() => settingStore.durations.breakDuration);

const selectedDuration = ref(breakDuration.value);

// 把常量转成 CSS 变量名格式
const timerStyleVars = computed(() => {
  const barLengthValue = 175;

  const calculatedLength = barLengthValue * timerStore.redBarPercentage;
  const calculatedOffset = barLengthValue * timerStore.redBarOffsetPercentage;
  return {
    "--bar-length": barLength.value,
    "--red-bar-length": `${calculatedLength}px`,
    "--red-bar-offset": `${calculatedOffset}px`,
  };
});

// 1 状态信息
const stateMessage = computed((): string => {
  if (timerStore.pomodoroState === "working") {
    return "Initial review";
  } else if (timerStore.pomodoroState === "breaking") {
    return "Take a break";
  } else {
    return "Ready to pomodoro!";
  }
});

// 2 计时器
const formattedTime = computed((): string => {
  const totalSeconds = timerStore.timeRemaining;
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
});

// 3 进度条显示

// 3-1 总（蓝色）进度条当前进度百分比
const progressPercentage = computed((): number => {
  if (timerStore.totalTime === 0) return 0;
  return (
    ((timerStore.totalTime - timerStore.timeRemaining) / timerStore.totalTime) *
    100
  );
});

// 3-2 计算红色阶段剩余时间（w1+w2）
const redProgressPercentage = computed(() => {
  const totalSeconds = timerStore.totalTime;
  const timePassed = totalSeconds - timerStore.timeRemaining;

  const r1Sec = timerStore.r1Duration * 60;
  const wSec = timerStore.wDuration * 60;

  const wStartPercent = (r1Sec / totalSeconds) * 100;
  const wEndPercent = ((r1Sec + 2 * wSec) / totalSeconds) * 100;
  const wRangePercent = wEndPercent - wStartPercent;

  if ((timePassed / totalSeconds) * 100 <= wStartPercent) return 0;
  if ((timePassed / totalSeconds) * 100 >= wEndPercent) return 100;

  return (
    (((timePassed / totalSeconds) * 100 - wStartPercent) / wRangePercent) * 100
  );
});

// 4 按钮
// 4-1 处理开始按钮点击事件
function handleWorkAction(): void {
  if (timerStore.pomodoroState === "idle") {
    timerStore.startWorking(workDuration.value);
    clickStore.recordClick("Work");
  } else if (timerStore.pomodoroState === "working") {
    timerStore.cancelTimer();
    clickStore.recordClick("Squash");
  }
}

// 4-2 处理休息按钮点击
function handleBreakAction(): void {
  if (timerStore.pomodoroState === "breaking") {
    // 已经在休息中，停止休息
    timerStore.resetTimer();
    clickStore.recordClick("Stop");
  } else {
    // 开始休息，使用选中的时间
    timerStore.startBreak(selectedDuration.value);
    clickStore.recordClick("Break");
  }
}

// 4-3 格式化显示持续时间 (如：05、10、15)
function formatDuration(minutes: number): string {
  return minutes.toString().padStart(2, "0");
}
// 4-4 Break 持续时间选项  (默认见上方)
const breakDurationOptions = ref([
  { label: "02", key: 2 },
  { label: "05", key: 5 },
  { label: "15", key: 15 },
  { label: "30", key: 30 },
]);

// 4-5 处理休息时间选择（从下拉菜单选择）
function handleDurationSelect(key: number): void {
  selectedDuration.value = key;
}
</script>

<style>
/* 0-整体 */
.pomodoro-timer {
  text-align: center;
  width: 200px;
  margin: 5px auto;
  background-color: var(--color-background) !important;
  padding: 10px;
  height: 125px; /* 确保高度由内容决定 */
  min-height: 0; /* 防止 flex 项目被撑开 */
  border: 2px solid grey;
  border-radius: 10px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  transition: height 0.3s ease; /* 添加高度过渡动画 */
}

/* 添加序列模式下的样式 */
.pomodoro-timer:has(.button-container:empty) {
  height: 80px;
}

/* 1-状态信息 */
.state-text {
  margin-bottom: 5px;
  font: 9px Arial;
}

/* 2-计时器 */
/* 2-1 计时器容器 */
.timer-container {
  margin-bottom: 0px;
}
/* 2-2 计时器 */
.timer {
  font-size: 3em;
  display: block;
  line-height: 1em;
}

/* 3 进度条 */
/* 3-1 进度条容器 */
.progress-container {
  position: relative;
  width: var(--bar-length);
  margin: 5px auto;
}
/* 3-2 红色进度条 */
.red-bar {
  position: absolute;
  width: var(--red-bar-length) !important;
  top: 0px;
  left: var(--red-bar-offset) !important ;
  z-index: 2;
}

.blue-bar {
  z-index: 1;
}

/* 3-3 阶段标签样式 */
/* 3-3-1 标签文字 */
.phase-labels {
  position: absolute;
  display: flex;
  width: 100%;
  top: 0;
  left: 0;
  height: 20px; /* 与进度条高度一致 */
  line-height: 20px; /* 确保文字垂直居中 */
  z-index: 3; /* 确保文字在进度条上方 */
  color: var(--color-background); /* 文字颜色 */
  pointer-events: none; /* 防止文字干扰进度条的交互 */
}

.phase-label {
  display: flex;
  align-items: center; /* 垂直居中 */
  justify-content: center; /* 水平居中 */
  height: 100%;
  font-size: 10px;
}

/* 3-3-2 标签分割线 */
.divider {
  position: absolute;
  top: 0;
  width: 1px; /* 细线 */
  height: 100%; /* 等高于容器 */
  background-color: var(--color-background);
  z-index: 4;
}

/* 3-3-3  设置分隔线位置 */
.phase-labels .divider:nth-child(2) {
  left: 8%;
}
.phase-labels .divider:nth-child(4) {
  left: 50%;
}
.phase-labels .divider:nth-child(6) {
  left: 92%;
}
.phase-labels .divider:nth-child(8) {
  left: 96%;
}

/* 重新计算每个元素的宽度 */
.phase-labels .phase-label:nth-child(1) {
  width: 8%;
} /* r: 2/25 ≈ 8% */
.phase-labels .phase-label:nth-child(3) {
  width: 42%;
} /* w: 10.5/25 ≈ 42% */
.phase-labels .phase-label:nth-child(5) {
  width: 42%;
} /* w: 10.5/25 ≈ 42% */
.phase-labels .phase-label:nth-child(7) {
  width: 4%;
} /* r: 1/25 ≈ 4% */
.phase-labels .phase-label:nth-child(9) {
  width: 4%;
} /* t: 1/25 ≈ 4% */

/* 调整分隔符位置，确保恰好位于边界上 */
.phase-labels .divider:nth-child(2) {
  position: absolute;
  left: 8%;
  transform: translateX(-50%);
}
.phase-labels .divider:nth-child(4) {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.phase-labels .divider:nth-child(6) {
  position: absolute;
  left: 92%;
  transform: translateX(-50%);
}
.phase-labels .divider:nth-child(8) {
  position: absolute;
  left: 96%;
  transform: translateX(-50%);
}

/* 4 按钮  */
/* 4-1 按钮容器  */
.button-container {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  flex-wrap: nowrap; /* 防止换行 */
  width: 100%; /* 或指定一个合适的宽度 */
  margin-top: 10px;
}

/* 4-2 工作按钮  */
.work-button {
  min-width: unset !important;
  width: 60px !important;
  height: 24px !important;
  flex-shrink: 0; /* 防止按钮被压缩 */
  padding: 0 4px !important; /* 较小的内边距 */
  font-size: 13px;
}

/* 4-3 休息按钮  */
.break-button {
  min-width: unset !important;
  width: 60px !important;
  height: 24px !important;
  flex-shrink: 0; /* 防止按钮被压缩 */
  padding: 0 4px !important; /* 较小的内边距 */
  font-size: 13px;
}

/* 4-4 休息时间选择 */
/* 4-4-1 休息时间选择按钮 */
.duration-selector {
  display: flex;
  align-items: center;
}

/* 4-4-2 休息时间选择下拉菜单 */
.duration-display {
  min-width: 24px;
  height: 24px !important;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
