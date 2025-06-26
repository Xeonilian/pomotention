<template>
  <n-space vertical size="large" style="width: 300px; margin: auto">
    <n-card title="设置番茄时长">
      <n-form>
        <n-form-item label="工作时长（分钟）">
          <n-input-number
            v-model:value="settingStore.settings.durations.workDuration"
            @update:value="(val) => console.log('workDuration 更新为:', val)"
            :min="1"
            :max="60"
            style="width: 250px"
          />
        </n-form-item>
        <n-form-item label="休息时长（分钟）">
          <n-select
            v-model:value="settingStore.settings.durations.breakDuration"
            :options="breakOptions"
            style="width: 250px"
          />
        </n-form-item>
      </n-form>
      <n-button @click="resetDurations" type="error" style="margin-top: 12px">
        恢复默认时长
      </n-button>
    </n-card>

    <n-card title="设置样式">
      <n-form>
        <n-form-item label="进度条长度">
          <n-input v-model:value="settingStore.settings.style.barLength" />
        </n-form-item>
        <n-form-item label="红色条颜色">
          <n-color-picker
            v-model:value="settingStore.settings.style.redBarColor"
            show-alpha
          />
        </n-form-item>
        <n-form-item label="蓝色条颜色">
          <n-color-picker
            v-model:value="settingStore.settings.style.blueBarColor"
            show-alpha
          />
        </n-form-item>
      </n-form>
      <n-button @click="resetStyle" type="error" style="margin-top: 12px">
        恢复默认样式
      </n-button>
    </n-card>

    <n-card
      title="调试信息"
      style="max-height: 300px; overflow: auto; white-space: pre-wrap"
    >
      <div>
        <strong>当前工作时长:</strong>
        {{ settingStore.settings.durations.workDuration }} 分钟<br />
        <strong>当前休息时长:</strong>
        {{ settingStore.settings.durations.breakDuration }} 分钟<br />
        <strong>当前进度条长度:</strong>
        {{ settingStore.settings.style.barLength }}<br />
        <strong>红色条颜色:</strong> {{ settingStore.settings.style.redBarColor
        }}<br />
        <strong>蓝色条颜色:</strong>
        {{ settingStore.settings.style.blueBarColor }}<br />
      </div>

      <hr />
      <div><strong>当前Durations对象（JSON）:</strong></div>
      <pre>{{ JSON.stringify(settingStore.settings.durations, null, 2) }}</pre>
      <div><strong>当前Style对象（JSON）:</strong></div>
      <pre>{{ JSON.stringify(settingStore.settings.style, null, 2) }}</pre>
    </n-card>
  </n-space>
</template>

<script setup lang="ts">
import {
  NSpace,
  NCard,
  NForm,
  NFormItem,
  NInput,
  NInputNumber,
  NButton,
  NColorPicker,
  NSelect,
} from "naive-ui";

import { useSettingStore } from "../stores/useSettingStore";

const settingStore = useSettingStore();

const breakOptions = [
  { label: "2", value: 2 },
  { label: "5", value: 5 },
  { label: "15", value: 15 },
  { label: "30", value: 30 },
];

function resetDurations() {
  settingStore.resetDurations();
}

function resetStyle() {
  settingStore.resetStyle();
}
</script>
