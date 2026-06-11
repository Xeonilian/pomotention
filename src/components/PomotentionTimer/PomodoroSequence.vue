<template>
  <div class="pomodoro-sequence" :class="{ running: isRunning }">
    <div class="status-row" v-show="!isRunning">
      <span class="status-label">Let's 🍅!</span>
    </div>

    <div class="progress-container" ref="progressContainer" v-show="isRunning"></div>

    <n-input
      v-if="!isRunning"
      v-model:value="sequenceInput"
      :placeholder="insertMode === 'hiit' ? 'HIITs=(40+20)x12' : '输入序列，例如：🍅+05'"
      class="sequence-input"
      type="textarea"
    />

    <div class="button-row">
      <n-button class="action-button" @click="startPomodoroCircle" :disabled="isRunning" tertiary circle>
        <template #icon>
          <n-icon :component="Play24Regular" />
        </template>
      </n-button>

      <n-button class="action-button" @click="() => stopPomodoro()" tertiary circle>
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
        v-model:show="showWhiteNoisePopover"
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
          <n-button
            secondary
            circle
            :type="soundType === SoundType.WHITE_NOISE_RAIN ? 'info' : 'default'"
            size="small"
            title="雨声"
            @click="resetWhiteNoise(SoundType.WHITE_NOISE_RAIN)"
          >
            <template #icon>
              <n-icon><WeatherThunderstorm20Regular /></n-icon>
            </template>
          </n-button>
          <n-button
            secondary
            circle
            :type="soundType === SoundType.WORK_TICK ? 'info' : 'default'"
            size="small"
            title="滴答声"
            @click="resetWhiteNoise(SoundType.WORK_TICK)"
          >
            <template #icon>
              <n-icon><ClockAlarm20Regular /></n-icon>
            </template>
          </n-button>
          <n-button
            secondary
            circle
            :type="soundType === SoundType.WHITE_NOISE_BIRD_SEA ? 'info' : 'default'"
            size="small"
            title="鸟鸣海声"
            @click="resetWhiteNoise(SoundType.WHITE_NOISE_BIRD_SEA)"
          >
            <template #icon>
              <n-icon><Icons20Regular /></n-icon>
            </template>
          </n-button>
        </div>
      </n-popover>

      <n-button class="action-button" @click="handleInsertButtonClick" :title="insertButtonTitle" :disabled="isRunning" tertiary circle>
        <template v-if="insertMode === 'hiit'">
          <n-icon :component="Timer1024Regular" size="18" />
        </template>
        <template v-else>🍅</template>
      </n-button>
      <div class="pomo-duration-input-container" :class="{ 'hiit-hint-mode': insertMode === 'hiit' }">
        <template v-if="insertMode === 'pomo'">
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
        </template>
        <span v-else class="hiit-insert-hint" title="HIIT (work + break) x repeat, unit: second">(w+b) x rep</span>
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
  ClockAlarm20Regular,
  MusicNote124Filled,
  Icons20Regular,
  Timer1024Regular,
} from "@vicons/fluent";
import { SoundType } from "@/core/sounds.ts";
type PomodoroStep = {
  type: "work" | "break";
  duration: number;
  unit?: "min" | "sec";
};

function stepDurationSec(step: PomodoroStep): number {
  return step.unit === "sec" ? step.duration : step.duration * 60;
}

const timerStore = useTimerStore();
const settingStore = useSettingStore();
const dialog = useDialog();

const emit = defineEmits<{
  (e: "pomo-seq-running", status: boolean): void;
}>();

function getDefaultWorkDurationMinutes(): number {
  const parsed = Number.parseInt(defaultPomoDuration.value, 10);
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 60) return parsed;
  return settingStore.settings.durations.workDuration;
}

function normalizeSequenceForDisplay(sequence: string): string {
  const trimmed = sequence.trim();
  if (/^HIITs?\s*=/i.test(trimmed)) return trimmed;

  let body = trimmed.replace(/^>{4}/, "").replace(/^<{4}/, "").trim();
  const defaultWorkDuration = getDefaultWorkDurationMinutes();
  body = body.replace(/w(\d+)/gi, (_, rawDuration: string) => {
    const explicitWorkDuration = Number.parseInt(rawDuration, 10);
    if (!Number.isFinite(explicitWorkDuration) || explicitWorkDuration < 1 || explicitWorkDuration > 60) {
      return "🍅";
    }
    if (explicitWorkDuration === defaultWorkDuration) {
      return "🍅";
    }
    return `🍅${explicitWorkDuration}`;
  });
  if (!body) return defaultPomoSequenceTemplate();
  return `>>>>${body}`;
}

function parseExplicitWorkDuration(token: string): number {
  const explicitWorkDuration = Number.parseInt(token, 10);
  if (!Number.isFinite(explicitWorkDuration) || explicitWorkDuration < 1 || explicitWorkDuration > 60) {
    throw new Error(`Invalid work time: ${token}. Allowed range: 1-60.`);
  }
  return explicitWorkDuration;
}

// 数据
const defaultPomoDuration = ref<string>(settingStore.settings.durations.workDuration.toString());
const insertMode = ref<"pomo" | "hiit">(settingStore.settings.pomoSeqInsertMode ?? "pomo");
const hiitPreset = ref<string>(settingStore.settings.pomoSeqHiitPreset ?? "(40+20)x12");
const breakDurationPad = computed(() => settingStore.settings.durations.breakDuration.toString().padStart(2, "0"));

function defaultPomoSequenceTemplate(): string {
  const bd = breakDurationPad.value;
  return `>>>>🍅+${bd}`;
}

function defaultHiitSequenceTemplate(): string {
  const preset = settingStore.settings.pomoSeqHiitPreset ?? "(40+20)x12";
  return `HIITs=${preset}`;
}

function isValidHiitSequence(val: string): boolean {
  return /^HIITs?\s*=/i.test(val.trim());
}

function isValidPomoSequence(val: string): boolean {
  const trimmed = val.trim();
  return trimmed.startsWith(">>>>") || trimmed.startsWith("<<<<");
}

function loadSequenceForMode(mode: "pomo" | "hiit"): string {
  if (mode === "hiit") {
    const saved = settingStore.settings.pomoSeqHiitInput;
    if (saved && isValidHiitSequence(saved)) return saved;
    return defaultHiitSequenceTemplate();
  }
  const saved = settingStore.settings.pomoSequenceInput;
  if (saved && isValidPomoSequence(saved)) {
    return normalizeSequenceForDisplay(saved);
  }
  return defaultPomoSequenceTemplate();
}

function persistSequenceInputForMode(mode: "pomo" | "hiit", val: string): void {
  if (mode === "hiit") {
    if (!isValidHiitSequence(val)) return;
    settingStore.settings.pomoSeqHiitInput = val;
    saveHiitPresetFromSequence(val);
    return;
  }
  if (!isValidPomoSequence(val)) return;
  settingStore.settings.pomoSequenceInput = normalizeSequenceForDisplay(val);
}

const sequenceInput = ref<string>(loadSequenceForMode(insertMode.value));

const HIIT_BLOCK_IN_SEQ_RE = /\(\s*(\d+)\s*\+\s*(\d+)\s*\)\s*[x×*]\s*(\d+)/gi;

function extractLastHiitBlockFromSequence(seq: string): string | null {
  const match = seq.trim().match(/HIITs?\s*=\s*(.+)$/i);
  if (!match) return null;
  HIIT_BLOCK_IN_SEQ_RE.lastIndex = 0;
  let last: string | null = null;
  let m: RegExpExecArray | null;
  while ((m = HIIT_BLOCK_IN_SEQ_RE.exec(match[1])) !== null) {
    last = `(${m[1]}+${m[2]})x${m[3]}`;
  }
  return last;
}

function saveHiitPresetFromSequence(seq: string): void {
  const block = extractLastHiitBlockFromSequence(seq);
  if (block) {
    hiitPreset.value = block;
    settingStore.settings.pomoSeqHiitPreset = block;
  }
}

let insertButtonClickCount = 0;
let insertButtonClickTimer: ReturnType<typeof setTimeout> | null = null;

function handleInsertButtonClick(): void {
  insertButtonClickCount++;
  if (insertButtonClickTimer != null) clearTimeout(insertButtonClickTimer);
  insertButtonClickTimer = setTimeout(() => {
    if (insertButtonClickCount >= 2) {
      toggleInsertMode();
    } else {
      handleInsertClick();
    }
    insertButtonClickCount = 0;
    insertButtonClickTimer = null;
  }, 250);
}

function toggleInsertMode(): void {
  persistSequenceInputForMode(insertMode.value, sequenceInput.value);
  insertMode.value = insertMode.value === "pomo" ? "hiit" : "pomo";
  settingStore.settings.pomoSeqInsertMode = insertMode.value;
  sequenceInput.value = loadSequenceForMode(insertMode.value);
  if (insertMode.value === "hiit") {
    hiitPreset.value = settingStore.settings.pomoSeqHiitPreset ?? "(40+20)x12";
  }
}

function handleInsertClick(): void {
  if (insertMode.value === "hiit") {
    addHiitBlock();
  } else {
    addPomodoro();
  }
}

function previewInsertSnippet(): string {
  if (insertMode.value === "pomo") {
    const bd = breakDurationPad.value;
    return sequenceInput.value.trim() === "" ? `🍅+${bd}` : `+🍅+${bd}`;
  }
  const block = hiitPreset.value;
  const trimmed = sequenceInput.value.trim();
  if (trimmed === "") return `HIITs=${block}`;
  if (/^HIITs?\s*=/i.test(trimmed)) return `+${block}`;
  return `HIITs=${block}`;
}

const insertButtonTitle = computed(() => {
  const switchTarget = insertMode.value === "pomo" ? "HIIT" : "🍅";
  return `双击切换 ${switchTarget} 模式，单击插入 ${previewInsertSnippet()}`;
});
const isRunning = ref<boolean>(false);
const timeoutHandles = ref<NodeJS.Timeout[]>([]);
const currentStep = ref<number>(0);
const totalPomodoros = ref<number>(0);
const currentPomodoro = ref<number>(1);
const statusLabel = ref<string>("Let's 🍅!");

// 白噪音状态
const isWhiteNoiseEnabled = computed({
  get: () => settingStore.settings.isWhiteNoiseEnabled,
  set: (val) => {
    settingStore.settings.isWhiteNoiseEnabled = val;
  },
});
const soundType = computed(() => settingStore.settings.whiteNoiseSoundTrack);
const showWhiteNoisePopover = ref(false);
let whiteNoisePopoverCloseTimer: ReturnType<typeof setTimeout> | null = null;

// 添加进度监听
watch(
  () => timerStore.timeRemaining,
  () => {
    if (isRunning.value && progressContainer.value) {
      updateProgressStatus(resolveActiveStepIndex());
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

// 解析番茄序列（分钟）
function parsePomoSequence(sequence: string): PomodoroStep[] {
  const validBreakTimes = ["01", "02", "05", "10", "15", "30", "60"];
  let seq = sequence.trim().replace(/^>{4}/, "").replace(/^<{4}/, "").trim();
  const firstStepMatch = seq.match(/🍅\d*|w\d+|\d+/i);
  if (!firstStepMatch) return [];

  const firstStepIndex = firstStepMatch.index || 0;
  seq = seq.substring(firstStepIndex);

  const steps = seq.split("+").map((step) => step.trim());
  return steps.map((step) => {
    if (/^🍅\d+$/u.test(step)) {
      return { type: "work", duration: parseExplicitWorkDuration(step.slice(2)) };
    } else if (/^w\d+$/i.test(step)) {
      return { type: "work", duration: parseExplicitWorkDuration(step.slice(1)) };
    } else if (step.includes("🍅")) {
      return { type: "work", duration: getDefaultWorkDurationMinutes() };
    } else {
      const breakTime = step.padStart(2, "0");
      if (!validBreakTimes.includes(breakTime)) {
        throw new Error(`Invalid break time: ${step}. Allowed break times: ${validBreakTimes.join(", ")}`);
      }
      return { type: "break", duration: parseInt(breakTime) };
    }
  });
}

function parseHiitSequence(sequence: string): PomodoroStep[] {
  const match = sequence.trim().match(/^HIITs?\s*=\s*(.+)$/i);
  if (!match) return [];

  const steps: PomodoroStep[] = [];
  HIIT_BLOCK_IN_SEQ_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = HIIT_BLOCK_IN_SEQ_RE.exec(match[1])) !== null) {
    const workSec = Number.parseInt(m[1], 10);
    const breakSec = Number.parseInt(m[2], 10);
    const reps = Number.parseInt(m[3], 10);
    if (
      !Number.isFinite(workSec) ||
      workSec < 1 ||
      !Number.isFinite(breakSec) ||
      breakSec < 1 ||
      !Number.isFinite(reps) ||
      reps < 1
    ) {
      throw new Error(`Invalid HIIT block: (${m[1]}+${m[2]})x${m[3]}`);
    }
    for (let i = 0; i < reps; i++) {
      steps.push({ type: "work", duration: workSec, unit: "sec" });
      steps.push({ type: "break", duration: breakSec, unit: "sec" });
    }
  }
  if (steps.length === 0) {
    throw new Error(`Invalid HIIT sequence. Expected format: HIITs=(work+break)xrepeat`);
  }
  return steps;
}

// 解析序列（番茄或 HIIT）
function parseSequence(sequence: string): PomodoroStep[] {
  const trimmed = sequence.trim();
  if (/^HIITs?\s*=/i.test(trimmed)) {
    return parseHiitSequence(trimmed);
  }
  return parsePomoSequence(trimmed);
}

/** 冷启动或 store finalize 无 phase 回调时，由 sequencePhaseContinuation 推进序列 */
function invokeSequencePhaseContinuation(): void {
  if (!timerStore.isActive || !timerStore.isFromSequence) return;
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
  updateProgressStatus(resolveActiveStepIndex());
  currentStep.value++;
  timerStore.sequenceStepIndex = currentStep.value;
  updateProgressStatus(resolveActiveStepIndex());
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
    updateProgressStatus(resolveActiveStepIndex());
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
    // 自然跑完序列：store 已在 finalize 播过结束音，此处只 reset，避免 cancelTimer 再播一次 BREAK_END/WORK_END
    stopPomodoro(false);
    return;
  }

  const step = steps[currentStep.value];
  const suppressEndCue = step.unit === "sec" && currentStep.value < steps.length - 1;

  const onFinish = () => {
    // 与 isRunning 对齐：用户点停止时 cancelTimer 已把 store 置 idle，此处应直接返回；若仅本地 isRunning 失步而计时仍在，仍须推进到 runStep/stopPomodoro（以番茄收尾时自然结束与手动 Stop 一致）
    if (timerStore.pomodoroState === "idle") return;
    if (!isRunning.value) {
      isRunning.value = true;
      emit("pomo-seq-running", true);
    }
    // 更新当前步骤的进度条状态为已完成
    updateProgressStatus(resolveActiveStepIndex());
    currentStep.value++;
    timerStore.sequenceStepIndex = currentStep.value;
    // 更新下一个步骤的进度条状态
    updateProgressStatus(resolveActiveStepIndex());
    runStep(steps);
  };

  if (step.type === "work") {
    statusLabel.value = `🍅 ${currentPomodoro.value}/${totalPomodoros.value}`;
    const unit = step.unit ?? "min";
    timerStore.startWorking(
      step.duration,
      () => {
        currentPomodoro.value++;
        onFinish();
      },
      unit,
      suppressEndCue,
    );
  } else {
    const unit = step.unit ?? "min";
    statusLabel.value = unit === "sec" ? `Break ${step.duration}s` : `Break ${step.duration}min`;
    timerStore.startBreak(step.duration, onFinish, unit, suppressEndCue);
  }
}

/** @param playEndCue true：用户停止，走 cancelTimer 播结束音；false：序列自然结束且 store 已 finalize，仅 reset */
function stopPomodoro(playEndCue = true): void {
  timerStore.registerSequenceContinuation(null);
  if (playEndCue) {
    timerStore.cancelTimer();
  } else {
    timerStore.resetTimer();
  }
  emit("pomo-seq-running", false);
  // 然后更新本地状态
  isRunning.value = false;
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
    persistSequenceInputForMode(insertMode.value, val);
  },
  { immediate: true },
);

// 添加番茄钟序列
function addHiitBlock(): void {
  const block = hiitPreset.value;
  const trimmed = sequenceInput.value.trim();
  if (trimmed === "") {
    sequenceInput.value = `HIITs=${block}`;
  } else if (/^HIITs?\s*=/i.test(trimmed)) {
    sequenceInput.value = `${trimmed}+${block}`;
  } else {
    sequenceInput.value = `HIITs=${block}`;
  }
}

function ensurePomoSequencePrefix(val: string): string {
  const trimmed = val.trim();
  if (/^HIITs?\s*=/i.test(trimmed)) return trimmed;
  if (isValidPomoSequence(trimmed)) return normalizeSequenceForDisplay(trimmed);
  return `>>>>${trimmed}`;
}

function addPomodoro(): void {
  const bd = breakDurationPad.value;
  if (sequenceInput.value.trim() === "") {
    sequenceInput.value = `>>>>🍅+${bd}`;
  } else {
    sequenceInput.value = `${ensurePomoSequencePrefix(sequenceInput.value)}+🍅+${bd}`;
  }
}

// 添加 ref
const progressContainer = ref<HTMLElement | null>(null);

// 创建时间块函数（用 flex 比例适配手机窄屏，不写死 px 宽度）
function createTimeBlock(step: PomodoroStep, sequenceStr: string): HTMLElement {
  const block = document.createElement("div");
  block.className = "time-block";
  const totalDuration = parseSequence(sequenceStr).reduce((sum, s) => sum + stepDurationSec(s), 0);
  const flexGrow = totalDuration > 0 ? stepDurationSec(step) / totalDuration : 0;
  block.style.flexGrow = String(flexGrow);
  block.style.flexShrink = String(flexGrow);
  block.style.flexBasis = "0";
  block.style.height = "20px";
  block.style.margin = "0.5px";
  block.style.borderRadius = "2px";
  block.classList.add(step.type);
  return block;
}

// 基于 store 状态解析当前正在执行的步骤索引（兼容不同 break 长度）
function resolveActiveStepIndex(): number {
  const sequenceSource = timerStore.sequenceInputSnapshot || sequenceInput.value;
  let steps: PomodoroStep[] = [];
  try {
    steps = parseSequence(sequenceSource);
  } catch {
    return currentStep.value;
  }
  if (steps.length === 0) return currentStep.value;

  const rawStoreIndex = Number.isFinite(timerStore.sequenceStepIndex) ? timerStore.sequenceStepIndex : currentStep.value;
  const baseIndex = Math.min(Math.max(rawStoreIndex, 0), steps.length - 1);
  const expectedType = timerStore.pomodoroState === "working" ? "work" : timerStore.pomodoroState === "breaking" ? "break" : null;
  const expectedDurationSec = timerStore.totalTime;

  // 优先用 sequenceStepIndex；若与当前阶段不一致，再按类型+时长兜底定位
  if (
    expectedType &&
    steps[baseIndex] &&
    steps[baseIndex].type === expectedType &&
    stepDurationSec(steps[baseIndex]) === expectedDurationSec
  ) {
    return baseIndex;
  }

  if (expectedType && expectedDurationSec > 0) {
    for (let offset = 0; offset < steps.length; offset++) {
      const left = baseIndex - offset;
      const right = baseIndex + offset;
      if (left >= 0 && steps[left].type === expectedType && stepDurationSec(steps[left]) === expectedDurationSec) return left;
      if (right < steps.length && steps[right].type === expectedType && stepDurationSec(steps[right]) === expectedDurationSec)
        return right;
    }
  }

  return Math.min(Math.max(currentStep.value, 0), steps.length - 1);
}

// 强制清除全部进度块动画（用于 phase 超时/序列结束兜底）
function clearAllProgressAnimations(): void {
  const blocks = progressContainer.value?.children;
  if (!blocks) return;
  Array.from(blocks).forEach((block) => {
    const element = block as HTMLElement;
    element.style.backgroundImage = "";
    element.style.animation = "none";
  });
}

// 更新进度状态函数
function updateProgressStatus(currentStep: number): void {
  const blocks = progressContainer.value?.children;
  if (!blocks) return;
  const totalBlocks = blocks.length;

  // 只要当前 phase 已超时，先清空所有动画，避免出现残留斜纹
  if (timerStore.timeRemaining <= 0) {
    clearAllProgressAnimations();
  }
  // 索引越界视为序列结束：全部块都不应再有动画
  if (currentStep >= totalBlocks) {
    clearAllProgressAnimations();
  }

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
      element.style.backgroundImage = "";
      element.style.animation = "none";
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
    const block = createTimeBlock(step, sequence);
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
    event.preventDefault();
    handleDurationConfirm();
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
        defaultPomoDuration.value = settingStore.settings.durations.workDuration.toString();
      },
    });
  } else {
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

// 统一从 store 恢复序列运行中的 UI，支持组件挂载后和运行时外部触发两种路径
function restoreRunningUIFromStore(): void {
  if (!(timerStore.isActive && timerStore.isFromSequence)) {
    if (isRunning.value) {
      isRunning.value = false;
      emit("pomo-seq-running", false);
      currentStep.value = 0;
      currentPomodoro.value = 1;
      totalPomodoros.value = 0;
      statusLabel.value = "Let's 🍅!";
      if (progressContainer.value) {
        progressContainer.value.innerHTML = "";
      }
    }
    return;
  }

  const snap = timerStore.sequenceInputSnapshot;
  const isHiitSnap = snap ? /^HIITs?\s*=/i.test(snap.trim()) : false;
  const settingSeq = isHiitSnap ? (settingStore.settings.pomoSeqHiitInput ?? "") : (settingStore.settings.pomoSequenceInput ?? "");
  if (snap && snap !== settingSeq) {
    // 外部即时启动可能先写 snapshot，再由 settings watch 落盘；此处以 snapshot 为准做一次对齐，避免被误判为异常
    const normalizedSnap = normalizeSequenceForDisplay(snap);
    if (isValidHiitSequence(normalizedSnap)) {
      persistSequenceInputForMode("hiit", normalizedSnap);
      insertMode.value = "hiit";
    } else if (isValidPomoSequence(normalizedSnap)) {
      persistSequenceInputForMode("pomo", normalizedSnap);
    }
    sequenceInput.value = normalizedSnap;
  }

  const seqToParse = timerStore.sequenceInputSnapshot || sequenceInput.value;
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
  updateProgressStatus(resolveActiveStepIndex());

  bindSequenceContinuationToStore();
  timerStore.flushPendingSequenceFinalize();
  timerStore.reconcilePhaseFromWallClock();

  if (timerStore.isWorking && settingStore.settings.isWhiteNoiseEnabled) {
    startWhiteNoise();
  }
}

watch(
  () => [timerStore.isActive, timerStore.isFromSequence, timerStore.sequenceInputSnapshot, timerStore.sequenceStepIndex],
  () => {
    restoreRunningUIFromStore();
  },
  { immediate: true },
);

// 组件挂载时检查并恢复状态
onMounted(() => {
  restoreRunningUIFromStore();
});

onUnmounted(() => {
  timerStore.registerSequenceContinuation(null);
  if (insertButtonClickTimer != null) {
    clearTimeout(insertButtonClickTimer);
    insertButtonClickTimer = null;
  }
  if (whiteNoisePopoverCloseTimer != null) {
    clearTimeout(whiteNoisePopoverCloseTimer);
    whiteNoisePopoverCloseTimer = null;
  }
});

function scheduleWhiteNoisePopoverClose(): void {
  if (whiteNoisePopoverCloseTimer != null) {
    clearTimeout(whiteNoisePopoverCloseTimer);
  }
  whiteNoisePopoverCloseTimer = setTimeout(() => {
    showWhiteNoisePopover.value = false;
    whiteNoisePopoverCloseTimer = null;
  }, 3000);
}

function resetWhiteNoise(sound: SoundType) {
  settingStore.settings.whiteNoiseSoundTrack = sound;
  if (isRunning.value) {
    stopWhiteNoise();
    startWhiteNoise();
  }
  scheduleWhiteNoisePopoverClose();
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

:deep(.n-input.n-input--textarea.n-input--resizable .n-input-wrapper) {
  resize: none !important;
  min-height: 25px !important;
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
.pomo-duration-input-container.hiit-hint-mode {
  flex: 1;
  min-width: 0;
  text-align: left;
  white-space: nowrap;
}
.hiit-insert-hint {
  font-size: 11px;
  color: var(--color-text-secondary);
  letter-spacing: -0.3px;
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
  resize: none !important;
  overflow: hidden;
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
  resize: none !important;
  overflow: hidden;
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
