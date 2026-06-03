<template>
  <div class="timer-settings-form">
    <section class="timer-settings-section">
      <div class="timer-settings-field">
        <label class="timer-settings-label">工作时长（分钟）</label>
        <n-input-number v-model:value="settingStore.settings.durations.workDuration" :min="1" :max="60" class="timer-settings-control" />
      </div>
      <div class="timer-settings-field">
        <label class="timer-settings-label">休息时长（分钟）</label>
        <n-select v-model:value="settingStore.settings.durations.breakDuration" :options="breakOptions" class="timer-settings-control" />
      </div>
      <n-button size="small" tertiary type="error" @click="settingStore.resetDurations()">恢复默认时长</n-button>
    </section>

    <section class="timer-settings-section">
      <div class="timer-settings-field timer-settings-field--row">
        <label class="timer-settings-label">深色模式</label>
        <n-switch v-model:value="settingStore.settings.darkMode" />
      </div>
      <div class="timer-settings-field timer-settings-field--row">
        <label class="timer-settings-label">结束后继续正计时</label>
        <n-switch v-model:value="settingStore.settings.continueTimingAfterComplete" />
      </div>
      <p class="timer-settings-hint">开启后倒计时到 0 会继续正计时；超时后工作按钮变为 Stop，按实际总时长计入统计。</p>
      <div class="timer-settings-field timer-settings-field--row">
        <label class="timer-settings-label">分段提示音</label>
        <n-switch v-model:value="settingStore.settings.isSegmentCueEnabled" />
      </div>
      <p class="timer-settings-hint">关闭后仍保留开始/结束提示；中间阶段切换与休息进度提示不再播放。</p>
      <div class="timer-settings-field timer-settings-field--row">
        <label class="timer-settings-label">工作时播放白噪音</label>
        <n-switch v-model:value="settingStore.settings.isWhiteNoiseEnabled" />
      </div>
      <div class="timer-settings-field">
        <label class="timer-settings-label">白噪音音轨</label>
        <n-select
          :value="settingStore.settings.whiteNoiseSoundTrack"
          :options="whiteNoiseTrackOptions"
          :disabled="!settingStore.settings.isWhiteNoiseEnabled"
          class="timer-settings-control"
          @update:value="onWhiteNoiseTrackChange"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { NButton, NInputNumber, NSelect, NSwitch } from "naive-ui";
import { useSettingStore } from "@/stores/useSettingStore";
import { useTimerStore } from "@/stores/useTimerStore";
import { SoundType, prefetchWhiteNoiseForSelection, startWhiteNoise, stopWhiteNoise } from "@/core/sounds";

const settingStore = useSettingStore();
const timerStore = useTimerStore();

const breakOptions = [
  { label: "2 分钟", value: 2 },
  { label: "5 分钟", value: 5 },
  { label: "15 分钟", value: 15 },
  { label: "30 分钟", value: 30 },
];

const whiteNoiseTrackOptions = [
  { label: "滴答声", value: SoundType.WORK_TICK },
  { label: "雨声", value: SoundType.WHITE_NOISE_RAIN },
  { label: "鸟鸣海声", value: SoundType.WHITE_NOISE_BIRD_SEA },
];

function onWhiteNoiseTrackChange(track: SoundType) {
  if (!track || track === settingStore.settings.whiteNoiseSoundTrack) return;
  settingStore.settings.whiteNoiseSoundTrack = track;
  prefetchWhiteNoiseForSelection(track);
  if (settingStore.settings.isWhiteNoiseEnabled && timerStore.isWorking) {
    stopWhiteNoise();
    startWhiteNoise();
  }
}
</script>

<style scoped>
.timer-settings-form {
  width: 100%;
  max-width: 240px;
  margin: 0 auto;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.timer-settings-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.timer-settings-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}

.timer-settings-field--row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.timer-settings-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--n-text-color-1);
}

.timer-settings-control {
  width: 100%;
}

.timer-settings-control :deep(.n-input-number),
.timer-settings-control :deep(.n-base-selection) {
  width: 100%;
}

.timer-settings-hint {
  margin: -4px 0 0;
  font-size: 12px;
  line-height: 1.45;
  color: var(--color-text-secondary, var(--n-text-color-3));
}
</style>
