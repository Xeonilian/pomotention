<template>
  <div class="pomodoro-container">
    <button class="minimize-button" @click="toggleMinimize">
      {{ isMinimized ? "+" : "-" }}
    </button>

    <div class="status-row">
      <span class="status-label">Let's 🍅!</span>
    </div>

    <div class="progress-container" ref="progressContainer"></div>

    <div class="sequence-row" v-if="!isMinimized">
      <textarea
        v-model="sequenceInput"
        placeholder="🍅+05+🍅+15..."
        class="sequence-input"
      ></textarea>
    </div>

    <!-- <div class="hint-text" v-if="!isMinimized">
      🍅=25min work, 05/15/30=break minutes
    </div> -->

    <div class="button-row" v-if="!isMinimized">
      <button class="action-button" @click="addPomodoro" title="insert 🍅+05">
        🍅
      </button>
      <button class="action-button" @click="addPizza" title="insert 4x(🍅+05)">
        🍕
      </button>
      <button
        class="action-button"
        @click="startPomodoro"
        :disabled="isRunning"
      >
        ▶️
      </button>
      <button class="action-button" @click="stopPomodoro" :disabled="isRunning">
        ⏹️
      </button>
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
const isMinimized = ref<boolean>(false);
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
function startPomodoroCycles(): void {
  try {
    const steps = parseSequence(sequenceInput.value);
    if (steps.length === 0) {
      alert("Please enter a valid sequence.");
      return;
    }

    isRunning.value = true;
    currentStep.value = 0;
    totalPomodoros.value = steps.filter((step) => step.type === "work").length;
    currentPomodoro.value = 1;
    statusLabel.value = `🍅 ${currentPomodoro.value}/${totalPomodoros.value}`;

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

// 停止番茄钟
function stopPomodoro(): void {
  isRunning.value = false;
  timeoutHandles.value.forEach((handle) => clearTimeout(handle));
  timeoutHandles.value = [];
  timerStore.resetTimer();
  statusLabel.value = "Let's 🍅!";
}

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

// 最小化切换
function toggleMinimize(): void {
  isMinimized.value = !isMinimized.value;
}

// 组件卸载时清理
onUnmounted(() => {
  stopPomodoro();
});
</script>

<style scoped>
.pomodoro-container {
  position: relative;
  background-color: white;
  border: 2px solid grey;
  border-radius: 10px;
  padding: 10px;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0px 4px 6px rgba(0, 0, 0, 0.1);
  width: 300px;
}

.minimize-button {
  position: absolute;
  top: 5px;
  right: 5px;
  width: 20px;
  height: 20px;
  line-height: 15px;
  text-align: center;
  padding: 0;
  border-radius: 50%;
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
}

.progress-container {
  display: flex;
  gap: 2px;
  margin: 0 auto;
  padding: 5px;
  width: 230px;
}

.sequence-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0px;
}

.sequence-input {
  width: 230px;
  height: 50px;
  font-family: "Consolas", "Courier New", Courier, "Lucida Console", Monaco,
    "Consolas", "Liberation Mono", "Menlo", monospace;
  font-size: 14px;
  padding: 0px;
  resize: none;
  display: block;
  margin: 0 auto;
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
  width: 200px;
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
