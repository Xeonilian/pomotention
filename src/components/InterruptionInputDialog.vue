<template>
  <n-modal v-model:show="showModal" preset="dialog" title="记录打扰">
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
      <n-checkbox v-model:checked="asActivity">
        同时创建为活动（Activity）
      </n-checkbox>
    </n-space>
    <template #action>
      <n-button @click="handleCancel">取消</n-button>
      <n-button
        type="primary"
        @click="handleConfirm"
        :disabled="!description.trim()"
      >
        确认
      </n-button>
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
  NCheckbox,
} from "naive-ui";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (
    e: "confirm",
    value: {
      classType: "E" | "I";
      description: string;
      asActivity: boolean;
    }
  ): void;
}>();

const interruptionType = ref<"E" | "I">("I"); // 默认内部打扰
const description = ref("");
const asActivity = ref(false);

const showModal = computed({
  get: () => props.show,
  set: (v: boolean) => emit("update:show", v),
});

function handleConfirm() {
  emit("confirm", {
    classType: interruptionType.value,
    description: description.value.trim(),
    asActivity: asActivity.value,
  });
  emit("update:show", false);
  // 可选：重置
  interruptionType.value = "I";
  description.value = "";
  asActivity.value = false;
}

function handleCancel() {
  emit("update:show", false);
}
</script>
