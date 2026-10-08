<template>
  <div class="setting-tab-page setting-tab-page--scroll">
    <n-card size="small" class="setting-tab-card">
      <div class="setting-field-list">
        <div class="setting-field-item">
          <div class="setting-field-label">工作时长（分钟）</div>
          <n-input-number
            v-model:value="settingStore.settings.durations.workDuration"
            @update:value="(val) => console.log('workDuration 更新为:', val)"
            :min="1"
            :max="60"
          />
        </div>
        <div class="setting-field-item">
          <div class="setting-field-label">休息时长（分钟）</div>
          <n-select v-model:value="settingStore.settings.durations.breakDuration" :options="breakOptions" />
        </div>
        <div class="setting-field-item">
          <div class="setting-field-label">工作内层进度条颜色</div>
          <n-color-picker v-model:value="settingStore.settings.style.redBarColor" show-alpha />
        </div>
        <div class="setting-field-item">
          <div class="setting-field-label">工作外层进度条颜色</div>
          <n-color-picker v-model:value="settingStore.settings.style.blueBarColor" show-alpha />
        </div>
        <div class="setting-field-item">
          <div class="setting-field-label">休息进度条颜色</div>
          <n-color-picker v-model:value="settingStore.settings.style.breakBarColor" show-alpha />
        </div>
        <div class="setting-field-item">
          <n-checkbox :checked="settingStore.settings.isWhiteNoiseEnabled" @update:checked="onWhiteNoiseChecked">
            播放白噪音
          </n-checkbox>
          <n-select
            :value="settingStore.settings.whiteNoiseSoundTrack"
            :options="whiteNoiseOptions"
            @update:value="onWhiteNoiseTrack"
          />
        </div>
        <div class="setting-field-item">
          <div class="setting-field-label">默认番茄列车</div>
          <n-input
            :value="pomoDraft"
            class="sequence-default-input"
            @update:value="(val) => (pomoDraft = val)"
            @focus="pomoEditing = true"
            @blur="commitPomoDraft"
          />
        </div>
        <div class="setting-field-item">
          <div class="setting-field-label">默认 HIIT</div>
          <n-input
            :value="hiitDraft"
            class="sequence-default-input"
            @update:value="(val) => (hiitDraft = val)"
            @focus="hiitEditing = true"
            @blur="commitHiitDraft"
          />
        </div>
      </div>
      <n-space class="setting-tab-actions">
        <n-button @click="resetPomodoro" type="error">恢复默认</n-button>
      </n-space>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { NCard, NInputNumber, NButton, NColorPicker, NSelect, NSpace, NCheckbox, NInput } from "naive-ui";
import { useSettingStore } from "@/stores/useSettingStore";
import { useTimerStore } from "@/stores/useTimerStore";
import { SoundType, startWhiteNoise, stopWhiteNoise, toggleWhiteNoise } from "@/core/sounds";

const settingStore = useSettingStore();
const timerStore = useTimerStore();

const breakOptions = [
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "5", value: 5 },
  { label: "10", value: 10 },
  { label: "15", value: 15 },
  { label: "30", value: 30 },
];

const whiteNoiseOptions = [
  { label: "雷雨声", value: SoundType.WHITE_NOISE_RAIN },
  { label: "滴答声", value: SoundType.WORK_TICK },
  { label: "海浪声", value: SoundType.WHITE_NOISE_BIRD_SEA },
];

const pomoDraft = ref(settingStore.settings.pomoSequenceInput ?? "");
const hiitDraft = ref(settingStore.settings.pomoSeqHiitInput ?? "");
const pomoEditing = ref(false);
const hiitEditing = ref(false);

watch(
  () => settingStore.settings.pomoSequenceInput,
  (val) => {
    if (pomoEditing.value) return;
    pomoDraft.value = val ?? "";
  },
);

watch(
  () => settingStore.settings.pomoSeqHiitInput,
  (val) => {
    if (hiitEditing.value) return;
    hiitDraft.value = val ?? "";
  },
);

function commitPomoDraft() {
  pomoEditing.value = false;
  const next = pomoDraft.value.trim();
  if (!next) {
    pomoDraft.value = settingStore.settings.pomoSequenceInput ?? "";
    return;
  }
  settingStore.settings.pomoSequenceInput = next;
  pomoDraft.value = settingStore.settings.pomoSequenceInput ?? next;
}

function commitHiitDraft() {
  hiitEditing.value = false;
  const next = hiitDraft.value.trim();
  if (!next) {
    hiitDraft.value = settingStore.settings.pomoSeqHiitInput ?? "";
    return;
  }
  settingStore.settings.pomoSeqHiitInput = next;
  hiitDraft.value = settingStore.settings.pomoSeqHiitInput ?? next;
}

function onWhiteNoiseChecked(checked: boolean) {
  if (settingStore.settings.isWhiteNoiseEnabled === checked) return;
  toggleWhiteNoise();
}

function restartWhiteNoiseIfWorking() {
  if (!settingStore.settings.isWhiteNoiseEnabled || !timerStore.isWorking) return;
  stopWhiteNoise();
  startWhiteNoise();
}

function onWhiteNoiseTrack(track: SoundType) {
  settingStore.settings.whiteNoiseSoundTrack = track;
  restartWhiteNoiseIfWorking();
}

function resetPomodoro() {
  settingStore.resetPomodoroSettings();
  if (!settingStore.settings.isWhiteNoiseEnabled) {
    stopWhiteNoise();
    return;
  }
  restartWhiteNoiseIfWorking();
}
</script>

<style scoped src="./settingShared.css"></style>
<style scoped>
/* 未编辑时超出省略；聚焦后交给输入框按光标滚动 */
.sequence-default-input :deep(.n-input__input-el) {
  text-overflow: ellipsis;
}

.sequence-default-input:focus-within :deep(.n-input__input-el) {
  text-overflow: clip;
}

@media (min-width: 768px) {
  .setting-field-list {
    grid-template-columns: 1fr 1fr;
    column-gap: 16px;
  }
}
</style>
