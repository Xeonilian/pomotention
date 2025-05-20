<!-- 
  Component: Activities.vue 
  Description: 
  用于展示活动列表，包括任务和预约。支持编辑活动信息，并根据活动的截止日期或预约时间显示不同颜色背景。

  Props:
  - displaySheet: 活动数组，包含任务和预约的详细信息。
  - getCountdownClass: 函数，根据日期返回颜色类名。

  Emits:
  - focus-row: 当用户聚焦某行时，发射事件并传入行的 ID。

  Parent: ActivityView.vue

  Usage:
  <Activities :displaySheet="activitySheet" :getCountdownClass="getCountdownClass" @focus-row="handleFocusRow" />
-->
<template>
  <div v-for="item in sortedDisplaySheet" :key="item.id">
    <div v-if="item.status !== 'done'" class="activity-row">
      <n-input
        v-model:value="item.title"
        type="text"
        placeholder="任务描述"
        style="flex: 2"
        @focus="$emit('focus-row', item.id)"
      >
        <template #prefix>
          <n-icon v-if="item.interruption === 'I'" color="#fa5c7c"
            ><VideoPersonSparkle24Regular
          /></n-icon>
          <n-icon v-else-if="item.interruption === 'E'" color="#138"
            ><VideoPersonCall24Regular
          /></n-icon>
          <n-icon
            v-else-if="item.class === 'T'"
            :color="
              item.status === 'ongoing'
                ? 'red'
                : item.status === 'delayed'
                ? 'orange'
                : item.status === 'suspended'
                ? 'blue'
                : item.status === 'cancelled'
                ? 'gray'
                : 'black'
            "
            ><ApprovalsApp24Regular
          /></n-icon>
          <n-icon
            v-else-if="item.class === 'S'"
            :color="
              item.status === 'ongoing'
                ? 'red'
                : item.status === 'delayed'
                ? 'orange'
                : item.status === 'suspended'
                ? 'blue'
                : item.status === 'cancelled'
                ? 'purple'
                : 'black'
            "
            ><Accessibility28Filled
          /></n-icon>
        </template>
      </n-input>
      <n-input
        v-if="item.class === 'S'"
        v-model:value="item.location"
        style="max-width: 90px"
        @focus="$emit('focus-row', item.id)"
        placeholder="地点"
      />
      <n-input
        v-if="item.class === 'T'"
        :value="getInputValue(item)"
        :placeholder="item.pomoType"
        style="max-width: 32px"
        :title="`输入估计${item.pomoType || '🍅'}数量`"
        :class="{
          'pomo-red': item.pomoType === '🍅',
          'pomo-purple': item.pomoType === '🍇',
          'pomo-green': item.pomoType === '🍒',
          'input-center': true, // 新增
          'input-clear-disabled': item.pomoType === '🍒', // 新增
        }"
        :disabled="item.pomoType === '🍒'"
        @update:value="(val) => onInputUpdate(item, val)"
        @focus="$emit('focus-row', item.id)"
      />
      <n-input
        v-else
        :value="item.dueRange ? item.dueRange[1] : ''"
        @update:value="
          (val) =>
            item.dueRange
              ? (item.dueRange[1] = val)
              : (item.dueRange = [Date.now(), val])
        "
        style="max-width: 32px; font-size: 10px; margin: 0 auto"
        @focus="$emit('focus-row', item.id)"
        title="持续时间(分钟)"
        placeholder="min"
        class="input-center"
      />

      <n-date-picker
        v-if="item.class === 'T'"
        v-model:value="item.dueDate"
        type="date"
        style="max-width: 70px"
        clearable
        format="MM-dd"
        @focus="$emit('focus-row', item.id)"
        title="死线日期"
        :class="getCountdownClass(item.dueDate)"
      />
      <n-date-picker
        v-else
        :value="item.dueRange ? item.dueRange[0] : 0"
        @update:value="
          (val) =>
            item.dueRange
              ? (item.dueRange[0] = val)
              : (item.dueRange = [Date.now(), ''])
        "
        type="datetime"
        style="max-width: 70px"
        clearable
        format="HH:mm"
        @focus="$emit('focus-row', item.id)"
        title="约定时间"
        :class="getCountdownClass(item.dueRange && item.dueRange[0])"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { NInput, NDatePicker, NIcon } from "naive-ui";
import {
  VideoPersonSparkle24Regular,
  VideoPersonCall24Regular,
  AlertUrgent24Regular,
  ApprovalsApp24Regular,
  Accessibility28Filled,
} from "@vicons/fluent";
import type { Activity } from "@/core/types/Activity";

// 接收发射数据
const props = defineProps<{
  displaySheet: Activity[];
  getCountdownClass: (dueDate: number | undefined | null) => string;
}>();

defineEmits(["focus-row"]);

// 排序：T类型优先，其次S类型，其他类照旧
const sortedDisplaySheet = computed(() =>
  props.displaySheet.slice().sort((a, b) => {
    if (a.class === "T" && b.class !== "T") return -1;
    if (a.class !== "T" && b.class === "T") return 1;
    return 0;
  })
);

// 获取输入显示字符串
function getInputValue(item: Activity): string {
  if (item.pomoType === "🍒") return "4";
  return typeof item.estPomoI === "string" ? item.estPomoI : "";
}

// 响应用户输入
function onInputUpdate(item: Activity, value: string) {
  if (item.pomoType === "🍒") {
    item.estPomoI = "4";
    return;
  }
  item.estPomoI = value;
}
</script>

<style scoped>
.activity-row {
  display: flex;
  align-items: center;
  padding: 1px 0;
  gap: 0px;
  width: 100%;
}

:deep(.n-input .n-input-wrapper) {
  padding-left: 6px;
  padding-right: 6px;
}
.delayed {
  background: #44f8daa0;
}
.countdown-yellow :deep(.n-input) {
  background: #f8d444a0;
}
.countdown-orange :deep(.n-input) {
  background: #ffa940a3;
}
.countdown-deeporange :deep(.n-input) {
  background: #ff40efb9;
}
.countdown-red :deep(.n-input) {
  background: #f34d50b6;
}
.countdown-blue :deep(.n-input) {
  background: #777777ab;
}
.pomo-red {
  background-color: rgba(255, 99, 71, 0.15) !important;
  border-color: rgba(255, 99, 71, 0.3) !important;
}
.pomo-purple {
  background-color: rgba(128, 0, 128, 0.15) !important;
  border-color: rgba(128, 0, 128, 0.3) !important;
}
.pomo-green {
  background-color: rgba(0, 128, 0, 0.15) !important;
  border-color: rgba(0, 128, 0, 0.3) !important;
}
/* 文本居中 */
.input-center :deep(.n-input__input) {
  text-align: center;
  color: #510909 !important;
  opacity: 1 !important;
}

/* 禁用也要高对比度且和普通同色 */
.input-clear-disabled :deep(.n-input__input-el[disabled]) {
  color: #510909 !important;
  opacity: 1 !important;
  -webkit-text-fill-color: #222 !important;
}
</style>
