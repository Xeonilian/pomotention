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
  <div v-for="item in displaySheet" :key="item.id">
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
          <n-icon v-else-if="item.class === 'T'" color="blue"
            ><ApprovalsApp24Regular
          /></n-icon>
          <n-icon v-else-if="item.class === 'S'" color="red"
            ><AlertUrgent24Regular
          /></n-icon>
        </template>
      </n-input>
      <n-input
        v-if="item.class === 'T'"
        v-model:value="item.estPomoI"
        placeholder="🍅"
        style="max-width: 45px"
        @focus="$emit('focus-row', item.id)"
      />
      <n-date-picker
        v-if="item.class === 'T'"
        v-model:value="item.dueDate"
        type="date"
        style="max-width: 125px"
        clearable
        format="MM-dd"
        @focus="$emit('focus-row', item.id)"
        title="死线日期"
        :class="getCountdownClass(item.dueDate)"
      />
      <n-date-picker
        v-else
        v-model:value="item.dueRange"
        type="datetimerange"
        style="max-width: 170px"
        clearable
        format="HH:mm"
        @focus="$emit('focus-row', item.id)"
        title="约定时间"
        :class="getCountdownClass(item.dueRange && item.dueRange[1])"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { NInput, NDatePicker, NIcon } from "naive-ui";
import {
  VideoPersonSparkle24Regular,
  VideoPersonCall24Regular,
  AlertUrgent24Regular,
  ApprovalsApp24Regular,
} from "@vicons/fluent";
import type { Activity } from "@/core/types/Activity";

// 接收发射数据
defineProps<{
  displaySheet: Activity[];
  getCountdownClass: (dueDate: number | undefined | null) => string;
}>();

defineEmits(["focus-row"]);
</script>

<style scoped>
.activity-row {
  display: flex;
  align-items: center;
  padding: 1px 0;
  gap: 0px;
  width: 100%;
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
  background: #121cda80;
}
</style>
