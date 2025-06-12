<template>
  <n-modal
    v-model:show="showModal"
    preset="dialog"
    title="记录精力值"
    :on-after-leave="handleCancel"
  >
    <n-space vertical>
      <n-slider
        v-model:value="energyValue"
        :min="1"
        :max="10"
        :step="1"
        :marks="marks"
      />
      <n-space justify="space-between">
        <n-text>当前精力值: {{ energyValue }}</n-text>
        <n-button @click="showHelp = true">
          <template #icon>
            <n-icon><BatterySaver20Regular /></n-icon>
          </template>
        </n-button>
      </n-space>
      <n-input
        v-model:value="description"
        placeholder="请输入内容"
        maxlength="40"
        show-count
      />
    </n-space>

    <template #action>
      <n-button @click="handleCancel">取消</n-button>

      <n-button type="primary" @click="handleConfirm">确认</n-button>
    </template>
  </n-modal>

  <n-modal v-model:show="showHelp" preset="dialog" title="精力值说明">
    <n-space vertical>
      <n-text>1-2: 极度疲惫，几乎无法集中注意力</n-text>
      <n-text>3-4: 疲惫，注意力难以集中</n-text>
      <n-text>5-6: 一般状态，可以正常工作</n-text>
      <n-text>7-8: 精力充沛，注意力集中</n-text>
      <n-text>9-10: 最佳状态，高度专注</n-text>
    </n-space>
  </n-modal>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { BatterySaver20Regular } from "@vicons/fluent";
import { NModal, NSlider, NSpace, NText, NButton, NIcon } from "naive-ui";

const props = defineProps<{
  show: boolean;
}>();

const emit = defineEmits<{
  (e: "update:show", value: boolean): void;
  (e: "confirm", value: { value: number; description?: string }): void;
}>();

const energyValue = ref(5);
const showHelp = ref(false);
const description = ref("");

// 修复 v-model 问题
const showModal = computed({
  get: () => props.show,
  set: (value: boolean) => emit("update:show", value),
});

const marks = {
  1: "1",
  5: "5",
  10: "10",
};

const handleConfirm = () => {
  emit("confirm", {
    value: energyValue.value,
    description: description.value.trim(),
  });
  description.value = "";
  emit("update:show", false);
};

const handleCancel = () => {
  description.value = "";
  emit("update:show", false);
};
</script>
