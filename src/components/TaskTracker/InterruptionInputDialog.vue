<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="记录打扰"
    :on-after-leave="handleCancel"
  >
    <n-space vertical size="large">
      <n-radio-group v-model:value="interruptionType" name="interruptionType">
        <n-radio value="I">内部打扰</n-radio>
        <n-radio value="E">外部打扰</n-radio>
      </n-radio-group>
      <n-input
        v-model:value="description"
        placeholder="请输入打扰内容"
        maxlength="40"
        show-count
      />
      <n-space vertical>
        <n-text>转换为活动：</n-text>
        <n-radio-group v-model:value="activityType" name="activityType">
          <n-radio value="T">待办活动</n-radio>
          <n-radio value="S">预约活动</n-radio>
        </n-radio-group>
      </n-space>

      <!-- 待办事项的截止日期（可选） -->
      <n-space vertical v-if="activityType === 'T'">
        <n-text>截止日期（可选）：</n-text>
        <n-date-picker
          v-model:value="todoDueDate"
          type="date"
          clearable
          placeholder="选择截止日期"
        />
      </n-space>
    </n-space>
    <template #action>
      <n-button type="primary" @click="handleConfirm"> 确认 </n-button>
      <n-button @click="handleCancel">取消</n-button>
    </template>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  NModal,
  NSpace,
  NRadioGroup,
  NRadio,
  NInput,
  NButton,
  NText,
  NDatePicker,
} from "naive-ui";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (
    e: "confirm",
    value: {
      interruptionType: "E" | "I";
      description: string;
      asActivity: boolean;
      activityType?: "T" | "S";
      dueDate?: number | null;
    }
  ): void;
}>();

const interruptionType = ref<"E" | "I">("I"); // 默认内部打扰
const description = ref("");
const activityType = ref<"T" | "S" | null>(null); // 默认不选中
const todoDueDate = ref<number | null>(null); // 待办截止日期

// // 验证表单是否有效 允许插入没有内容的
// const isValid = computed(() => {
//   if (!description.value.trim()) return false;
//   return true;
// });

const showModal = computed({
  get: () => props.show,
  set: (v: boolean) => emit("update:show", v),
});

function handleConfirm() {
  emit("confirm", {
    interruptionType: interruptionType.value,
    description: description.value.trim(),
    asActivity: activityType.value !== null,
    activityType: activityType.value || undefined,
    dueDate: todoDueDate.value || undefined,
  });
  emit("update:show", false);
  // 重置
  interruptionType.value = "I";
  description.value = "";
  activityType.value = null;
  todoDueDate.value = null;
}

function handleCancel() {
  emit("update:show", false);
  description.value = "";
}
</script>
