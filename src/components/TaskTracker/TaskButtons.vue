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
        <n-icon><Emoji24Regular /></n-icon>
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

    <!-- 模板管理按钮 -->
    <n-button
      type="default"
      size="small"
      circle
      strong
      secondary
      :disabled="!taskId"
      @click="showTemplateDialog = true"
      title="模板管理"
    >
      <template #icon>
        <n-icon><CalligraphyPen20Regular /></n-icon>
      </template>
    </n-button>

    <!-- 弹窗组件挂载 -->
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

    <!-- 模板管理弹窗 -->
    <TemplateDialog
      :show="showTemplateDialog"
      :templates="templates"
      @update:show="showTemplateDialog = $event"
      @confirm="handleTemplateConfirm"
      @delete="handleDeleteTemplate"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { NButton } from "naive-ui";
import EnergyInputDialog from "@/components/TaskTracker/EnergyInputDialog.vue";
import RewardInputDialog from "@/components/TaskTracker/RewardInputDialog.vue";
import InterruptionInputDialog from "@/components/TaskTracker/InterruptionInputDialog.vue";
import TemplateDialog from "@/components/TaskTracker/TemplateDialog.vue";
import {
  BatterySaver20Regular,
  Emoji24Regular,
  CalendarAssistant20Regular,
  CalligraphyPen20Regular,
} from "@vicons/fluent";
import { loadTemplates, saveTemplates } from "@/services/localStorageService";
import type { Template } from "@/core/types/Template";

// Props
const props = defineProps<{
  taskId: number | null;
}>();

// State Variables
const showEnergyDialog = ref(false);
const showRewardDialog = ref(false);
const showInterruptionDialog = ref(false);
const showTemplateDialog = ref(false);
const templates = ref<Template[]>(loadTemplates());

// Methods
const emit = defineEmits<{
  (e: "energy-record", value: { value: number; description?: string }): void;
  (e: "reward-record", value: { value: number; description?: string }): void;
  (
    e: "interruption-record",
    data: {
      classType: "E" | "I";
      description: string;
      asActivity: boolean;
      dueDate?: number | null;
    }
  ): void;
}>();

// 能量弹窗点击确认
function handleEnergyConfirm(val: { value: number; description?: string }) {
  if (props.taskId) {
    emit("energy-record", val);
  }
}

// 奖励弹窗点击确认
function handleRewardConfirm(val: { value: number; description?: string }) {
  if (props.taskId) {
    emit("reward-record", val);
  }
}

// 打扰弹窗点击确认
function handleInterruptionConfirm(val: {
  classType: "E" | "I";
  description: string;
  asActivity: boolean;
  dueDate?: number | null;
}) {
  if (props.taskId) {
    emit("interruption-record", val);
  }
}

// 保存模板到 localStorage
const saveTemplatesToLocal = () => {
  saveTemplates(templates.value);
};

// 更新模板的确认处理
const handleTemplateConfirm = (template: Template) => {
  if (!template.id) return; // 确保是有效的模板，实际上这行可以删除

  const index = templates.value.findIndex((t) => t.id === template.id);
  if (index !== -1) {
    // 更新现有模板
    templates.value[index] = { ...template };
  } else {
    // 新增模板处理，确保生成一个新的 ID
    const newTemplate: Template = {
      id: Date.now(), // 生成新的 ID
      title: template.title,
      content: template.content,
    };

    templates.value.push(newTemplate);
  }

  saveTemplatesToLocal(); // 更新存储
};

// 删除模板
const handleDeleteTemplate = (templateId: number) => {
  templates.value = templates.value.filter((t) => t.id !== templateId);
  saveTemplatesToLocal(); // 更新本地存储
};
</script>

<style scoped>
.task-buttons {
  display: flex;
  gap: 8px;
  justify-content: right;
}
</style>
