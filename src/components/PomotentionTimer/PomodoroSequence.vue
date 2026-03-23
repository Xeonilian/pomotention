<template>
  <div class="pomodoro-sequence" :class="{ running: isRunning }">
    <div class="status-row" v-show="!isRunning">
      <span class="status-label">Let's 🍅!</span>
    </div>

    <div class="progress-container" ref="progressContainer" v-show="isRunning"></div>

    <n-input v-if="!isRunning" v-model:value="sequenceInput" placeholder="输入序列，例如：🍅+05" class="sequence-input" type="textarea" />

    <div class="button-row">
      <n-button class="action-button" @click="startPomodoroCircle" :disabled="isRunning" tertiary circle>
        <template #icon>
          <n-icon :component="Play24Regular" />
        </template>
      </n-button>

      <n-button class="action-button" @click="stopPomodoro" tertiary circle>
        <template #icon>
          <n-icon size="14" :component="Stop20Filled" />
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
          <n-icon :component="isWhiteNoiseEnabled ? Speaker224Regular : SpeakerMute24Regular" />
        </template>
      </n-button>
      <n-popover
        trigger="click"
        placement="top"
        :show-arrow="false"
        class="popover-container"
        :style="{
          padding: '2px 0 2px 0',
          boxShadow: 'none',
          backgroundColor: 'var(--color-background)',
        }"
        :duration="500"
        :delay="500"
      >
        <template #trigger>
          <n-button class="action-button" title="选择白噪音" tertiary circle>
            <template #icon>
              <n-icon :component="MusicNote124Filled" />
            </template>
          </n-button>
        </template>

        <!-- Popover 的内容：垂直排列的按钮 -->
        <div class="popover-actions">
          <n-button secondary circle type="info" size="small" title="雨声" @click="resetWhiteNoise(SoundType.WHITE_NOISE_RAIN)">
            <template #icon>
              <n-icon><WeatherThunderstorm20Regular /></n-icon>
            </template>
          </n-button>
          <n-button secondary type="info" circle size="small" title="滴答声" @click="resetWhiteNoise(SoundType.WORK_TICK)">
            <template #icon>
              <n-icon><ClockAlarm24Regular /></n-icon>
            </template>
          </n-button>
          <n-button secondary type="info" circle size="small" title="鸟鸣海声" @click="resetWhiteNoise(SoundType.WHITE_NOISE_BIRD_SEA)">
            <template #icon>
              <n-icon><Icons20Regular /></n-icon>
            </template>
          </n-button>
        </div>
      </n-popover>

      <n-button class="action-button" @click="addPomodoro" title="insert 🍅+05" :disabled="isRunning" tertiary circle>🍅</n-button>
      <div class="pomo-duration-input-container">
        =
        <n-input
          ref="pomoDurationInput"
          v-model:value="defaultPomoDuration"
          placeholder=""
          class="pomo-duration-input"
          size="small"
          @blur="handleBlurRestore"
          @keydown="handleKeydown"
          title="设置番茄时长/回车确认"
          :disabled="isRunning"
        />
        <span>&nbsp;min</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from "vue";
import { NButton, NIcon, NInput, useDialog } from "naive-ui";
import { useTimerStore } from "@/stores/useTimerStore";
import { useSettingStore } from "@/stores/useSettingStore";
import { toggleWhiteNoise, stopWhiteNoise, startWhiteNoise } from "@/core/sounds.ts";
import {
  Speaker224Regular,
  SpeakerMute24Regular,
  Play24Regular,
  Stop20Filled,
  WeatherThunderstorm20Regular,
  ClockAlarm24Regular,
  MusicNote124Filled,
  Icons20Regular,
} from "@vicons/fluent";
import { SoundType } from "@/core/sounds.ts";
type PomodoroStep = {
  type: "work" | "break";
  duration: number;
};

const timerStore = useTimerStore();
const settingStore = useSettingStore();
const dialog = useDialog();

const emit = defineEmits<{
  (e: "pomo-seq-running", status: boolean): void;
}>();

// 数据
const sequenceInput = ref<string>(settingStore.settings.pomoSequenceInput ?? ">>>>🍅+05+🍅+05+🍅+05+🍅+15");
const isRunning = ref<boolean>(false);
const timeoutHandles = ref<NodeJS.Timeout[]>([]);
const currentStep = ref<number>(0);
const totalPomodoros = ref<number>(0);
const currentPomodoro = ref<number>(1);
const statusLabel = ref<string>("Let's 🍅!");
const defaultPomoDuration = ref<string>(settingStore.settings.durations.workDuration.toString());

// 白噪音状态
const isWhiteNoiseEnabled = computed({
  get: () => settingStore.settings.isWhiteNoiseEnabled,
  set: (val) => {
    settingStore.settings.isWhiteNoiseEnabled = val;
  },
});

// 添加进度监听
watch(
  () => timerStore.timeRemaining,
  () => {
    if (isRunning.value && progressContainer.value) {
      updateProgressStatus(currentStep.value);
    }
  },
);

// 监听settingStore中的工作时长变化
watch(
  () => settingStore.settings.durations.workDuration,
  (newValue) => {
    defaultPomoDuration.value = newValue.toString();
  },
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
      return { type: "work", duration: parseInt(defaultPomoDuration.value) };
    } else {
      const breakTime = step.padStart(2, "0");
      if (!validBreakTimes.includes(breakTime)) {
        throw new Error(`Invalid break time: ${step}. Allowed break times: ${validBreakTimes.join(", ")}`);
      }
      return { type: "break", duration: parseInt(breakTime) };
    }
  });
}

/** 冷启动或 store finalize 无 phase 回调时，由 sequencePhaseContinuation 推进序列 */
function invokeSequencePhaseContinuation(): void {
  if (!isRunning.value) return;
  let steps: PomodoroStep[];
  try {
    steps = parseSequence(sequenceInput.value);
  } catch {
    stopPomodoro();
    return;
  }
  if (timerStore.pomodoroState === "working") {
    currentPomodoro.value++;
  }
  updateProgressStatus(currentStep.value);
  currentStep.value++;
  timerStore.sequenceStepIndex = currentStep.value;
  updateProgressStatus(currentStep.value);
  runStep(steps);
}

function bindSequenceContinuationToStore(): void {
  if (!isRunning.value || !timerStore.isFromSequence) {
    timerStore.registerSequenceContinuation(null);
    return;
  }
  timerStore.registerSequenceContinuation(() => invokeSequencePhaseContinuation());
}

// 开始番茄钟循环
function startPomodoroCircle(): void {
  try {
    const steps = parseSequence(sequenceInput.value);
    if (steps.length === 0) {
      alert("请输入有效的序列。");
      return;
    }
    // 发射事件，告诉父组件当前状态
    emit("pomo-seq-running", true);

    isRunning.value = true;
    currentStep.value = 0;
    timerStore.sequenceInputSnapshot = sequenceInput.value;
    timerStore.sequenceStepIndex = 0;
    totalPomodoros.value = steps.filter((step) => step.type === "work").length;
    currentPomodoro.value = 1;
    statusLabel.value = `🍅 ${currentPomodoro.value}/${totalPomodoros.value}`;
    // 初始化进度条
    initializeProgress(sequenceInput.value);
    updateProgressStatus(currentStep.value);
    bindSequenceContinuationToStore();
    // 仅由 runStep 启动当前步，避免重复 startWorking/startBreak（双提示音与双 interval 边缘问题）
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
  timerStore.registerSequenceContinuation(null);
  // 先调用 store 的 resetTimer 方法
  timerStore.resetTimer();
  emit("pomo-seq-running", false);
  // 然后更新本地状态
  isRunning.value = false;
  // resetTimer 内已 stopWhiteNoise()
  timeoutHandles.value.forEach((handle) => clearTimeout(handle));
  timeoutHandles.value = [];
  // console.log("Stopping pomodoro...");

  // 重置状态
  currentStep.value = 0;
  currentPomodoro.value = 1;
  totalPomodoros.value = 0;
  statusLabel.value = "Let's 🍅!";

  // 清空进度条
  if (progressContainer.value) {
    progressContainer.value.innerHTML = "";
  }
}

// 持久化序列输入到全局设置
watch(
  sequenceInput,
  (val) => {
    settingStore.settings.pomoSequenceInput = val;
  },
  { immediate: true },
);

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

// 创建时间块函数（用 flex 比例适配手机窄屏，不写死 px 宽度）
function createTimeBlock(duration: number, type: string, sequenceStr: string): HTMLElement {
  const block = document.createElement("div");
  block.className = "time-block";
  const totalDuration = parseSequence(sequenceStr).reduce((sum, step) => sum + step.duration, 0);
  const flexGrow = totalDuration > 0 ? duration / totalDuration : 0;
  block.style.flexGrow = String(flexGrow);
  block.style.flexShrink = String(flexGrow);
  block.style.flexBasis = "0";
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
      element.style.backgroundColor = element.classList.contains("work") ? "var(--color-red)" : "var(--color-green)";
    } else if (index === currentStep) {
      // 当前执行的块
      element.style.backgroundImage =
        "linear-gradient(45deg, var(--color-background-light-transparent) 25%, transparent 25%, transparent 50%, var(--color-background-light-transparent) 50%, var(--color-background-light-transparent) 75%, transparent 75%, transparent)";
      element.style.backgroundSize = "20px 20px";
      element.style.animation = "progress-animation 1s linear infinite";
      element.style.backgroundColor = element.classList.contains("work") ? "var(--color-red)" : "var(--color-green)";
    } else {
      // 未开始的块
      element.style.backgroundColor = element.classList.contains("work") ? "var(--color-red-light)" : "var(--color-green-light)";
    }
  });
}

// 初始化进度条
function initializeProgress(sequence: string): void {
  // console.log("Initializing progress with sequence:", sequence);
  if (!progressContainer.value) {
    console.error("Progress container not found!");
    return;
  }

  progressContainer.value.innerHTML = "";
  const steps = parseSequence(sequence);
  // console.log("Steps for progress:", steps);

  steps.forEach((step) => {
    const block = createTimeBlock(step.duration, step.type, sequence);
    block.classList.add(step.type);
    progressContainer.value?.appendChild(block);
  });
}

// 时间块样式已移至组件 scoped style，用 :deep(.progress-container .time-block) 保证手机端生效

// 切换白噪音
function handleToggleWhiteNoise(): void {
  toggleWhiteNoise();
}

// 处理键盘事件
function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Enter") {
    event.preventDefault(); // 阻止默认行为
    handleDurationConfirm();
    // 让输入框失去焦点
    (event.target as HTMLElement)?.blur();
  }
}

// 处理番茄时长输入框回车确认
function handleDurationConfirm(): void {
  const num = Number(defaultPomoDuration.value);
  if (Number.isInteger(num) && num >= 1 && num <= 60) {
    dialog.warning({
      title: "确认修改番茄时长",
      content: `确定要将番茄工作时长修改为 ${num} 分钟吗？`,
      positiveText: "确认修改",
      negativeText: "取消",
      onPositiveClick: () => {
        settingStore.settings.durations.workDuration = num;
        console.log("Pomodoro duration confirmed:", num);
      },
      onNegativeClick: () => {
        // 取消时恢复原值
        defaultPomoDuration.value = settingStore.settings.durations.workDuration.toString();
      },
    });
  } else {
    // 立即恢复原值
    defaultPomoDuration.value = settingStore.settings.durations.workDuration.toString();

    dialog.error({
      title: "输入无效",
      content: "请输入1-60之间的整数作为番茄时长。",
      positiveText: "确定",
    });
  }
}

// 处理番茄时长输入框失去焦点时恢复设置
function handleBlurRestore(): void {
  const num = Number(defaultPomoDuration.value);
  if (Number.isInteger(num) && num >= 1 && num <= 60) {
    settingStore.settings.durations.workDuration = num;
    console.log("Pomodoro duration restored:", num);
  } else {
    defaultPomoDuration.value = settingStore.settings.durations.workDuration.toString();
  }
}

// 组件挂载时检查并恢复状态
onMounted(() => {
  // 如果番茄钟正在运行且来自序列，恢复 UI 状态
  if (timerStore.isActive && timerStore.isFromSequence) {
    const snap = timerStore.sequenceInputSnapshot;
    const settingSeq = settingStore.settings.pomoSequenceInput ?? "";
    if (snap && snap !== settingSeq) {
      timerStore.resetTimer();
      return;
    }
    const seqToParse = snap || sequenceInput.value;
    let steps: PomodoroStep[];
    try {
      steps = parseSequence(seqToParse);
    } catch {
      timerStore.resetTimer();
      return;
    }
    if (steps.length === 0) {
      timerStore.resetTimer();
      return;
    }

    isRunning.value = true;
    emit("pomo-seq-running", true);

    initializeProgress(seqToParse);

    currentStep.value = Math.min(timerStore.sequenceStepIndex, steps.length - 1);
    totalPomodoros.value = steps.filter((step) => step.type === "work").length;
    currentPomodoro.value = steps.slice(0, currentStep.value).filter((step) => step.type === "work").length + 1;

    updateProgressStatus(currentStep.value);

    bindSequenceContinuationToStore();
    timerStore.flushPendingSequenceFinalize();
    timerStore.reconcilePhaseFromWallClock();

    if (timerStore.isWorking && settingStore.settings.isWhiteNoiseEnabled) {
      startWhiteNoise();
    }
  }
});

onUnmounted(() => {
  timerStore.registerSequenceContinuation(null);
});

function resetWhiteNoise(sound: SoundType) {
  settingStore.settings.whiteNoiseSoundTrack = sound;
  if (isRunning.value) {
    stopWhiteNoise();
    startWhiteNoise();
  }
}
</script>

<style scoped>
.pomodoro-sequence {
  text-align: center;
  width: 200px;
  max-width: 100%;
  margin: 0 auto;
  background-color: var(--color-background) !important;
  padding: 2px 10px 0px 10px;
  height: 125px;
  min-height: 120px;
  border: 0px solid var(--color-text-secondary);
  border-radius: 8px;
  /* box-shadow: 1px 2px 6px var(--color-background-light-transparent); */
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
  width: 200px;
  max-width: 100%;
  min-width: 0; /* 允许在窄屏下收缩 */
  height: 0;
  overflow: hidden;
}

/* 运行中时直接由父级 .running 控制高度，避免依赖 :has()（部分手机不支持） */
.pomodoro-sequence.running .progress-container {
  height: 25px;
  min-height: 25px;
  margin-top: 0px;
  margin-bottom: 0px;
  overflow: visible;
}

/* 动态插入的 .time-block 用 :deep 保证在手机端也能被样式命中 */
:deep(.progress-container .time-block) {
  transition: background-color 0.3s ease;
  margin: 0;
}

:deep(.progress-container .time-block.work) {
  background-color: var(--color-red-light-transparent);
}

:deep(.progress-container .time-block.break) {
  background-color: var(--color-green-light-transparent);
}

.sequence-input {
  height: 60px;
  max-height: 60px;
  font-family: "Consolas", "Courier New", Courier, "Lucida Console", Monaco, "Liberation Mono", "Menlo", monospace;
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
  width: 90%;
  height: 100%;
}

.hint-text {
  font-size: 12px;
  color: gray;
  margin-bottom: 0px;
}

.button-row {
  display: flex;
  align-items: center;
  gap: 4px; /* 计算好间距后聚拢 */
  width: 220px; /* 增加宽度以适应新按钮 */
  margin: 0 auto;
  font-size: 12px;
  padding-top: 4px;
}

.action-button {
  width: 25px;
  height: 25px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 20%;
  cursor: pointer;
  border: 0px solid var(--color-background-dark);
}

.action-button:hover {
  background-color: var(--color-blue-light);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pomo-duration-input-container {
  font-size: 10px;
}
.pomo-duration-input-container {
  font-size: 10px;
}
.pomo-duration-input {
  width: 24px;
  height: 24px;
  display: inline-block;
  pointer-events: auto;
}

.pomo-duration-input :deep(.n-input-wrapper) {
  width: 24px;
  height: 24px;
  padding: 0px;
  pointer-events: auto;
}

.pomo-duration-input :deep(.n-input__input) {
  text-align: center;
  font-size: 12px;
  pointer-events: auto;
}

/* 原生 input 在 .n-input__input-el，仅此层设置行高才能在 iOS 上稳定行盒 */
.pomo-duration-input :deep(.n-input__input-el) {
  height: 25px;
  line-height: 25px;
  padding: 0;
  text-align: center;
  font-size: 12px;
  box-sizing: border-box;
  -webkit-appearance: none;
  appearance: none;
}

:deep(.n-input.pomo-duration-input) {
  --n-box-shadow-focus: none !important;
}

/* iPhone Safari：聚焦时避免行高/基线被重算导致整块错位；逻辑同 ActivitySection.search-input */
@supports (-webkit-touch-callout: none) {
  /* 16px 字体略宽于 12px，略增宽度避免两位数被裁切 */
  .pomo-duration-input {
    width: 30px;
    min-width: 30px;
  }

  .pomo-duration-input :deep(.n-input),
  .pomo-duration-input :deep(.n-input-wrapper) {
    width: 100% !important;
    height: 25px !important;
    min-height: 25px !important;
  }

  .pomo-duration-input :deep(.n-input__input) {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .pomo-duration-input :deep(.n-input__input-el) {
    height: 100% !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    /* 小于 16px 时 iOS 会放大页面，表现为「整块布局跳变」，常被误认为行高变了 */
    font-size: 16px !important;
    line-height: 1.2 !important;
    text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
  }
}

/* 序列 textarea：锁定行高，减少聚焦时 WebKit 重排 textarea 行盒 */
.sequence-input :deep(.n-input__textarea-el) {
  line-height: 1.35;
  font-size: 12px;
  box-sizing: border-box;
}

@supports (-webkit-touch-callout: none) {
  .sequence-input :deep(.n-input__textarea-el) {
    font-size: 16px !important;
    line-height: 1.35 !important;
    text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
  }
}

/* 原生 input 在 .n-input__input-el，仅此层设置行高才能在 iOS 上稳定行盒 */
.pomo-duration-input :deep(.n-input__input-el) {
  height: 25px;
  line-height: 25px;
  padding: 0;
  text-align: center;
  font-size: 12px;
  box-sizing: border-box;
  -webkit-appearance: none;
  appearance: none;
}

/* 类在根节点 .n-input 上，非 .n-input__input；禁用态边框用 --n-border-disabled，需 !important 盖过组件内联变量 */
:deep(.n-input.pomo-duration-input) {
  --n-box-shadow-focus: none !important;
  --n-border: 0px solid var(--color-background-dark) !important;
  --n-border-disabled: 0px solid var(--color-background-dark) !important;
}

/* iPhone Safari：聚焦时避免行高/基线被重算导致整块错位；逻辑同 ActivitySection.search-input */
@supports (-webkit-touch-callout: none) {
  /* 16px 字体略宽于 12px，略增宽度避免两位数被裁切 */
  .pomo-duration-input {
    width: 30px;
    min-width: 30px;
  }

  .pomo-duration-input :deep(.n-input),
  .pomo-duration-input :deep(.n-input-wrapper) {
    width: 100% !important;
    height: 25px !important;
    min-height: 25px !important;
    border: 0px solid var(--color-background-dark);
  }

  .pomo-duration-input :deep(.n-input__input) {
    display: flex;
    align-items: center;
    height: 100%;
  }

  .pomo-duration-input :deep(.n-input__input-el) {
    height: 100% !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    /* 小于 16px 时 iOS 会放大页面，表现为「整块布局跳变」，常被误认为行高变了 */
    font-size: 16px !important;
    line-height: 1.2 !important;
    text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
  }
}

/* 序列 textarea：锁定行高，减少聚焦时 WebKit 重排 textarea 行盒 */
.sequence-input :deep(.n-input__textarea-el) {
  line-height: 1.35;
  font-size: 12px;
  box-sizing: border-box;
}

@supports (-webkit-touch-callout: none) {
  .sequence-input :deep(.n-input__textarea-el) {
    font-size: 16px !important;
    line-height: 1.35 !important;
    text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
  }
}

/* 为 popover 内容里的按钮容器添加样式 */
.popover-actions {
  display: flex;
  flex-direction: row; /* 垂直排列 */
  gap: 8px; /* 按钮之间的垂直间距 */
  margin: 0px;
  padding: 0;
}

@media (max-width: 430px) {
  .action-button {
    background-color: transparent;
  }
  .action-button:hover {
    background-color: transparent;
  }
}
</style>

<style>
/* 不加 scoped，保证 keyframes 名为 progress-animation，JS 里 element.style.animation 才能找到斜条纹跑动 */
@keyframes progress-animation {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 20px 0;
  }
}
</style>
