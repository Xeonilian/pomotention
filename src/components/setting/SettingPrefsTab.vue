<template>
  <div class="setting-tab-page setting-tab-page--scroll">
    <SettingSectionCard title="番茄时钟设置" @reset="resetPomodoro">
      <div class="setting-field-list">
        <div class="setting-field-item">
          <div class="setting-field-label">工作时长（分钟）</div>
          <n-input-number v-model:value="settingStore.settings.durations.workDuration" :min="1" :max="60" />
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
    </SettingSectionCard>

    <SettingSectionCard title="Markdown 阅读" @reset="resetReading">
      <div class="setting-field-list">
        <div class="setting-field-item">
          <div class="setting-field-label">阅读主题</div>
          <n-select
            class="setting-control"
            :value="settingStore.settings.markdownReaderTheme"
            :options="themeSelectOptions"
            @update:value="onTheme"
          />
        </div>
        <div class="setting-field-item">
          <div class="setting-field-label">基准字体大小（px）</div>
          <n-input-number
            class="setting-control"
            v-model:value="settingStore.settings.markdownReaderFontSize"
            :min="12"
            :max="24"
            :step="1"
            placeholder="请输入 12–24"
          />
        </div>
        <div class="setting-field-item">
          <div class="setting-field-label">行距</div>
          <n-input-number
            class="setting-control"
            v-model:value="settingStore.settings.markdownReaderLineHeight"
            :min="1.2"
            :max="2.4"
            :step="0.1"
            :precision="1"
            placeholder="请输入 1.2–2.4"
          />
        </div>
        <div class="setting-field-item">
          <div class="setting-field-label">页面篇幅（rem，0=不限制）</div>
          <n-input-number
            class="setting-control"
            v-model:value="settingStore.settings.markdownReaderMaxWidthRem"
            :min="0"
            :max="80"
            :step="2"
            placeholder="请输入 0–80"
          />
        </div>
        <div class="setting-field-item setting-field-item--full">
          <div class="setting-field-label">预览</div>
          <div
            class="md-reader theme-preview"
            :class="`md-theme-${settingStore.settings.markdownReaderTheme}`"
            :style="readerVars"
            v-html="previewHtml"
          ></div>
        </div>
      </div>
    </SettingSectionCard>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NInputNumber, NColorPicker, NSelect, NCheckbox, NInput } from "naive-ui";
import { marked } from "marked";
import { useSettingStore } from "@/stores/useSettingStore";
import { useTimerStore } from "@/stores/useTimerStore";
import { SoundType, startWhiteNoise, stopWhiteNoise, toggleWhiteNoise } from "@/core/sounds";
import SettingSectionCard from "@/components/setting/SettingSectionCard.vue";
import {
  MARKDOWN_READER_THEME_OPTIONS,
  type MarkdownReaderTheme,
} from "@/core/types/MarkdownReaderTheme";
import { markdownReaderCssVars } from "@/core/utils/markdownReaderStyle";

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

const themeSelectOptions = MARKDOWN_READER_THEME_OPTIONS.map((o) => ({
  label: o.label,
  value: o.value,
}));

const readerVars = computed(() =>
  markdownReaderCssVars({
    fontSize: settingStore.settings.markdownReaderFontSize,
    lineHeight: settingStore.settings.markdownReaderLineHeight,
    maxWidthRem: settingStore.settings.markdownReaderMaxWidthRem,
  }),
);

const previewHtml = computed(() =>
  String(
    marked(
      "## 标题示例\n\n一段**正文**与 `行内代码`。\n\n> 引用块预览\n\n- 列表一项\n- 另一项\n\n```ts\nconst ok = true;\n```\n",
    ),
  ),
);

function onTheme(value: MarkdownReaderTheme) {
  settingStore.settings.markdownReaderTheme = value;
}

function resetReading() {
  settingStore.resetMarkdownReaderSettings();
}
</script>

<style scoped src="./settingShared.css"></style>
<style scoped>
.setting-tab-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sequence-default-input :deep(.n-input__input-el) {
  text-overflow: ellipsis;
}

.sequence-default-input:focus-within :deep(.n-input__input-el) {
  text-overflow: clip;
}

.setting-control {
  width: 100%;
}

@media (min-width: 768px) {
  .setting-field-list {
    grid-template-columns: 1fr 1fr;
    column-gap: 16px;
    align-items: start;
  }
  .setting-field-item--full {
    grid-column: 1 / -1;
  }
}

.theme-preview {
  max-height: 240px;
  overflow: auto;
  padding: 10px 12px;
  border-radius: 8px;
  background: var(--color-background);
  border: 1px solid var(--n-border-color);
}
</style>
