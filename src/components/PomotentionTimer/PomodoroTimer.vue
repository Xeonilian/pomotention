<template>
  <div class="pomodoro-timer">
    <!-- 1 状态信息：紧凑模式仅保留时钟，不展示可编辑文案 -->
    <div v-if="!isCompactMode" class="state-text" @click.stop="startEditing" @pointerdown.stop title="可编辑，回车保存，删除内容恢复默认">
      <n-input
        v-if="isEditing"
        v-model:value="editingMessage"
        @keydown.enter="saveMessage"
        @keydown.esc="cancelEditing"
        @blur="saveMessage"
        size="small"
        class="state-input"
        ref="inputRef"
        placeholder=""
      />
      <n-text v-else class="state-text-clickable">{{ displayMessage }}</n-text>
    </div>

    <!-- 2 时钟 -->
    <div class="timer-container" :class="{ 'is-compact': isCompactMode }">
      <n-text class="timer">{{ formattedTime }}</n-text>
    </div>

    <!-- 3 工作进度条 -->
    <!-- 3-1 进度条容器 -->
    <div v-if="!timerStore.isBreaking && !isCompactMode" class="progress-container" :style="timerStyleVars">
      <!-- 3-2 蓝色进度条 -->
      <n-progress
        :percentage="progressPercentage"
        :color="isGray ? '#EBEBEB' : blueBarColor"
        :show-indicator="false"
        :height="20"
        :border-radius="2"
        class="progress-bar blue-bar"
      />
      <!-- 3-3 红色进度条（W >= 5 分钟才显示；短时仅蓝条） -->

      <n-progress
        v-if="showPhaseDetail"
        :percentage="redProgressPercentage"
        :border-radius="0"
        :color="isGray ? '#EBEBEB' : redBarColor"
        :show-indicator="false"
        :height="20"
        class="progress-bar red-bar"
      />

      <!-- 3-4 阶段标签 (在进度条正上方) -->
      <div v-if="showPhaseDetail" class="phase-labels">
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
    <div v-if="timerStore.isBreaking && !isCompactMode" class="progress-container-break">
      <n-progress :percentage="progressPercentage" :color="'var(--color-green)'" :show-indicator="false" :height="20" :border-radius="2" />
      <!-- 休息模式无需显示分隔线和标签 -->
    </div>

    <!-- 5 按钮 -->
    <div v-if="!isCompactMode" class="button-container">
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
      <div v-if="timerStore.pomodoroState === 'idle' && !showPomoSeq" class="duration-selector">
        <n-dropdown
          trigger="click"
          :options="breakDurationOptions"
          @select="handleDurationSelect"
          placement="top-start"
          :style="{
            display: 'grid',
            'grid-template-columns': 'repeat(2, 3fr)',
            'place-items': 'center', // 居中对齐
          }"
          size="small"
        >
          <n-button size="small" class="duration-display" tertiary round type="info">
            {{ formatDuration(selectedDuration) }}
          </n-button>
        </n-dropdown>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from "vue";
import { useTimerStore } from "@/stores/useTimerStore.ts";
import { NText, NProgress, NButton, NDropdown, NInput } from "naive-ui";
import { clickStatsStore } from "@/stores/useClickStatsStore";
import { useSettingStore } from "@/stores/useSettingStore";

const clickStore = clickStatsStore();
const timerStore = useTimerStore();
const isGray = computed(() => timerStore.isGray); // 进度条设置
const settingStore = useSettingStore();

// 添加 showPomoSeq 和 isCompactMode prop
const props = defineProps<{
  showPomoSeq?: boolean;
  isCompactMode?: boolean;
}>();

const isCompactMode = computed(() => props.isCompactMode ?? false);

const barLength = computed(() => settingStore.settings.style.barLength);
const redBarColor = computed(() => settingStore.settings.style.redBarColor);
const blueBarColor = computed(() => settingStore.settings.style.blueBarColor);
const workDuration = computed(() => settingStore.settings.durations.workDuration);
const breakDuration = computed(() => settingStore.settings.durations.breakDuration);

const selectedDuration = ref(breakDuration.value);

// 编辑状态管理
const isEditing = ref(false);
const editingMessage = ref("");
const inputRef = ref<InstanceType<typeof NInput> | null>(null);

/** 与 store.effectiveWorkMinutes 一致：>=5 显示红条与阶段标签 */
const showPhaseDetail = computed(() => timerStore.effectiveWorkMinutes >= 5);

// 把常量转成 CSS 变量名格式
const timerStyleVars = computed(() => {
  const barLengthValue = 197;

  const base: Record<string, string> = {
    "--bar-length": barLength.value,
  };

  if (!showPhaseDetail.value) {
    return {
      ...base,
      "--red-bar-length": "0px",
      "--red-bar-offset": "0px",
    };
  }

  const W = timerStore.effectiveWorkMinutes;
  const w = timerStore.wDuration;
  const pct = (x: number) => `${(x / W) * 100}%`;

  const base: Record<string, string> = {
    "--bar-length": barLength.value,
  };

  if (!showPhaseDetail.value) {
    return {
      ...base,
      "--red-bar-length": "0px",
      "--red-bar-offset": "0px",
    };
  }

  const W = timerStore.effectiveWorkMinutes;
  const w = timerStore.wDuration;
  const pct = (x: number) => `${(x / W) * 100}%`;

  const calculatedLength = barLengthValue * timerStore.redBarPercentage + 2;
  const calculatedOffset = barLengthValue * timerStore.redBarOffsetPercentage + 0.5;

  return {
    ...base,
    "--red-bar-length": `${calculatedLength}px`,
    "--red-bar-offset": `${calculatedOffset}px`,
    "--ph-label-r1": pct(2),
    "--ph-label-w": pct(w),
    "--ph-label-r2": pct(1),
    "--ph-label-t": pct(1),
    "--ph-div-1": pct(2),
    "--ph-div-2": pct(2 + w),
    "--ph-div-3": pct(2 + 2 * w),
    "--ph-div-4": pct(2 + 2 * w + 1),
  };
});

// 1 状态信息
// 1-1 默认状态消息（根据时间状态）
const defaultStateMessage = computed((): string => {
  if (timerStore.pomodoroState === "working") {
    if (timerStore.currentPhase === "r1") {
      return "Initial Review";
    } else if (timerStore.currentPhase === "r2") {
      return "Final Review";
    } else {
      return "Getting Things Done!";
    }
  } else if (timerStore.pomodoroState === "breaking") {
    return "Take a break";
  } else {
    return "Ready to pomodoro!";
  }
});

// 1-2 显示的消息（优先显示自定义消息，没有则显示默认消息）
const displayMessage = computed((): string => {
  return settingStore.settings.pomodoroStateMessage || defaultStateMessage.value;
});

// 1-3 开始编辑
function startEditing(): void {
  isEditing.value = true;
  editingMessage.value = settingStore.settings.pomodoroStateMessage || "";
  nextTick(() => {
    inputRef.value?.focus();
  });
}

// 1-4 保存消息
function saveMessage(): void {
  const trimmedValue = editingMessage.value.trim();
  if (trimmedValue === "") {
    // 如果为空，清除自定义消息
    settingStore.settings.pomodoroStateMessage = undefined;
  } else {
    // 保存自定义消息（即使和默认值相同也保存）
    settingStore.settings.pomodoroStateMessage = trimmedValue;
  }
  isEditing.value = false;
}

// 1-5 取消编辑
function cancelEditing(): void {
  isEditing.value = false;
  editingMessage.value = "";
}

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
  return ((timerStore.totalTime - timerStore.timeRemaining) / timerStore.totalTime) * 100;
});

// 3-2 计算红色阶段剩余时间（w1+w2）
const redProgressPercentage = computed(() => {
  const totalSeconds = timerStore.totalTime;
  const timePassed = totalSeconds - timerStore.timeRemaining;

  // 总时长过小/为 0 时，避免 NaN 导致红条不可见
  if (totalSeconds <= 0) return 0;

  const r1Sec = timerStore.r1Duration * 60;
  const wSec = timerStore.wDuration * 60;

  const wStartPercent = (r1Sec / totalSeconds) * 100;
  const wEndPercent = ((r1Sec + 2 * wSec) / totalSeconds) * 100;
  const wRangePercent = wEndPercent - wStartPercent;

  // w 区间为 0 时，避免除 0
  if (wRangePercent <= 0) return 0;

  if ((timePassed / totalSeconds) * 100 <= wStartPercent) return 0;
  if ((timePassed / totalSeconds) * 100 >= wEndPercent) return 100;

  return (((timePassed / totalSeconds) * 100 - wStartPercent) / wRangePercent) * 100;
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
  { label: "10", key: 10 },
  { label: "15", key: 15 },
  { label: "30", key: 30 },
  { label: "60", key: 60 },
]);

// 4-5 处理休息时间选择（从下拉菜单选择）
function handleDurationSelect(key: number): void {
  selectedDuration.value = key;
}
</script>

<style scoped>
/* 0-整体 */
.pomodoro-timer {
  text-align: center;
  width: 200px;
  margin: 5px auto;
  background-color: var(--color-background);
  padding: 10px;
  height: 125px; /* 确保高度由内容决定 */
  min-height: 0; /* 防止 flex 项目被撑开 */
  border: 0px solid var(--color-text-secondary);
  border-radius: 8px;
  box-shadow: 1px 2px 6px var(--color-background-light-transparent);
}

/* 添加序列模式下的样式 */
.pomodoro-timer:has(.button-container:empty) {
  height: 80px;
}

/* 1-状态信息 */
.state-text {
  margin-bottom: 5px;
  font: 10px Arial;
  cursor: pointer;
  height: 16px; /* 固定高度，避免布局变化 */
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative; /* 为绝对定位的输入框提供定位上下文 */
  width: 140px;
  transform: translateX(20%);
}

:deep(.n-input.state-input) {
  --n-box-shadow-focus: none !important;
}

.state-text-clickable {
  user-select: none;
  width: 100%;
  text-align: center;
}

.state-text-clickable:hover {
  opacity: 0.7;
}

.state-input {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 180px;
  font-size: 10px;
  height: 12px;
  line-height: 10px;
  margin: 0;
  padding: 0;
}

/* 调整输入框内部文字垂直居中 */
.state-input :deep(.n-input__input-el) {
  height: 12px;
  line-height: 12px;
  padding: 0;
  font-size: 9px;
  font-family: Arial;
}

.state-input :deep(.n-input-wrapper) {
  height: 12px;
  min-height: 12px;
}

/* 2-计时器 */
/* 2-1 计时器容器 */
.timer-container {
  margin-bottom: 0px;
}

/* 紧凑：容器占满父级竖向空间并居中时钟 */
.timer-container.is-compact {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
}

/* 2-2 计时器 */
.timer {
  font-size: 3em;
  display: block;
  line-height: 0.9em;
}

/* 紧凑模式：时钟略大于普通模式，竖向由容器 flex 居中 */
.timer-container.is-compact .timer {
  font-size: 3em;
  line-height: 0.9em;
  text-align: center;
  padding: 8px;
}

/* 紧凑模式下的整体：flex 列 + 子项 flex:1 实现上下居中 */
.pomodoro-timer:has(.timer-container.is-compact) {
  width: 120px;
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-sizing: border-box;
}

/* 3 进度条 */
/* 3-1 进度条容器 */
.progress-container {
  position: relative;
  width: var(--bar-length);
  margin: 5px 0;
}

/* 3-2 红色进度条 */
.red-bar {
  position: absolute;
  width: var(--red-bar-length);
  top: 0px;
  left: var(--red-bar-offset);
  z-index: 2;
}

.blue-bar {
  z-index: 1;
}

.progress-container-break {
  margin: 5px 0;
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
  z-index: 5;
}

/* 3-3-3 阶段宽度与分隔线：由 progress-container 上 CSS 变量注入 */
.phase-labels .phase-label:nth-child(1) {
  width: var(--ph-label-r1);
}
.phase-labels .phase-label:nth-child(3) {
  width: var(--ph-label-w);
}
.phase-labels .phase-label:nth-child(5) {
  width: var(--ph-label-w);
}
.phase-labels .phase-label:nth-child(7) {
  width: var(--ph-label-r2);
}
.phase-labels .phase-label:nth-child(9) {
  width: var(--ph-label-t);
}

.phase-labels .divider:nth-child(2) {
  position: absolute;
  left: var(--ph-div-1);
  transform: translateX(-50%);
}
.phase-labels .divider:nth-child(4) {
  position: absolute;
  left: var(--ph-div-2);
  transform: translateX(-50%);
}
.phase-labels .divider:nth-child(6) {
  position: absolute;
  left: var(--ph-div-3);
  transform: translateX(-50%);
}
.phase-labels .divider:nth-child(8) {
  position: absolute;
  left: var(--ph-div-4);
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
  min-width: unset;
  width: 60px;
  height: 24px;
  flex-shrink: 0; /* 防止按钮被压缩 */
  padding: 0 4px; /* 较小的内边距 */
  font-size: 13px;
}

/* 4-3 休息按钮  */
.break-button {
  min-width: unset;
  width: 60px;
  height: 24px;
  flex-shrink: 0; /* 防止按钮被压缩 */
  padding: 0 4px; /* 较小的内边距 */
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
  height: 24px;
  padding: 0 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>
