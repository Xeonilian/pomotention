<template>
  <div class="task-buttons">
    <n-button
      size="small"
      type="info"
      secondary
      circle
      strong
      @click="showEnergyDialog = true"
      :disabled="!taskId"
      title="能量记录"
    >
      <template #icon>
        <n-icon><BatterySaver20Regular /></n-icon>
      </template>
    </n-button>
    <n-button
      size="small"
      type="info"
      secondary
      circle
      strong
      @click="showRewardDialog = true"
      :disabled="!taskId"
      title="奖赏记录"
    >
      <template #icon>
        <n-icon><Beach24Regular /></n-icon>
      </template>
    </n-button>
    <n-button
      size="small"
      type="default"
      circle
      strong
      secondary
      @click="showInterruptionDialog = true"
      :disabled="!taskId"
      title="打扰记录"
    >
      <template #icon>
        <n-icon><CalendarAssistant20Regular /></n-icon>
      </template>
    </n-button>
    <!-- 弹窗组件挂载进来 -->
    <EnergyInputDialog
      v-model:show="showEnergyDialog"
      @confirm="handleEnergyConfirm"
    />
    <RewardInputDialog
      v-model:show="showRewardDialog"
      @confirm="handleRewardConfirm"
    />
    <InterruptionInputDialog
      v-model:show="showInterruptionDialog"
      @confirm="handleInterruptionConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { NButton } from "naive-ui";
import EnergyInputDialog from "@/components/EnergyInputDialog.vue";
import RewardInputDialog from "@/components/RewardInputDialog.vue";
import InterruptionInputDialog from "@/components/InterruptionInputDialog.vue";
import {
  BatterySaver20Regular,
  Beach24Regular,
  CalendarAssistant20Regular,
} from "@vicons/fluent";

const props = defineProps<{
  taskId: number | null;
  showPomoSeq: boolean;
  showPomodoroView: boolean;
  isMarkdown: boolean;
}>();

const showEnergyDialog = ref(false);
const showRewardDialog = ref(false);
const showInterruptionDialog = ref(false);

const emit = defineEmits<{
  (e: "energy-record", value: number): void;
  (e: "reward-record", value: number): void;
  (e: "toggle-markdown"): void;
  (
    e: "interruption-record",
    data: {
      classType: "E" | "I";
      description: string;
      asActivity: boolean;
    }
  ): void;
}>();

// 能量弹窗点击确认
function handleEnergyConfirm(val: number) {
  if (props.taskId) {
    emit("energy-record", val);
  }
}

// 奖励弹窗点击确认
function handleRewardConfirm(val: number) {
  if (props.taskId) {
    emit("reward-record", val);
  }
}

// 打扰弹窗点击确认
function handleInterruptionConfirm(val: {
  classType: "E" | "I";
  description: string;
  asActivity: boolean;
}) {
  if (props.taskId) {
    emit("interruption-record", val);
  }
}
</script>

<style scoped>
.task-buttons {
  display: flex;
  gap: 8px;
  justify-content: right;
  padding: 8px;
  margin-left: 10px;
}
</style>
