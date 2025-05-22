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

    <div>
      <textarea
        v-if="!isRunning"
        v-model="sequenceInput"
        placeholder="🍅+05+🍅+15..."
        class="sequence-input"
      ></textarea>
    </div>

    <div class="button-row">
      <button
        class="action-button"
        @click="addPomodoro"
        title="insert 🍅+05"
        :disabled="isRunning"
      >
        🍅
      </button>
      <button
        class="action-button"
        @click="addPizza"
        title="insert 4x(🍅+05)"
        :disabled="isRunning"
      >
        🍕
      </button>
      <button
        class="action-button"
        @click="startPomodoroCircle"
        :disabled="isRunning"
      >
        ▶️
      </button>
      <button class="action-button" @click="stopPomodoro">⏹️</button>
      <!-- <button class="action-button" @click="testBreak" :disabled="isRunning">
        ☕
      </button> -->
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { useTimerStore } from "@/stores/useTimerStore";

type PomodoroStep = {
  type: "work" | "break";
  duration: number;
};

const timerStore = useTimerStore();

// 数据
const sequenceInput = ref<string>(">>>>🍅+05+🍅+05+🍅+05+🍅+15");
const isRunning = ref<boolean>(false);
const timeoutHandles = ref<NodeJS.Timeout[]>([]);
const currentStep = ref<number>(0);
const totalPomodoros = ref<number>(0);
const currentPomodoro = ref<number>(1);
const statusLabel = ref<string>("Let's 🍅!");

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

    isRunning.value = true;
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
    currentStep.value++;
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
  isRunning.value = false;
  timeoutHandles.value.forEach((handle) => clearTimeout(handle));
  timeoutHandles.value = [];
  console.log("Stopping pomodoro...");

  // 调用 store 的 resetTimer 方法
  timerStore.resetTimer();

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
  sequenceInput.value = ">>>>🍅+05+🍅+05+🍅+05+🍅+15";
}

// 测试 break
// function testBreak(): void {
//   try {
//     isRunning.value = true;
//     statusLabel.value = "Break 5min";
//     timerStore.startBreak(15, () => {
//       isRunning.value = false;
//       statusLabel.value = "Let's 🍅!";
//     });
//   } catch (error) {
//     alert((error as Error).message);
//   }
// }

// 添加番茄钟序列
function addPomodoro(): void {
  if (sequenceInput.value.trim() === "") {
    sequenceInput.value = "🍅+05";
  } else {
    sequenceInput.value += "+🍅+05";
  }
}

// 添加披萨序列
function addPizza(): void {
  if (sequenceInput.value.trim() === "") {
    sequenceInput.value = "🍅+05+🍅+05+🍅+05+🍅+15";
  } else {
    sequenceInput.value += "+🍅+05+🍅+05+🍅+05+🍅+15";
  }
}

// 添加 ref
const progressContainer = ref<HTMLElement | null>(null);

// 创建时间块函数
function createTimeBlock(duration: number, type: string): HTMLElement {
  const block = document.createElement("div");
  block.className = "time-block";
  block.style.width = `${duration * 4}px`; // 根据时长设置宽度
  block.style.height = "20px"; // 添加固定高度
  block.style.margin = "1px"; // 添加间距
  block.style.borderRadius = "4px"; // 添加圆角
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
        ? "#f44336"
        : "#4CAF50";
    } else if (index === currentStep) {
      // 当前执行的块
      element.style.backgroundImage =
        "linear-gradient(45deg, rgba(255,248,10,.35) 25%, transparent 25%, transparent 50%, rgba(255,248,10,.35) 50%, rgba(255,248,10,.35) 75%, transparent 75%, transparent)";
      element.style.backgroundSize = "20px 20px";
      element.style.animation = "progress-animation 1s linear infinite";
      element.style.backgroundColor = element.classList.contains("work")
        ? "#f44336"
        : "#4CAF50";
    } else {
      // 未开始的块
      element.style.backgroundColor = element.classList.contains("work")
        ? "rgba(244, 67, 54, 0.2)"
        : "rgba(76, 175, 80, 0.2)";
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
  background-color: rgba(244, 67, 54, 0.2);
}

.time-block.break {
  background-color: rgba(76, 175, 80, 0.2);
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
  margin: 5px auto;
  background-color: var(--color-background) !important;
  padding: 10px;
  height: auto;
  min-height: 120px;
  border: 2px solid grey;
  border-radius: 10px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.pomodoro-sequence.running {
  height: 55px;
  min-height: 55px;
  overflow: hidden;
}

.status-row {
  display: flex;
  justify-content: center;
  margin: 0px;
}

.status-label {
  font-size: 16px;
  color: rgb(35, 39, 43);
  font-weight: bold;
  height: 16px;
  margin-bottom: 10px;
}

.progress-container {
  display: flex;
  margin: 0px auto;
  width: auto;
  height: 0;
  overflow: hidden;
  transition: all 0.3s ease;
}

.progress-container:has(.time-block) {
  height: 30px; /* 增加进度条容器高度 */
  margin-top: 2px;
  margin-bottom: 0px;
}

.sequence-input {
  width: 175px;
  height: 60px; /* 调整输入框高度 */
  font-family: "Consolas", "Courier New", Courier, "Lucida Console", Monaco,
    "Consolas", "Liberation Mono", "Menlo", monospace;
  font-size: 14px;
  padding: 0px;
  resize: none;
  display: block;
  margin: 0 auto;
  margin-bottom: 10px; /* 减小底部边距 */
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
  width: 140px;
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
  border: 1px solid #ccc;
  background-color: #fff;
}

.action-button:hover {
  background-color: #f0f0f0;
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.time-block {
  transition: background-color 0.3s ease;
  margin: 0;
}

.time-block.work {
  background-color: rgba(244, 67, 54, 0.2);
}

.time-block.break {
  background-color: rgba(76, 175, 80, 0.2);
}

@keyframes progress-animation {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 20px 0;
  }
}
</style>
