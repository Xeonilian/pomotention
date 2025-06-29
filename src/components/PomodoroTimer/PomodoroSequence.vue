<template>
  <div class="pomodoro-sequence" :class="{ running: isRunning }">
    <div class="status-row" v-show="!isRunning">
      <span class="status-label">Let's 🍅!</span>
    </div>

    <div
      class="progress-container"
      ref="progressContainer"
      v-show="isRunning"
    ></div>

    <n-input
      v-if="!isRunning"
      v-model:value="sequenceInput"
      placeholder="输入序列，例如：🍅+05"
      class="sequence-input"
      type="textarea"
    />

    <div class="button-row">
      <n-button
        class="action-button"
        @click="addPomodoro"
        title="insert 🍅+05"
        :disabled="isRunning"
        tertiary
        circle
      >
        🍅
      </n-button>

      <n-button
        class="action-button"
        @click="startPomodoroCircle"
        :disabled="isRunning"
        tertiary
        circle
      >
        <template #icon>
          <n-icon :component="PlayCircle24Regular" />
        </template>
      </n-button>

      <n-button class="action-button" @click="stopPomodoro" tertiary circle>
        <template #icon>
          <n-icon :component="RecordStop24Regular" />
        </template>
      </n-button>

      <n-button
        class="action-button"
        @click="handleToggleWhiteNoise"
        :title="isWhiteNoiseEnabled ? '关闭白噪音' : '开启白噪音'"
        tertiary
        circle
      >
        <template #icon>
          <n-icon
            :component="
              isWhiteNoiseEnabled ? Speaker224Regular : SpeakerMute24Regular
            "
          />
        </template>
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch } from "vue";
import { NButton, NIcon, NInput } from "naive-ui";
import { useTimerStore } from "@/stores/useTimerStore";
import {
  toggleWhiteNoise,
  getWhiteNoiseState,
  setPomodoroRunning,
} from "@/core/sounds.ts";
import {
  Speaker224Regular,
  SpeakerMute24Regular,
  PlayCircle24Regular,
  RecordStop24Regular,
} from "@vicons/fluent";

type PomodoroStep = {
  type: "work" | "break";
  duration: number;
};

const timerStore = useTimerStore();

const emit = defineEmits<{
  (e: "pomo-seq-change"): void;
}>();

// 数据
const sequenceInput = ref<string>(">>>>🍅+05+🍅+05+🍅+05+🍅+15");
const isRunning = ref<boolean>(false);
const timeoutHandles = ref<NodeJS.Timeout[]>([]);
const currentStep = ref<number>(0);
const totalPomodoros = ref<number>(0);
const currentPomodoro = ref<number>(1);
const statusLabel = ref<string>("Let's 🍅!");

// 白噪音状态
const isWhiteNoiseEnabled = ref<boolean>(getWhiteNoiseState());

// 添加进度监听
watch(
  () => timerStore.timeRemaining,
  () => {
    if (isRunning.value && progressContainer.value) {
      updateProgressStatus(currentStep.value);
    }
  }
);

// 解析序列
function parseSequence(sequence: string): PomodoroStep[] {
  const validBreakTimes = ["02", "05", "15", "30"];
  const firstStepMatch = sequence.match(/🍅|\d+/);
  if (!firstStepMatch) return [];

  const firstStepIndex = firstStepMatch.index || 0;
  sequence = sequence.substring(firstStepIndex);

  const steps = sequence.split("+").map((step) => step.trim());
  return steps.map((step) => {
    if (step.includes("🍅")) {
      return { type: "work", duration: 25 };
    } else {
      const breakTime = step.padStart(2, "0");
      if (!validBreakTimes.includes(breakTime)) {
        throw new Error(
          `Invalid break time: ${step}. Allowed break times: ${validBreakTimes.join(
            ", "
          )}`
        );
      }
      return { type: "break", duration: parseInt(breakTime) };
    }
  });
}

// 开始番茄钟循环
function startPomodoroCircle(): void {
  try {
    const steps = parseSequence(sequenceInput.value);
    if (steps.length === 0) {
      alert("请输入有效的序列。");
      return;
    }
    emit("pomo-seq-change");
    isRunning.value = true;
    setPomodoroRunning(true); // 设置番茄钟运行状态
    currentStep.value = 0;
    totalPomodoros.value = steps.filter((step) => step.type === "work").length;
    currentPomodoro.value = 1;
    statusLabel.value = `🍅 ${currentPomodoro.value}/${totalPomodoros.value}`;
    // 初始化进度条
    initializeProgress(sequenceInput.value);
    updateProgressStatus(currentStep.value);
    // 开始第一个工作周期
    const firstStep = steps[0];
    if (firstStep.type === "work") {
      timerStore.startWorking(firstStep.duration);
    } else {
      timerStore.startBreak(firstStep.duration);
    }

    runStep(steps);
  } catch (error) {
    alert((error as Error).message);
  }
}

// 执行单个步骤
function runStep(steps: PomodoroStep[]): void {
  if (!isRunning.value || currentStep.value >= steps.length) {
    stopPomodoro();
    return;
  }

  const step = steps[currentStep.value];

  const onFinish = () => {
    if (!isRunning.value) return;
    // 更新当前步骤的进度条状态为已完成
    updateProgressStatus(currentStep.value);
    currentStep.value++;
    // 更新下一个步骤的进度条状态
    updateProgressStatus(currentStep.value);
    runStep(steps);
  };

  if (step.type === "work") {
    statusLabel.value = `🍅 ${currentPomodoro.value}/${totalPomodoros.value}`;
    timerStore.startWorking(step.duration, () => {
      currentPomodoro.value++;
      onFinish();
    });
  } else {
    statusLabel.value = `Break ${step.duration}min`;
    timerStore.startBreak(step.duration, onFinish);
  }
}

// 在 PomodoroSequence.vue 中修改 stopPomodoro 函数
function stopPomodoro(): void {
  // 先调用 store 的 resetTimer 方法
  timerStore.resetTimer();
  emit("pomo-seq-change");
  // 然后更新本地状态
  isRunning.value = false;
  setPomodoroRunning(false); // 设置番茄钟停止状态
  timeoutHandles.value.forEach((handle) => clearTimeout(handle));
  timeoutHandles.value = [];
  console.log("Stopping pomodoro...");

  // 重置状态
  currentStep.value = 0;
  currentPomodoro.value = 1;
  totalPomodoros.value = 0;
  statusLabel.value = "Let's 🍅!";

  // 清空进度条
  if (progressContainer.value) {
    progressContainer.value.innerHTML = "";
  }

  // 重置序列输入
  sequenceInput.value = ">>>>🍅+05";
}

// 添加番茄钟序列
function addPomodoro(): void {
  if (sequenceInput.value.trim() === "") {
    sequenceInput.value = "🍅+05";
  } else {
    sequenceInput.value += "+🍅+05";
  }
}

// 添加 ref
const progressContainer = ref<HTMLElement | null>(null);

// 创建时间块函数
function createTimeBlock(duration: number, type: string): HTMLElement {
  const block = document.createElement("div");
  block.className = "time-block";
  // 根据时长设置宽度，保持总长度占满
  const totalWidth = 196; // 总容器宽度
  const totalDuration = parseSequence(sequenceInput.value).reduce(
    (sum, step) => sum + step.duration,
    0
  );
  const width = (duration / totalDuration) * totalWidth;
  block.style.width = `${width}px`;
  block.style.height = "20px";
  block.style.margin = "0.5px";
  block.style.borderRadius = "2px";
  block.classList.add(type);
  return block;
}

// 更新进度状态函数
function updateProgressStatus(currentStep: number): void {
  const blocks = progressContainer.value?.children;
  if (!blocks) return;

  Array.from(blocks).forEach((block, index) => {
    const element = block as HTMLElement;
    if (index < currentStep) {
      // 已完成的块
      element.style.backgroundImage = "";
      element.style.animation = "none";
      element.style.backgroundColor = element.classList.contains("work")
        ? "var(--color-red)"
        : "var(--color-green)";
    } else if (index === currentStep) {
      // 当前执行的块
      element.style.backgroundImage =
        "linear-gradient(45deg, var(--color-background-light-transparent) 25%, transparent 25%, transparent 50%, var(--color-background-light-transparent) 50%, var(--color-background-light-transparent) 75%, transparent 75%, transparent)";
      element.style.backgroundSize = "20px 20px";
      element.style.animation = "progress-animation 1s linear infinite";
      element.style.backgroundColor = element.classList.contains("work")
        ? "var(--color-red)"
        : "var(--color-green)";
    } else {
      // 未开始的块
      element.style.backgroundColor = element.classList.contains("work")
        ? "var(--color-red-dark-transparent)"
        : "var(--color-green-dark-transparent)";
    }
  });
}

// 初始化进度条
function initializeProgress(sequence: string): void {
  console.log("Initializing progress with sequence:", sequence);
  if (!progressContainer.value) {
    console.error("Progress container not found!");
    return;
  }

  progressContainer.value.innerHTML = "";
  const steps = parseSequence(sequence);
  console.log("Steps for progress:", steps);

  steps.forEach((step) => {
    const block = createTimeBlock(step.duration, step.type);
    block.classList.add(step.type);
    progressContainer.value?.appendChild(block);
  });
}

// 添加样式
const style = document.createElement("style");
style.textContent = `
.time-block {
  transition: background-color 0.3s ease;
  margin: 0;
}

.time-block.work {
  background-color: var(--color-red-light-transparent);
}

.time-block.break {
  background-color: var(--color-green-light-transparent);
}

@keyframes progress-animation {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 20px 0;
  }
}
`;
document.head.appendChild(style);

// 切换白噪音
function handleToggleWhiteNoise(): void {
  isWhiteNoiseEnabled.value = toggleWhiteNoise();
}

// 组件卸载时清理
onUnmounted(() => {
  // 只有在序列正在运行时才停止计时器
  if (isRunning.value) {
    stopPomodoro();
  }
});
</script>

<style scoped>
.pomodoro-sequence {
  text-align: center;
  width: 200px;
  margin: 0 auto;
  background-color: var(--color-background) !important;
  padding: 5px 10px 0px 10px;
  height: 125px;
  min-height: 120px;
  border: 2px solid var(--color-text-secondary);
  border-radius: 8px;
  box-shadow: 0px 4px 6px var(--color-background-light-transparent);
}

.pomodoro-sequence.running {
  height: 43px;
  min-height: 43px;
  overflow: hidden;
}

.status-row {
  display: flex;
  justify-content: center;
  margin: 0px;
}

.status-label {
  font-size: 16px;
  font-weight: bold;
  height: 16px;
  margin-bottom: 10px;
}

.progress-container {
  display: flex;
  margin: 0px auto;
  width: 196px;
  height: 0;
  overflow: hidden;
}

.progress-container:has(.time-block) {
  height: 25px; /* 增加进度条容器高度 */
  margin-top: 0px;
  margin-bottom: 0px;
}

.sequence-input {
  max-height: 60px;
  font-family: "Consolas", "Courier New", Courier, "Lucida Console", Monaco,
    "Consolas", "Liberation Mono", "Menlo", monospace;
  font-size: 12px;
  padding: 0px;
  resize: none;
  display: block;
  margin: 0 auto;
  margin-bottom: 5px; /* 减小底部边距 */
  text-align: left;
  overflow: hidden;
}

:deep(.n-input-wrapper) {
  width: 190px;
}

.hint-text {
  font-size: 12px;
  color: gray;
  margin-bottom: 0px;
}

.button-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 120px; /* 增加宽度以适应新按钮 */
  margin: 0 auto;
}

.action-button {
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20%;
  cursor: pointer;
  border: 1px solid var(--color-background-dark);
}

.action-button:hover {
  background-color: var(--color-blue-light);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
